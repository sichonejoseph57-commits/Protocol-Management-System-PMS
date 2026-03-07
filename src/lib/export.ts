import { Employee, TimeEntry, PayrollSummary } from '@/types';
import { formatCurrency } from '@/lib/payroll';

/**
 * Export Utilities for CSV Generation
 * Provides functions to export employees, time entries, and payroll reports
 */

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportEmployees = (
  employees: Employee[],
  filters?: {
    department?: string;
    position?: string;
    status?: string;
    searchTerm?: string;
  }
) => {
  let filteredEmployees = [...employees];

  // Apply filters
  if (filters?.department && filters.department !== 'all') {
    filteredEmployees = filteredEmployees.filter(e => e.department === filters.department);
  }
  if (filters?.position && filters.position !== 'all') {
    filteredEmployees = filteredEmployees.filter(e => e.position === filters.position);
  }
  if (filters?.status && filters.status !== 'all') {
    filteredEmployees = filteredEmployees.filter(e => e.status === filters.status);
  }
  if (filters?.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filteredEmployees = filteredEmployees.filter(e =>
      e.name.toLowerCase().includes(term) ||
      e.email?.toLowerCase().includes(term) ||
      e.phone.includes(term)
    );
  }

  // Format for CSV
  const csvData = filteredEmployees.map(emp => ({
    'Employee ID': emp.id,
    'Name': emp.name,
    'Email': emp.email || 'N/A',
    'Phone': emp.phone,
    'Department': emp.department,
    'Position': emp.position,
    'Hourly Wage': emp.hourlyWage.toFixed(2),
    'Status': emp.status,
    'Status Note': emp.statusNote || '',
    'Hire Date': emp.hireDate,
    'Created By': emp.createdBy,
    'Created At': new Date(emp.createdAt).toLocaleString(),
  }));

  exportToCSV(csvData, 'employees');
};

export const exportTimeEntries = (
  timeEntries: TimeEntry[],
  filters?: {
    employeeName?: string;
    department?: string;
    startDate?: string;
    endDate?: string;
  }
) => {
  let filteredEntries = [...timeEntries];

  // Apply filters
  if (filters?.employeeName) {
    const term = filters.employeeName.toLowerCase();
    filteredEntries = filteredEntries.filter(e =>
      e.employeeName.toLowerCase().includes(term)
    );
  }
  if (filters?.startDate) {
    filteredEntries = filteredEntries.filter(e => e.date >= filters.startDate!);
  }
  if (filters?.endDate) {
    filteredEntries = filteredEntries.filter(e => e.date <= filters.endDate!);
  }

  // Format for CSV
  const csvData = filteredEntries.map(entry => ({
    'Date': entry.date,
    'Employee Name': entry.employeeName,
    'Clock In': entry.clockIn,
    'Clock Out': entry.clockOut,
    'Break Minutes': entry.breakMinutes,
    'Total Hours': entry.totalHours.toFixed(2),
    'Is Holiday': entry.isHoliday ? 'Yes' : 'No',
    'Overtime Rate': entry.overtimeRate.toFixed(2),
    'Regular Pay': formatCurrency(entry.regularPay),
    'Overtime Pay': formatCurrency(entry.overtimePay),
    'Total Pay': formatCurrency(entry.totalPay),
    'Status': entry.status,
    'Notes': entry.notes || '',
    'Entered By': entry.enteredBy,
    'Entered At': new Date(entry.enteredAt).toLocaleString(),
  }));

  exportToCSV(csvData, 'time_entries');
};

export const exportPayrollReport = (
  payrollData: PayrollSummary[],
  filters?: {
    department?: string;
    position?: string;
    searchTerm?: string;
  }
) => {
  let filteredData = [...payrollData];

  // Apply filters
  if (filters?.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filteredData = filteredData.filter(p =>
      p.employeeName.toLowerCase().includes(term)
    );
  }

  // Format for CSV
  const csvData = filteredData.map(payroll => ({
    'Employee Name': payroll.employeeName,
    'Month': payroll.month,
    'Days Worked': payroll.daysWorked,
    'Total Hours': payroll.totalHours.toFixed(2),
    'Regular Hours': payroll.regularHours.toFixed(2),
    'Holiday Hours': payroll.holidayHours.toFixed(2),
    'Regular Pay': formatCurrency(payroll.regularPay),
    'Holiday Pay': formatCurrency(payroll.holidayPay),
    'Total Pay': formatCurrency(payroll.totalPay),
  }));

  exportToCSV(csvData, 'payroll_report');
};
