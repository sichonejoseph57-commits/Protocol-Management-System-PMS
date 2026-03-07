import { TimeEntry, PayrollSummary } from '@/types';
import { isZambianHoliday } from '@/constants/holidays';

export const calculateHoursWorked = (clockIn: string, clockOut: string, breakMinutes: number = 0): number => {
  const start = new Date(`2000-01-01 ${clockIn}`);
  const end = new Date(`2000-01-01 ${clockOut}`);
  const diff = end.getTime() - start.getTime();
  const totalMinutes = diff / (1000 * 60);
  const workMinutes = Math.max(0, totalMinutes - breakMinutes);
  return workMinutes / 60; // Convert to hours
};

export const calculateTimeEntryPay = (
  date: string,
  clockIn: string,
  clockOut: string,
  hourlyWage: number,
  breakMinutes: number = 0,
  overtimeThreshold: number = 8,
  overtimeRateMultiplier: number = 1.5,
  holidayRateMultiplier: number = 2.0
): {
  totalHours: number;
  isHoliday: boolean;
  overtimeRate: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  regularHours: number;
  overtimeHours: number;
} => {
  const totalHours = calculateHoursWorked(clockIn, clockOut, breakMinutes);
  const holiday = isZambianHoliday(date);
  const isHoliday = !!holiday;
  
  let regularPay = 0;
  let overtimePay = 0;
  let regularHours = 0;
  let overtimeHours = 0;
  let overtimeRate = 1.0;
  
  if (isHoliday) {
    // All hours on holiday are paid at holiday rate
    overtimeRate = holidayRateMultiplier;
    overtimeHours = totalHours;
    overtimePay = totalHours * hourlyWage * holidayRateMultiplier;
  } else {
    // Calculate regular and overtime hours
    if (totalHours > overtimeThreshold) {
      regularHours = overtimeThreshold;
      overtimeHours = totalHours - overtimeThreshold;
      overtimeRate = overtimeRateMultiplier;
      regularPay = regularHours * hourlyWage;
      overtimePay = overtimeHours * hourlyWage * overtimeRateMultiplier;
    } else {
      regularHours = totalHours;
      regularPay = totalHours * hourlyWage;
    }
  }
  
  const totalPay = regularPay + overtimePay;
  
  return {
    totalHours,
    isHoliday,
    overtimeRate,
    regularPay,
    overtimePay,
    totalPay,
    regularHours,
    overtimeHours,
  };
};

export const calculateMonthlyPayroll = (
  employeeId: string,
  employeeName: string,
  month: string, // Format: YYYY-MM
  timeEntries: TimeEntry[]
): PayrollSummary => {
  const monthEntries = timeEntries.filter(
    e => e.employeeId === employeeId && e.date.startsWith(month)
  );
  
  let totalHours = 0;
  let regularHours = 0;
  let holidayHours = 0;
  let regularPay = 0;
  let holidayPay = 0;
  
  monthEntries.forEach(entry => {
    totalHours += entry.totalHours;
    
    if (entry.isHoliday) {
      holidayHours += entry.totalHours;
      holidayPay += entry.overtimePay;
    } else {
      regularHours += entry.totalHours;
      regularPay += entry.regularPay;
    }
  });
  
  return {
    employeeId,
    employeeName,
    month,
    totalHours,
    regularHours,
    holidayHours,
    regularPay,
    holidayPay,
    totalPay: regularPay + holidayPay,
    daysWorked: monthEntries.length,
  };
};

export const formatCurrency = (amount: number): string => {
  return `ZMW ${amount.toFixed(2)}`;
};
