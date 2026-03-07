import { useState } from 'react';
import { Employee, TimeEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Clock, Download } from 'lucide-react';
import { calculateMonthlyPayroll, formatCurrency } from '@/lib/payroll';
import { getMonthYearOptions, formatMonthYear } from '@/lib/utils';
import { exportPayrollReport } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';

interface PayrollReportProps {
  employees: Employee[];
  timeEntries: TimeEntry[];
}

export default function PayrollReport({ employees, timeEntries }: PayrollReportProps) {
  const [selectedMonth, setSelectedMonth] = useState(getMonthYearOptions()[0]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const { toast } = useToast();

  const monthOptions = getMonthYearOptions();
  
  const employeesToShow = selectedEmployee === 'all' 
    ? employees 
    : employees.filter(e => e.id === selectedEmployee);

  const payrollData = employeesToShow.map(employee =>
    calculateMonthlyPayroll(employee.id, employee.name, selectedMonth, timeEntries)
  ).filter(data => data.daysWorked > 0);

  const totals = payrollData.reduce(
    (acc, data) => ({
      totalHours: acc.totalHours + data.totalHours,
      regularPay: acc.regularPay + data.regularPay,
      holidayPay: acc.holidayPay + data.holidayPay,
      totalPay: acc.totalPay + data.totalPay,
    }),
    { totalHours: 0, regularPay: 0, holidayPay: 0, totalPay: 0 }
  );

  const handleExport = () => {
    try {
      exportPayrollReport(payrollData);
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
          <Button onClick={handleExport} variant="outline" className="w-full gap-2">
            <Download className="w-4 h-4" />
            Export to CSV
          </Button>
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
