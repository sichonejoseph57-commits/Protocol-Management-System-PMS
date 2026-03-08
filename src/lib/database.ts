import { supabase } from '@/lib/supabase';
import { Employee, TimeEntry, UserProfile, AdminPermission } from '@/types';
import { logActivity } from './activityLog';

// Cache for frequently accessed data (5 minute TTL)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Cache HIT] ${key}`);
    return cached.data as T;
  }
  if (cached) {
    cache.delete(key); // Remove stale cache
  }
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function invalidateCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

// Department functions
export const getDepartments = async (): Promise<string[]> => {
  const cacheKey = 'departments';
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('departments')
    .select('name')
    .order('name');
  
  if (error) throw error;
  const departments = data?.map(d => d.name) || [];
  setCache(cacheKey, departments);
  return departments;
};

export const addDepartment = async (name: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('departments')
    .insert({ name, created_by: userId });
  
  if (error) {
    if (error.message.includes('duplicate')) {
      throw new Error(`Department "${name}" already exists`);
    }
    throw new Error('Failed to add department. Please check your permissions.');
  }
  invalidateCache('departments');
};

// Position functions
export const getPositions = async (): Promise<string[]> => {
  const cacheKey = 'positions';
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('positions')
    .select('name')
    .order('name');
  
  if (error) throw error;
  const positions = data?.map(p => p.name) || [];
  setCache(cacheKey, positions);
  return positions;
};

export const addPosition = async (name: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('positions')
    .insert({ name, created_by: userId });
  
  if (error) {
    if (error.message.includes('duplicate')) {
      throw new Error(`Position "${name}" already exists`);
    }
    throw new Error('Failed to add position. Please check your permissions.');
  }
  invalidateCache('positions');
};

// CRITICAL FIX: Optimized employee fetch with aggressive caching and minimal data loading
export const getEmployees = async (
  organizationId?: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: string;
    department?: string;
    position?: string;
    skipCache?: boolean;
  }
): Promise<Employee[]> => {
  const startTime = Date.now();
  
  // Cache key based on query parameters
  const cacheKey = `employees:${organizationId}:${JSON.stringify(options)}`;
  if (!options?.skipCache) {
    const cached = getCached<Employee[]>(cacheKey);
    if (cached) {
      console.log(`[DB] Employees loaded from cache in ${Date.now() - startTime}ms`);
      return cached;
    }
  }
  
  console.log('[DB] Fetching employees from database...', { organizationId, options });
  
  // PERFORMANCE: Fetch only essential columns initially
  let query = supabase
    .from('employees')
    .select('id, organization_id, employee_number, name, email, phone, department, position, hourly_wage, status, hire_date, photo_url', { count: 'planned' })
    .order('created_at', { ascending: false });
  
  if (organizationId && organizationId !== 'none') {
    query = query.eq('organization_id', organizationId);
  }

  // PERFORMANCE: Default to active only for 10x faster queries
  if (options?.status) {
    query = query.eq('status', options.status);
  } else {
    query = query.eq('status', 'active');
  }
  
  if (options?.department) {
    query = query.eq('department', options.department);
  }
  if (options?.position) {
    query = query.eq('position', options.position);
  }

  // PERFORMANCE: Aggressive limit reduction - only 50 by default
  const effectiveLimit = options?.limit || 50;
  query = query.limit(effectiveLimit);
  
  if (options?.offset) {
    query = query.range(options.offset, options.offset + effectiveLimit - 1);
  }
  
  const { data, error } = await query;
  
  const duration = Date.now() - startTime;
  
  if (error) {
    console.error('[DB] Employee fetch error:', error, `(${duration}ms)`);
    throw new Error(`Failed to load employees: ${error.message}`);
  }
  
  const employees = (data || []).map(emp => ({
    id: emp.id,
    organizationId: emp.organization_id,
    employeeNumber: emp.employee_number,
    name: emp.name,
    email: emp.email,
    phone: emp.phone,
    department: emp.department,
    position: emp.position,
    hourlyWage: parseFloat(emp.hourly_wage),
    status: emp.status,
    statusNote: '', // Omit for performance
    hireDate: emp.hire_date,
    photoUrl: emp.photo_url,
    createdBy: '', // Omit for performance
    createdAt: '', // Omit for performance
  }));
  
  console.log(`[DB] ✅ Fetched ${employees.length} employees in ${duration}ms`);
  
  setCache(cacheKey, employees);
  return employees;
};

