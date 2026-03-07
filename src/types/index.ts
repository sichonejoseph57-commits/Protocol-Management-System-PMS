export interface Employee {
  id: string;
  organizationId: string;
  employeeNumber?: string; // Unique employee ID/code
  name: string;
  email?: string; // Optional email
  phone: string;
  department: string;
  position: string;
  hourlyWage: number;
  status: 'active' | 'resigned' | 'sick-leave' | 'absent';
  statusNote?: string;
  hireDate: string;
  photoUrl?: string; // Employee photo
  createdBy: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  breakMinutes: number; // Break time in minutes
  totalHours: number; // Excludes break time
  isHoliday: boolean;
  overtimeRate: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  status: string;
  enteredBy: string;
  enteredAt: string;
  notes?: string;
}

export interface UserProfile {
  id: string;
  organizationId: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'pending';
  is_active: boolean;
  created_at: string;
}

export interface AdminPermission {
  id: string;
  user_id: string;
  granted_by: string | null;
  granted_at: string;
}

export interface ZambianHoliday {
  date: string;
  name: string;
  type: 'public' | 'observance';
}

export interface PayrollSummary {
  employeeId: string;
  employeeName: string;
  month: string;
  totalHours: number;
  regularHours: number;
  holidayHours: number;
  regularPay: number;
  holidayPay: number;
  totalPay: number;
  daysWorked: number;
}

export interface Organization {
  id: string;
  companyName: string;
  subdomain: string | null;
  logoUrl: string | null;
  contactEmail: string;
  contactPhone: string | null;
  registrationIp: string | null;
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscriptionPlan: string;
  pricePerEmployee: number;
  maxEmployees: number | null;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planName: string;
  billingCycle: 'monthly' | 'quarterly' | 'annually';
  employeeCount: number;
  amount: number;
  currency: string;
  status: 'active' | 'past_due' | 'cancelled' | 'paused';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  organizationId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  paymentMethod: 'airtel_money' | 'mtn_money' | 'visa' | 'mastercard';
  transactionId: string | null;
  phoneNumber: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  metadata: any;
  paidAt: string | null;
  createdAt: string;
}
