import { useState, useEffect } from 'react';
import { Users, Clock, DollarSign, TrendingUp, UserPlus, ClipboardList, RefreshCw, Shield, Settings as SettingsIcon, CreditCard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import EmployeeForm from '@/components/forms/EmployeeForm';
import BulkTimeEntryForm from '@/components/forms/BulkTimeEntryForm';
import EmployeeTable from '@/components/features/EmployeeTable';
import TimeEntryTable from '@/components/features/TimeEntryTable';
import PayrollReport from '@/components/features/PayrollReport';
import AdminManagement from '@/components/features/AdminManagement';
import SystemSettings from '@/components/features/SystemSettings';
import SubscriptionManagement from '@/components/features/SubscriptionManagement';

import AIWorkforceReport from '@/components/features/AIWorkforceReport';
import OwnerDashboard from '@/components/features/OwnerDashboard';
import { Employee, TimeEntry } from '@/types';
import { getEmployees, saveEmployee, deleteEmployee, getTimeEntries, saveTimeEntries } from '@/lib/database';
import { calculateTimeEntryPay, formatCurrency } from '@/lib/payroll';
import { getCurrentDate } from '@/lib/utils';
import { AuthUser } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getSystemSettings, type SystemSettings as SystemSettingsType } from '@/lib/settings';
import heroImage from '@/assets/hero-dashboard.jpg';

interface DashboardProps {
  adminUser: AuthUser;
  organization?: any;
  viewAsClientMode?: {
    active: boolean;
    organizationId: string | null;
    organizationName: string | null;
  };
  onViewAsClient?: (orgId: string, orgName: string) => void;
  onExitViewAsClient?: () => void;
}

