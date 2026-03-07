import { useState } from 'react';
import { Employee, TimeEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Calendar } from 'lucide-react';
import { getCurrentDate } from '@/lib/utils';
import { isZambianHoliday } from '@/constants/holidays';
import { AuthUser } from '@/hooks/useAuth';

interface BulkTimeEntryFormProps {
  employees: Employee[];
  adminUser: AuthUser;
  onSubmit: (entries: Partial<TimeEntry>[]) => void;
  onCancel: () => void;
}

interface EmployeeTimeData {
  employeeId: string;
  selected: boolean;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  notes: string;
}

export default function BulkTimeEntryForm({
  employees,
  adminUser,
  onSubmit,
  onCancel,
}: BulkTimeEntryFormProps) {
  const [date, setDate] = useState(getCurrentDate());
  const [employeeData, setEmployeeData] = useState<Record<string, EmployeeTimeData>>(
    employees.reduce((acc, emp) => ({
      ...acc,
      [emp.id]: {
        employeeId: emp.id,
        selected: false,
        clockIn: '08:00',
        clockOut: '17:00',
        breakMinutes: 60, // Default 1 hour break
        notes: '',
      },
    }), {})
  );

  const holiday = isZambianHoliday(date);
  const activeEmployees = employees.filter(e => e.status === 'active');

  const handleSelectAll = (checked: boolean) => {
    const updated = { ...employeeData };
    Object.keys(updated).forEach(key => {
      updated[key].selected = checked;
    });
    setEmployeeData(updated);
  };

  const handleEmployeeChange = (
    employeeId: string,
    field: keyof EmployeeTimeData,
    value: string | boolean | number
  ) => {
    setEmployeeData({
      ...employeeData,
      [employeeId]: {
        ...employeeData[employeeId],
        [field]: value,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const entries: Partial<TimeEntry>[] = Object.values(employeeData)
      .filter(data => data.selected)
      .map(data => {
        const employee = employees.find(e => e.id === data.employeeId)!;
        return {
          employeeId: data.employeeId,
          employeeName: employee.name,
          date,
          clockIn: data.clockIn,
          clockOut: data.clockOut,
          breakMinutes: data.breakMinutes,
          status: employee.status,
          notes: data.notes,
        };
      });

    if (entries.length > 0) {
      onSubmit(entries);
    }
  };

  const selectedCount = Object.values(employeeData).filter(d => d.selected).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="md:col-span-2">
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
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Select Employees ({selectedCount} selected)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSelectAll(selectedCount !== activeEmployees.length)}
          >
            {selectedCount === activeEmployees.length ? 'Deselect All' : 'Select All Active'}
          </Button>
        </div>

        <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
          {activeEmployees.map((employee) => {
            const data = employeeData[employee.id];
            return (
              <div key={employee.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={data.selected}
                    onCheckedChange={(checked) =>
                      handleEmployeeChange(employee.id, 'selected', checked as boolean)
                    }
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="font-medium text-gray-900">{employee.name}</p>
                      <p className="text-sm text-gray-600">
                        {employee.position} - {employee.department}
                      </p>
                    </div>

                    {data.selected && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Clock In</Label>
                          <Input
                            type="time"
                            value={data.clockIn}
                            onChange={(e) =>
                              handleEmployeeChange(employee.id, 'clockIn', e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Clock Out</Label>
                          <Input
                            type="time"
                            value={data.clockOut}
                            onChange={(e) =>
                              handleEmployeeChange(employee.id, 'clockOut', e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Break (min)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="15"
                            value={data.breakMinutes}
                            onChange={(e) =>
                              handleEmployeeChange(employee.id, 'breakMinutes', parseInt(e.target.value) || 0)
                            }
                            required
                          />
                        </div>
                        <div className="col-span-3 space-y-1">
                          <Label className="text-xs">Notes (Optional)</Label>
                          <Textarea
                            value={data.notes}
                            onChange={(e) =>
                              handleEmployeeChange(employee.id, 'notes', e.target.value)
                            }
                            placeholder="Add any notes..."
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={selectedCount === 0}>
          Save {selectedCount} Time {selectedCount === 1 ? 'Entry' : 'Entries'}
        </Button>
      </div>
    </form>
  );
}