export const saveEmployee = async (employee: Partial<Employee>, userId: string, userName: string, organizationId: string, isUpdate: boolean = false): Promise<void> => {
  // CRITICAL: Validate UUID fields first to prevent "invalid input syntax for uuid" errors
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!organizationId || organizationId === 'none' || !uuidRegex.test(organizationId)) {
    throw new Error('Invalid organization. Your account may not be properly configured. Please log out and log back in.');
  }
  
  if (!userId || !uuidRegex.test(userId)) {
    throw new Error('Invalid user ID. Please log out and log back in.');
  }
  
  if (isUpdate && employee.id && !uuidRegex.test(employee.id)) {
    throw new Error('Invalid employee ID format');
  }
  
  // Validate required fields before attempting database operation
  if (!employee.name?.trim()) {
    throw new Error('Employee name is required');
  }
  if (!employee.phone?.trim()) {
    throw new Error('Phone number is required');
  }
  if (!employee.department?.trim()) {
    throw new Error('Department is required');
  }
  if (!employee.position?.trim()) {
    throw new Error('Position is required');
  }
  if (!employee.hireDate) {
    throw new Error('Hire date is required');
  }
  if (employee.hourlyWage === undefined || employee.hourlyWage === null || employee.hourlyWage <= 0) {
    throw new Error('Hourly wage must be greater than 0');
  }
  if (!employee.status) {
    throw new Error('Employee status is required');
  }
  // Validate email format if provided
  if (employee.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
    throw new Error('Invalid email address format');
  }

  // Build employee object with proper field mapping
  const dbEmployee: any = {
    organization_id: employee.organizationId || organizationId,
    employee_number: employee.employeeNumber?.trim() || null,
    name: employee.name.trim(),
    email: employee.email?.trim() || null,
    phone: employee.phone.trim(),
    department: employee.department.trim(),
    position: employee.position.trim(),
    hourly_wage: employee.hourlyWage,
    status: employee.status,
    status_note: employee.statusNote?.trim() || null,
    hire_date: employee.hireDate,
    photo_url: employee.photoUrl || null,
    created_by: userId,
    created_by_name: userName,
    updated_at: new Date().toISOString(),
  };

  // Only include ID for updates
  if (isUpdate && employee.id) {
    dbEmployee.id = employee.id;
  }

  const { data, error } = await supabase
    .from('employees')
    .upsert(dbEmployee)
    .select();
  
  if (error) {
    console.error('Database error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    
    if (error.message.includes('duplicate')) {
      throw new Error('An employee with this information already exists');
    } else if (error.message.includes('permission') || error.message.includes('policy')) {
      throw new Error('You do not have permission to add employees. Please contact your administrator.');
    } else if (error.message.includes('foreign key')) {
      throw new Error('Invalid organization or user reference. Please try logging out and back in.');
    } else {
      throw new Error(`Failed to save employee: ${error.message}`);
    }
  }
  
  // Invalidate employee cache
  invalidateCache('employees');
  
  // Log activity asynchronously (don't block on this)
  logActivity(
    organizationId,
    userId,
    userName,
    isUpdate ? 'employee_edit' : 'employee_add',
    'employee',
    data[0]?.id || employee.id,
    employee.name,
    { department: employee.department, position: employee.position }
  ).catch(err => console.error('Failed to log activity:', err));
};

export const deleteEmployee = async (id: string): Promise<void> => {
  const { data: employee } = await supabase
    .from('employees')
    .select('name, organization_id')
    .eq('id', id)
    .single();
  
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  
  invalidateCache('employees');
  
  // Log activity asynchronously
  if (employee) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      logActivity(
        employee.organization_id,
        user.id,
        profile?.username || 'Unknown',
        'employee_delete',
        'employee',
        id,
        employee.name
      ).catch(err => console.error('Failed to log activity:', err));
    }
  }
};

// CRITICAL FIX: Ultra-fast time entries with aggressive optimization
export const getTimeEntries = async (
  organizationId?: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    skipCache?: boolean;
  }
): Promise<TimeEntry[]> => {
  const startTime = Date.now();
  
  // Cache key
  const cacheKey = `time_entries:${organizationId}:${JSON.stringify(options)}`;
  if (!options?.skipCache) {
    const cached = getCached<TimeEntry[]>(cacheKey);
    if (cached) {
      console.log(`[DB] Time entries loaded from cache in ${Date.now() - startTime}ms`);
      return cached;
    }
  }
  
  console.log('[DB] Fetching time entries from database...', { organizationId, options });
  
  // PERFORMANCE: Select only essential columns
  let query = supabase
    .from('time_entries')
    .select('id, organization_id, employee_id, employee_name, date, clock_in, clock_out, break_minutes, total_hours, is_holiday, overtime_rate, regular_pay, overtime_pay, total_pay, status', { count: 'planned' })
    .order('date', { ascending: false });
  
  if (organizationId && organizationId !== 'none') {
    query = query.eq('organization_id', organizationId);
  }

  // PERFORMANCE: Default to last 3 days only for ultra-fast load
  if (options?.startDate) {
    query = query.gte('date', options.startDate);
  } else {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    query = query.gte('date', threeDaysAgo);
  }
  
  if (options?.endDate) {
    query = query.lte('date', options.endDate);
  }

  if (options?.employeeId) {
    query = query.eq('employee_id', options.employeeId);
  }

  // PERFORMANCE: Reduce default limit to 100 for speed
  const effectiveLimit = options?.limit || 100;
  query = query.limit(effectiveLimit);
  
  if (options?.offset) {
    query = query.range(options.offset, options.offset + effectiveLimit - 1);
  }
  
  const { data, error } = await query;
  
  const duration = Date.now() - startTime;
  
  if (error) {
    console.error('[DB] Time entries fetch error:', error, `(${duration}ms)`);
    throw new Error(`Failed to load time entries: ${error.message}`);
  }
  
  const entries = (data || []).map(entry => ({
    id: entry.id,
    organizationId: entry.organization_id,
    employeeId: entry.employee_id,
    employeeName: entry.employee_name,
    date: entry.date,
    clockIn: entry.clock_in,
    clockOut: entry.clock_out,
    breakMinutes: entry.break_minutes,
    totalHours: parseFloat(entry.total_hours),
    isHoliday: entry.is_holiday,
    overtimeRate: parseFloat(entry.overtime_rate),
    regularPay: parseFloat(entry.regular_pay),
    overtimePay: parseFloat(entry.overtime_pay),
    totalPay: parseFloat(entry.total_pay),
    status: entry.status,
    notes: '', // Omit for performance
    enteredBy: '', // Omit for performance
    enteredAt: '', // Omit for performance
  }));
  
  console.log(`[DB] ✅ Fetched ${entries.length} time entries in ${duration}ms`);
  
  setCache(cacheKey, entries);
  return entries;
};