export default function Dashboard({ adminUser, organization, viewAsClientMode, onViewAsClient, onExitViewAsClient }: DashboardProps) {
  const isOwner = adminUser.role === 'super_admin';
  const isViewingAsClient = viewAsClientMode?.active;
  // Auto-redirect Owner to Owner dashboard on first load (unless viewing as client)
  const [activeTab, setActiveTab] = useState<string>(
    isOwner && !isViewingAsClient ? 'owner' : 'employees'
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettingsType>({
    overtimeThresholdDaily: 8,
    overtimeRate: 1.5,
    holidayRate: 2.0,
    overtimeCalculationMethod: 'daily',
  });
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showBulkTimeDialog, setShowBulkTimeDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, [viewAsClientMode]);

  // Reset to employees tab when entering view-as-client mode
  useEffect(() => {
    if (isViewingAsClient) {
      setActiveTab('employees');
    }
  }, [isViewingAsClient]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log('Loading dashboard data...');
      
      // Performance optimization: Load only recent data (30 days) for faster initial load
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Data loading timeout - please check your connection')), 10000)
      );
      
      const dataPromise = Promise.all([
        getEmployees(), // All employees (typically < 500)
        getTimeEntries(undefined, { 
          startDate: thirtyDaysAgo,
          limit: 500 // Recent entries only
        }),
        getSystemSettings(),
      ]);
      
      const [employeesData, entriesData, settings] = await Promise.race([
        dataPromise,
        timeoutPromise
      ]) as any;
      
      console.log(`Loaded ${employeesData.length} employees, ${entriesData.length} time entries`);
      setEmployees(employeesData);
      setTimeEntries(entriesData);
      setSystemSettings(settings);
    } catch (error: any) {
      console.error('Dashboard load error:', error);
      toast({
        title: 'Error loading data',
        description: error.message || 'Failed to load dashboard data. Please refresh the page.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Performance optimization: Incremental updates instead of full reload
    const employeesChannel = supabase
      .channel('employees-channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'employees' 
      }, (payload) => {
        // Add new employee to state
        const newEmp = payload.new as any;
        setEmployees(prev => [{
          id: newEmp.id,
          organizationId: newEmp.organization_id,
          name: newEmp.name,
          email: newEmp.email,
          phone: newEmp.phone,
          department: newEmp.department,
          position: newEmp.position,
          hourlyWage: parseFloat(newEmp.hourly_wage),
          status: newEmp.status,
          statusNote: newEmp.status_note,
          hireDate: newEmp.hire_date,
          photoUrl: newEmp.photo_url,
          createdBy: newEmp.created_by_name,
          createdAt: newEmp.created_at,
        }, ...prev]);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'employees' 
      }, (payload) => {
        // Update employee in state
        const updated = payload.new as any;
        setEmployees(prev => prev.map(emp => 
          emp.id === updated.id ? {
            id: updated.id,
            organizationId: updated.organization_id,
            name: updated.name,
            email: updated.email,
            phone: updated.phone,
            department: updated.department,
            position: updated.position,
            hourlyWage: parseFloat(updated.hourly_wage),
            status: updated.status,
            statusNote: updated.status_note,
            hireDate: updated.hire_date,
            photoUrl: updated.photo_url,
            createdBy: updated.created_by_name,
            createdAt: updated.created_at,
          } : emp
        ));
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'employees' 
      }, (payload) => {
        // Remove employee from state
        setEmployees(prev => prev.filter(emp => emp.id !== (payload.old as any).id));
      })
      .subscribe();

    // Subscribe to time entry changes
    const timeEntriesChannel = supabase
      .channel('time-entries-channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'time_entries' 
      }, (payload) => {
        // Add new entry to state
        const newEntry = payload.new as any;
        setTimeEntries(prev => [{
          id: newEntry.id,
          organizationId: newEntry.organization_id,
          employeeId: newEntry.employee_id,
          employeeName: newEntry.employee_name,
          date: newEntry.date,
          clockIn: newEntry.clock_in,
          clockOut: newEntry.clock_out,
          breakMinutes: newEntry.break_minutes,
          totalHours: parseFloat(newEntry.total_hours),
          isHoliday: newEntry.is_holiday,
          overtimeRate: parseFloat(newEntry.overtime_rate),
          regularPay: parseFloat(newEntry.regular_pay),
          overtimePay: parseFloat(newEntry.overtime_pay),
          totalPay: parseFloat(newEntry.total_pay),
          status: newEntry.status,
          notes: newEntry.notes,
          enteredBy: newEntry.entered_by_name,
          enteredAt: newEntry.entered_at,
        }, ...prev]);
      })
      .subscribe();

    return () => {
      employeesChannel.unsubscribe();
      timeEntriesChannel.unsubscribe();
    };
  };

  const handleSaveEmployee = async (employeeData: Partial<Employee>) => {
    const isUpdate = !!editingEmployee;
    
    try {
      console.log('Dashboard: Saving employee...', { 
        isUpdate, 
        organizationId: adminUser.organizationId,
        userId: adminUser.id,
        employeeData 
      });
      
      // Validate admin user has valid organization before attempting to save
      if (!adminUser.organizationId || adminUser.organizationId === 'none') {
        throw new Error('Your account is not associated with an organization. Please contact support.');
      }
      
      await saveEmployee(
        employeeData,
        adminUser.id,
        adminUser.username,
        adminUser.organizationId,
        isUpdate
      );
      
      console.log('Dashboard: Employee saved successfully');
      
      toast({
        title: '✅ Success',
        description: `Employee ${isUpdate ? 'updated' : 'added'} successfully`,
      });
      setShowEmployeeDialog(false);
      setEditingEmployee(undefined);
      
      // Reload data to show the new employee
      await loadData();
    } catch (error: any) {
      console.error('Dashboard: Save employee error:', error);
      toast({
        title: '❌ Failed to Save Employee',
        description: error.message || 'An error occurred while saving. Please try again.',
        variant: 'destructive',
      });
      throw error; // Re-throw to let EmployeeForm handle it
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await deleteEmployee(id);
      toast({
        title: 'Success',
        description: 'Employee deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleBulkTimeEntry = async (entries: Partial<TimeEntry>[]) => {
    try {
      const fullEntries: Partial<TimeEntry>[] = entries.map(entry => {
        const employee = employees.find(e => e.id === entry.employeeId)!;
        const payData = calculateTimeEntryPay(
          entry.date!,
          entry.clockIn!,
          entry.clockOut!,
          employee.hourlyWage,
          entry.breakMinutes || 0,
          systemSettings.overtimeThresholdDaily,
          systemSettings.overtimeRate,
          systemSettings.holidayRate
        );

        return {
          employeeId: entry.employeeId,
          employeeName: entry.employeeName,
          date: entry.date,
          clockIn: entry.clockIn,
          clockOut: entry.clockOut,
          breakMinutes: entry.breakMinutes || 0,
          status: entry.status,
          notes: entry.notes,
          ...payData,
        };
      });

      await saveTimeEntries(fullEntries, adminUser.id, adminUser.username, adminUser.organizationId);
      toast({
        title: 'Success',
        description: `${fullEntries.length} time ${fullEntries.length === 1 ? 'entry' : 'entries'} saved successfully`,
      });
      setShowBulkTimeDialog(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const todayEntries = timeEntries.filter(e => e.date === getCurrentDate());
  const todayHours = todayEntries.reduce((sum, e) => sum + e.totalHours, 0);
  const todayPay = todayEntries.reduce((sum, e) => sum + e.totalPay, 0);
  const todayOvertimeHours = todayEntries.reduce((sum, e) => {
    if (e.isHoliday) return sum + e.totalHours;
    return sum + (e.totalHours > systemSettings.overtimeThresholdDaily ? e.totalHours - systemSettings.overtimeThresholdDaily : 0);
  }, 0);
  const todayOvertimePay = todayEntries.reduce((sum, e) => sum + e.overtimePay, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={heroImage} 
            alt="Dashboard" 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-white">
            <h1 className="text-4xl font-bold mb-2">Welcome, {adminUser.username}</h1>
            <p className="text-blue-100 text-lg">
              Protocol Management System - Professional employee time sheet and payroll platform
            </p>
          </div>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-white" />
                <div>
                  <p className="text-sm text-blue-100">Total Employees</p>
                  <p className="text-2xl font-bold text-white">{employees.length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-white" />
                <div>
                  <p className="text-sm text-blue-100">Active Employees</p>
                  <p className="text-2xl font-bold text-white">{activeEmployees}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-white" />
                <div>
                  <p className="text-sm text-blue-100">Today's Hours</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-white">{todayHours.toFixed(1)}</p>
                    {todayOvertimeHours > 0 && (
                      <span className="text-xs text-amber-200">+{todayOvertimeHours.toFixed(1)} OT</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-white/10 backdrop-blur-sm border-white/20">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-white" />
                <div>
                  <p className="text-sm text-blue-100">Today's Payroll</p>
                  <div className="flex flex-col">
                    <p className="text-2xl font-bold text-white">{formatCurrency(todayPay)}</p>
                    {todayOvertimePay > 0 && (
                      <span className="text-xs text-amber-200">OT: {formatCurrency(todayOvertimePay)}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-3 mb-6 flex-wrap">
          <Button
            onClick={loadData}
            variant="outline"
            className="gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => {
              setEditingEmployee(undefined);
              setShowEmployeeDialog(true);
            }}
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </Button>
          <Button
            onClick={() => setShowBulkTimeDialog(true)}
            variant="outline"
            className="gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            Bulk Time Entry
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 md:grid-cols-8 gap-1">
            {isOwner && !isViewingAsClient && (
              <TabsTrigger value="owner" className="gap-2">
                <Shield className="w-4 h-4" />
                Owner
              </TabsTrigger>
            )}
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="time-entries">Time Entries</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="ai-reports" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AI Reports
            </TabsTrigger>
            {adminUser.role === 'super_admin' && (
              <>
                <TabsTrigger value="subscription" className="gap-2">
                  <CreditCard className="w-4 h-4" />
                  Billing
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <SettingsIcon className="w-4 h-4" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="admin-management" className="gap-2">
                  <Shield className="w-4 h-4" />
                  Admins
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {isOwner && !isViewingAsClient && (
            <TabsContent value="owner">
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Platform Owner Dashboard</h2>
                <OwnerDashboard onViewAsClient={onViewAsClient} />
              </Card>
            </TabsContent>
          )}

          <TabsContent value="employees">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Employee Management</h2>
              <EmployeeTable
                employees={employees}
                onEdit={(emp) => {
                  setEditingEmployee(emp);
                  setShowEmployeeDialog(true);
                }}
                onDelete={handleDeleteEmployee}
              />
            </Card>
          </TabsContent>

          <TabsContent value="time-entries">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Time Entry History</h2>
              <TimeEntryTable timeEntries={timeEntries} />
            </Card>
          </TabsContent>

          <TabsContent value="payroll">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Monthly Payroll Report</h2>
              <PayrollReport employees={employees} timeEntries={timeEntries} />
            </Card>
          </TabsContent>

          <TabsContent value="ai-reports">
            <Card className="p-6">
              <AIWorkforceReport organizationId={adminUser.organizationId} />
            </Card>
          </TabsContent>

          {adminUser.role === 'super_admin' && (
            <>
              <TabsContent value="subscription">
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Subscription & Billing</h2>
                  <SubscriptionManagement
                    organizationId={adminUser.organizationId}
                    employeeCount={activeEmployees}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card className="p-6">
                  <SystemSettings userId={adminUser.id} />
                </Card>
              </TabsContent>

              <TabsContent value="admin-management">
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Management</h2>
                  <AdminManagement currentUserId={adminUser.id} />
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Employee Dialog */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </DialogTitle>
          </DialogHeader>
          <EmployeeForm
            employee={editingEmployee}
            adminUser={adminUser}
            onSubmit={handleSaveEmployee}
            onCancel={() => {
              setShowEmployeeDialog(false);
              setEditingEmployee(undefined);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Time Entry Dialog */}
      <Dialog open={showBulkTimeDialog} onOpenChange={setShowBulkTimeDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Time Entry</DialogTitle>
          </DialogHeader>
          <BulkTimeEntryForm
            employees={employees}
            adminUser={adminUser}
            onSubmit={handleBulkTimeEntry}
            onCancel={() => setShowBulkTimeDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
