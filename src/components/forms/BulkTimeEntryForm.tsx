import { useState } from 'react';
import { Employee, TimeEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Calendar, Filter, Clock } from 'lucide-react';
import { getCurrentDate } from '@/lib/utils';
import { isZambianHoliday } from '@/constants/holidays';
import { AuthUser } from '@/hooks/useAuth';

interface BulkTimeEntryFormProps {
  employees: Employee[];
  adminUser: AuthUser;
  onSubmit: (entries: Partial<TimeEntry>[]) => void;
  onCancel: () => void;
}

export default function BulkTimeEntryForm({
  employees,
  adminUser,
  onSubmit,
  onCancel,
}: BulkTimeEntryFormProps) {
  const [date, setDate] = useState(getCurrentDate());
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [searchName, setSearchName] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  
  // SINGLE TIME ENTRY FOR ALL EMPLOYEES
  const [clockIn, setClockIn] = useState('08:00');
  const [clockOut, setClockOut] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState(60); // Default 1 hour break
  const [notes, setNotes] = useState('');

  const holiday = isZambianHoliday(date);
  
  // Get unique departments and positions
  const departments = Array.from(new Set(employees.map(e => e.department)));
  const positions = Array.from(new Set(employees.map(e => e.position)));
  
  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    if (emp.status !== 'active') return false;
    if (filterDepartment !== 'all' && emp.department !== filterDepartment) return false;
    if (filterPosition !== 'all' && emp.position !== filterPosition) return false;
    if (searchName && !emp.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    return true;
  });

  const handleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map(e => e.id)));
    }
  };

  const toggleEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedEmployees.size === 0) {
      return;
    }

    // Create time entries for ALL selected employees with the SAME time
    const entries: Partial<TimeEntry>[] = Array.from(selectedEmployees).map(employeeId => {
      const employee = employees.find(e => e.id === employeeId)!;
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        date,
        clockIn,
        clockOut,
        breakMinutes,
        status: employee.status,
        notes,
      };
    });

    onSubmit(entries);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date Selection */}
      <div className="space-y-2">
        <Label htmlFor="date">Date *</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      {holiday && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">{holiday.name}</p>
              <p className="text-sm text-amber-700">
                Holiday overtime will be applied at 2x standard rate
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* SINGLE TIME ENTRY BOX - Applied to ALL selected employees */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">
            Time Entry (will apply to all selected employees)
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clockIn">Clock In *</Label>
            <Input
              id="clockIn"
              type="time"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="clockOut">Clock Out *</Label>
            <Input
              id="clockOut"
              type="time"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="breakMinutes">Break (minutes) *</Label>
            <Input
              id="breakMinutes"
              type="number"
              min="0"
              step="15"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
              required
            />
          </div>
          
          <div className="md:col-span-3 space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes that will apply to all selected employees..."
              rows={2}
            />
          </div>
        </div>
      </Card>

      {/* Employee Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Label className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Select Employees ({selectedEmployees.size} selected)
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            {selectedEmployees.size === filteredEmployees.length ? 'Deselect All' : 'Select All Filtered'}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs mb-1">Search by Name</Label>
            <Input
              placeholder="Enter employee name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs mb-1">Department</Label>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1">Position</Label>
            <Select value={filterPosition} onValueChange={setFilterPosition}>
              <SelectTrigger>
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {positions.map(pos => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
          {filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No employees found matching the filters
            </div>
          ) : (
            filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 ${
                  selectedEmployees.has(employee.id) ? 'bg-blue-50' : ''
                }`}
                onClick={() => toggleEmployee(employee.id)}
              >
                <Checkbox
                  checked={selectedEmployees.has(employee.id)}
                  onCheckedChange={() => toggleEmployee(employee.id)}
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{employee.name}</p>
                  <p className="text-sm text-gray-600">
                    {employee.position} - {employee.department}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        
        <p className="text-sm text-gray-500 text-center">
          The time entry above will be applied to all {selectedEmployees.size} selected employee{selectedEmployees.size !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={selectedEmployees.size === 0}>
          Save Time for {selectedEmployees.size} Employee{selectedEmployees.size !== 1 ? 's' : ''}
        </Button>
      </div>
    </form>
  );
}
