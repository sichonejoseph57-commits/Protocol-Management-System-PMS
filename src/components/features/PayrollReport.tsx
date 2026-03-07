import { useState, useEffect } from 'react';
import { Employee, TimeEntry, Deduction, EmployeeDeduction } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Clock, Download, Printer, Mail } from 'lucide-react';
import { calculateMonthlyPayroll, formatCurrency } from '@/lib/payroll';
import { getMonthYearOptions, formatMonthYear } from '@/lib/utils';
import { exportPayrollReport, sendBulkPayslipEmails } from '@/lib/export';
import { getDeductions, getEmployeeDeductions, calculateDeductions } from '@/lib/deductions';
import { printPayslip } from '@/lib/payslip';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface PayrollReportProps {
  employees: Employee[];
  timeEntries: TimeEntry[];
  organization?: any;
}

export default function PayrollReport({ employees, timeEntries, organization }: PayrollReportProps) {
  const [selectedMonth, setSelectedMonth] = useState(getMonthYearOptions()[0]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [employeeDeductions, setEmployeeDeductions] = useState<Record<string, EmployeeDeduction[]>>({});
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDeductions();
  }, []);

  const loadDeductions = async () => {
    try {
      const allDeductions = await getDeductions();
      setDeductions(allDeductions);
      
      // Load employee deductions for all employees
      const deductionsMap: Record<string, EmployeeDeduction[]> = {};
      for (const emp of employees) {
        const empDeds = await getEmployeeDeductions(emp.id);
        deductionsMap[emp.id] = empDeds;
      }
      setEmployeeDeductions(deductionsMap);
    } catch (error) {
      console.error('Failed to load deductions:', error);
    }
  };

  const monthOptions = getMonthYearOptions();
  
  const employeesToShow = selectedEmployee === 'all' 
    ? employees 
    : employees.filter(e => e.id === selectedEmployee);

  const payrollData = employeesToShow.map(employee => {
    const basePayroll = calculateMonthlyPayroll(employee.id, employee.name, selectedMonth, timeEntries);
    
    // Calculate deductions
    const empDeds = employeeDeductions[employee.id] || [];
    const { totalDeductions, deductionBreakdown } = calculateDeductions(
      basePayroll.totalPay,
      deductions,
      empDeds
    );
    
    return {
      ...basePayroll,
      totalDeductions,
      deductionBreakdown,
      netPay: basePayroll.totalPay - totalDeductions,
    };
  }).filter(data => data.daysWorked > 0);

  const totals = payrollData.reduce(
    (acc, data) => ({
      totalHours: acc.totalHours + data.totalHours,
      regularPay: acc.regularPay + data.regularPay,
      holidayPay: acc.holidayPay + data.holidayPay,
      totalPay: acc.totalPay + data.totalPay,
      totalDeductions: acc.totalDeductions + (data.totalDeductions || 0),
      netPay: acc.netPay + (data.netPay || data.totalPay),
    }),
    { totalHours: 0, regularPay: 0, holidayPay: 0, totalPay: 0, totalDeductions: 0, netPay: 0 }
  );

  const handleExport = () => {
    try {
      exportPayrollReport(payrollData, organization?.companyName);
      toast({
        title: 'Success',
        description: `Exported payroll report for ${formatMonthYear(selectedMonth)}`,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePrintPayslip = (data: any) => {
    const employee = employees.find(e => e.id === data.employeeId);
    if (!employee) return;
    
    printPayslip({
      employee,
      payrollData: data,
      organization: organization || { companyName: 'Protocol Management System', logoUrl: null },
      month: selectedMonth,
    });
  };

  const handleBulkEmail = async () => {
    if (!organization) {
      toast({
        title: 'Error',
        description: 'Organization information not available',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSendingEmails(true);
    try {
      const { success, failed, errors } = await sendBulkPayslipEmails(
        payrollData,
        employees,
        organization,
        supabase
      );
      
      if (success > 0) {
        toast({
          title: 'Emails Sent',
          description: `Successfully sent ${success} payslip(s). ${failed > 0 ? `Failed: ${failed}` : ''}`,
        });
      }
      
      if (failed > 0 && errors.length > 0) {
        console.error('Email errors:', errors);
        toast({
          title: 'Some emails failed',
          description: errors.slice(0, 3).join(', '),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Bulk email failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmails(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Select Month</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatMonthYear(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Select Employee</Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button 
              onClick={handleBulkEmail} 
              variant="outline" 
              className="flex-1 gap-2"
              disabled={isSendingEmails || payrollData.length === 0}
            >
              <Mail className="w-4 h-4" />
              {isSendingEmails ? 'Sending...' : 'Email All'}
            </Button>
          </div>
        </div>
      </div>

      {payrollData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Hours</p>
                <p className="text-2xl font-bold text-blue-900">
                  {totals.totalHours.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-700 font-medium">Regular Pay</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(totals.regularPay)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-sm text-amber-700 font-medium">Holiday Pay (2x)</p>
                <p className="text-2xl font-bold text-amber-900">
                  {formatCurrency(totals.holidayPay)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Days Worked
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Regular Hours
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Holiday Hours
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Regular Pay
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Holiday Pay
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Total Pay
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Deductions
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Net Pay
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payrollData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No payroll data for {formatMonthYear(selectedMonth)}
                  </td>
                </tr>
              ) : (
                <>
                  {payrollData.map((data) => (
                    <tr key={data.employeeId} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-medium text-gray-900">
                        {data.employeeName}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-900">
                        {data.daysWorked}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium text-gray-900">
                        {data.totalHours.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-900">
                        {data.regularHours.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-900">
                        {data.holidayHours > 0 ? (
                          <Badge className="bg-amber-100 text-amber-800">
                            {data.holidayHours.toFixed(2)}
                          </Badge>
                        ) : (
                          '0.00'
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(data.regularPay)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-amber-700 font-medium">
                        {data.holidayPay > 0 ? formatCurrency(data.holidayPay) : '-'}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-primary">
                        {formatCurrency(data.totalPay)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-red-600 font-medium">
                        {data.totalDeductions > 0 ? `-${formatCurrency(data.totalDeductions)}` : '-'}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-green-600">
                        {formatCurrency(data.netPay || data.totalPay)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => handlePrintPayslip(data)}
                        >
                          <Printer className="w-3 h-3" />
                          Print
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-4 text-gray-900">TOTAL</td>
                    <td className="px-4 py-4"></td>
                    <td className="px-4 py-4 text-right text-gray-900">
                      {totals.totalHours.toFixed(2)}
                    </td>
                    <td className="px-4 py-4"></td>
                    <td className="px-4 py-4"></td>
                    <td className="px-4 py-4 text-right text-gray-900">
                      {formatCurrency(totals.regularPay)}
                    </td>
                    <td className="px-4 py-4 text-right text-amber-700">
                      {formatCurrency(totals.holidayPay)}
                    </td>
                    <td className="px-4 py-4 text-right text-primary text-lg">
                      {formatCurrency(totals.totalPay)}
                    </td>
                    <td className="px-4 py-4 text-right text-red-600 text-lg font-semibold">
                      -{formatCurrency(totals.totalDeductions)}
                    </td>
                    <td className="px-4 py-4 text-right text-green-600 text-lg font-bold">
                      {formatCurrency(totals.netPay)}
                    </td>
                    <td className="px-4 py-4"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