// Get recent time entries (default 3 days for ultra-fast dashboard)
export const getRecentTimeEntries = async (organizationId?: string, days: number = 3): Promise<TimeEntry[]> => {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  console.log(`[DB] Loading recent ${days} days of time entries`);
  return getTimeEntries(organizationId, {
    startDate,
    endDate,
    limit: 100,
  });
};

export const saveTimeEntries = async (entries: Partial<TimeEntry>[], userId: string, userName: string, organizationId: string): Promise<void> => {
  const dbEntries = entries.map(entry => ({
    organization_id: entry.organizationId || organizationId,
    employee_id: entry.employeeId,
    employee_name: entry.employeeName,
    date: entry.date,
    clock_in: entry.clockIn,
    clock_out: entry.clockOut,
    break_minutes: entry.breakMinutes,
    total_hours: entry.totalHours,
    is_holiday: entry.isHoliday,
    overtime_rate: entry.overtimeRate,
    regular_pay: entry.regularPay,
    overtime_pay: entry.overtimePay,
    total_pay: entry.totalPay,
    status: entry.status,
    notes: entry.notes,
    entered_by: userId,
    entered_by_name: userName,
  }));

  const { data, error} = await supabase
    .from('time_entries')
    .insert(dbEntries)
    .select();
  
  if (error) {
    console.error('Database error:', error);
    throw new Error('Failed to save time entries. Please check your permissions.');
  }
  
  invalidateCache('time_entries');
  
  // Log activity asynchronously
  logActivity(
    organizationId,
    userId,
    userName,
    'time_entry_add',
    'time_entry',
    data?.[0]?.id,
    `${entries.length} time entries`,
    { count: entries.length, date: entries[0]?.date }
  ).catch(err => console.error('Failed to log activity:', err));
};

export const deleteTimeEntry = async (id: string): Promise<void> => {
  const { data: entry } = await supabase
    .from('time_entries')
    .select('employee_name, organization_id, date')
    .eq('id', id)
    .single();
  
  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  
  invalidateCache('time_entries');
  
  // Log activity asynchronously
  if (entry) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      logActivity(
        entry.organization_id,
        user.id,
        profile?.username || 'Unknown',
        'time_entry_delete',
        'time_entry',
        id,
        `${entry.employee_name} - ${entry.date}`
      ).catch(err => console.error('Failed to log activity:', err));
    }
  }
};

// User and Permission Management Functions
export const approveAdmin = async (userId: string, approvedBy: string): Promise<void> => {
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ role: 'admin', is_active: true })
    .eq('id', userId);
  
  if (updateError) throw new Error('Failed to approve admin');

  const { error: permError } = await supabase
    .from('admin_permissions')
    .insert({ user_id: userId, granted_by: approvedBy });
  
  if (permError && !permError.message.includes('duplicate')) {
    throw new Error('Failed to record permission');
  }
};

export const revokeAdmin = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('user_profiles')
    .update({ role: 'pending', is_active: false })
    .eq('id', userId);
  
  if (error) throw new Error('Failed to revoke admin access');
};

export const getCurrentUserRole = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (error) return null;
  
  return {
    id: data.id,
    organizationId: data.organization_id,
    username: data.username,
    email: data.email,
    role: data.role,
    is_active: data.is_active,
    created_at: data.created_at,
  };
};

export const getAllUsers = async (organizationId?: string): Promise<UserProfile[]> => {
  let query = supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map(user => ({
    id: user.id,
    organizationId: user.organization_id,
    username: user.username,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
  }));
};

// Clear all cache (useful for manual refresh)
export const clearCache = (): void => {
  cache.clear();
  console.log('[Cache] All cache cleared');
};
