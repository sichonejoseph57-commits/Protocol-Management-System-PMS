import { Employee, TimeEntry, Admin } from '@/types';

const STORAGE_KEYS = {
  EMPLOYEES: 'timetrack_employees',
  TIME_ENTRIES: 'timetrack_time_entries',
  ADMINS: 'timetrack_admins',
  CURRENT_ADMIN: 'timetrack_current_admin',
  DEPARTMENTS: 'timetrack_departments',
};

// Initialize default admin
const initializeDefaultAdmin = () => {
  const admins = getAdmins();
  if (admins.length === 0) {
    const defaultAdmin: Admin = {
      id: '1',
      name: 'Admin User',
      email: 'admin@timetrack.com',
      password: 'admin123', // In production, this would be hashed
    };
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify([defaultAdmin]));
  }
};

// Admin functions
export const getAdmins = (): Admin[] => {
  const data = localStorage.getItem(STORAGE_KEYS.ADMINS);
  return data ? JSON.parse(data) : [];
};

export const getCurrentAdmin = (): Admin | null => {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_ADMIN);
  return data ? JSON.parse(data) : null;
};

export const setCurrentAdmin = (admin: Admin | null) => {
  if (admin) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ADMIN, JSON.stringify(admin));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_ADMIN);
  }
};

export const authenticateAdmin = (email: string, password: string): Admin | null => {
  const admins = getAdmins();
  const admin = admins.find(a => a.email === email && a.password === password);
  return admin || null;
};

// Employee functions
export const getEmployees = (): Employee[] => {
  const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
  return data ? JSON.parse(data) : [];
};

export const saveEmployee = (employee: Employee) => {
  const employees = getEmployees();
  const index = employees.findIndex(e => e.id === employee.id);
  
  if (index !== -1) {
    employees[index] = employee;
  } else {
    employees.push(employee);
  }
  
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
};

export const deleteEmployee = (id: string) => {
  const employees = getEmployees();
  const filtered = employees.filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(filtered));
};

// Time entry functions
export const getTimeEntries = (): TimeEntry[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TIME_ENTRIES);
  return data ? JSON.parse(data) : [];
};

export const saveTimeEntry = (entry: TimeEntry) => {
  const entries = getTimeEntries();
  const index = entries.findIndex(e => e.id === entry.id);
  
  if (index !== -1) {
    entries[index] = entry;
  } else {
    entries.push(entry);
  }
  
  localStorage.setItem(STORAGE_KEYS.TIME_ENTRIES, JSON.stringify(entries));
};

export const saveTimeEntries = (entries: TimeEntry[]) => {
  const existingEntries = getTimeEntries();
  const allEntries = [...existingEntries, ...entries];
  localStorage.setItem(STORAGE_KEYS.TIME_ENTRIES, JSON.stringify(allEntries));
};

export const deleteTimeEntry = (id: string) => {
  const entries = getTimeEntries();
  const filtered = entries.filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEYS.TIME_ENTRIES, JSON.stringify(filtered));
};

// Department functions
export const getDepartments = (): string[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
  if (data) {
    return JSON.parse(data);
  }
  // Default departments
  const defaultDepartments = [
    'Administration',
    'Finance',
    'Human Resources',
    'IT',
    'Operations',
    'Sales',
    'Marketing',
    'Customer Service',
  ];
  localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(defaultDepartments));
  return defaultDepartments;
};

export const addDepartment = (department: string) => {
  const departments = getDepartments();
  if (!departments.includes(department)) {
    departments.push(department);
    departments.sort();
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(departments));
  }
};

// Initialize on load
initializeDefaultAdmin();
