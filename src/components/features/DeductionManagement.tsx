import { useState, useEffect } from 'react';
import { Deduction, Employee } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getDeductions, saveDeduction, deleteDeduction, applyDeductionsToEmployees } from '@/lib/deductions';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, DollarSign } from 'lucide-react';

interface DeductionManagementProps {
  organizationId: string;
  userId: string;
  employees: Employee[];
}

const DEDUCTION_TYPES = [
  { value: 'custom', label: 'Custom Deduction' },
  { value: 'paye', label: 'PAYE Tax' },
  { value: 'napsa', label: 'NAPSA' },
  { value: 'other', label: 'Other' },
];

export default function DeductionManagement({ organizationId, userId, employees }: DeductionManagementProps) {
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'custom' as Deduction['type'],
    isPercentage: false,
    amount: '',
    description: '',
  });
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadDeductions();
  }, [organizationId]);

  const loadDeductions = async () => {
    try {
      const data = await getDeductions(organizationId);
      setDeductions(data);
    } catch (error: any) {
      toast({
        title: 'Error loading deductions',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: 'Invalid input',
        description: 'Please provide deduction name and valid amount',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await saveDeduction({
        name: formData.name,
        type: formData.type,
        isPercentage: formData.isPercentage,
        amount: parseFloat(formData.amount),
        description: formData.description,
        isActive: true,
      }, userId, organizationId);
      
      toast({
        title: 'Success',
        description: 'Deduction saved successfully',
      });
      
      setFormData({
        name: '',
        type: 'custom',
        isPercentage: false,
        amount: '',
        description: '',
      });
      setShowForm(false);
      loadDeductions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDeduction = async (id: string) => {
    try {
      await deleteDeduction(id);
      toast({
        title: 'Success',
        description: 'Deduction removed',
      });
      loadDeductions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleApplyToEmployees = async (deductionId: string) => {
    if (selectedEmployees.length === 0) {
      toast({
        title: 'No employees selected',
        description: 'Please select at least one employee',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await applyDeductionsToEmployees(selectedEmployees, deductionId, userId);
      toast({
        title: 'Success',
        description: `Deduction applied to ${selectedEmployees.length} employee(s)`,
      });
      setSelectedEmployees([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment;
    const matchesPos = filterPosition === 'all' || emp.position === filterPosition;
    return matchesDept && matchesPos && emp.status === 'active';
  });

  const departments = Array.from(new Set(employees.map(e => e.department)));
  const positions = Array.from(new Set(employees.map(e => e.position)));

  const toggleEmployee = (empId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const toggleAllFiltered = () => {
    const allIds = filteredEmployees.map(e => e.id);
    if (selectedEmployees.length === allIds.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(allIds);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Deduction Management</h3>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'Add Deduction'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <form onSubmit={handleSaveDeduction} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Deduction Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Uniform, Tools, Loan Repayment"
                  required
                />
              </div>
              <div>
                <Label>Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: Deduction['type']) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEDUCTION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Enter amount"
                    required
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isPercentage"
                      checked={formData.isPercentage}
                      onCheckedChange={(checked) => setFormData({ ...formData, isPercentage: !!checked })}
                    />
                    <Label htmlFor="isPercentage" className="cursor-pointer">%</Label>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.isPercentage ? 'Percentage of gross pay' : 'Fixed amount in ZMW'}
                </p>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <Button type="submit">Save Deduction</Button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deductions.map(deduction => (
          <Card key={deduction.id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-lg">{deduction.name}</h4>
                <Badge variant="outline" className="mt-1">
                  {DEDUCTION_TYPES.find(t => t.value === deduction.type)?.label}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteDeduction(deduction.id)}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-2xl font-bold text-blue-600 mb-3">
              <DollarSign className="w-6 h-6" />
              {deduction.isPercentage ? `${deduction.amount}%` : `ZMW ${deduction.amount.toFixed(2)}`}
            </div>
            {deduction.description && (
              <p className="text-sm text-gray-600 mb-3">{deduction.description}</p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleApplyToEmployees(deduction.id)}
              disabled={selectedEmployees.length === 0}
            >
              Apply to {selectedEmployees.length} Selected Employee(s)
            </Button>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h4 className="font-semibold mb-4">Select Employees for Deduction Application</h4>
        <div className="flex gap-3 mb-4">
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPosition} onValueChange={setFilterPosition}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {positions.map(pos => (
                <SelectItem key={pos} value={pos}>{pos}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={toggleAllFiltered}>
            {selectedEmployees.length === filteredEmployees.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
          {filteredEmployees.map(emp => (
            <div
              key={emp.id}
              className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                selectedEmployees.includes(emp.id) ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
              }`}
              onClick={() => toggleEmployee(emp.id)}
            >
              <Checkbox
                checked={selectedEmployees.includes(emp.id)}
                onCheckedChange={() => toggleEmployee(emp.id)}
              />
              <div className="text-sm">
                <div className="font-medium">{emp.name}</div>
                <div className="text-gray-500 text-xs">{emp.department} - {emp.position}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-3">
          {selectedEmployees.length} of {filteredEmployees.length} employees selected
        </p>
      </Card>
    </div>
  );
}
