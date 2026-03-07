import { useState, useEffect } from 'react';
import { Employee } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getDepartments, addDepartment, getPositions, addPosition } from '@/lib/database';
import { uploadEmployeePhoto } from '@/lib/organization';
import { AuthUser } from '@/hooks/useAuth';
import { Plus, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmployeeFormProps {
  employee?: Employee;
  adminUser: AuthUser;
  onSubmit: (employee: Partial<Employee>) => void;
  onCancel: () => void;
}

const STATUSES: Employee['status'][] = ['active', 'resigned', 'sick-leave', 'absent'];

export default function EmployeeForm({ employee, adminUser, onSubmit, onCancel }: EmployeeFormProps) {
  const [departments, setDepartments] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [showNewDepartment, setShowNewDepartment] = useState(false);
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(employee?.photoUrl || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [depts, pos] = await Promise.all([
        getDepartments(),
        getPositions(),
      ]);
      setDepartments(depts);
      setPositions(pos);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    employeeNumber: employee?.employeeNumber || '',
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    department: employee?.department || '',
    position: employee?.position || '',
    hourlyWage: employee?.hourlyWage || '' as any,
    status: employee?.status || 'active',
    statusNote: employee?.statusNote || '',
    hireDate: employee?.hireDate || new Date().toISOString().split('T')[0],
  });

  const handleAddDepartment = async () => {
    const trimmedDept = newDepartment.trim();
    if (!trimmedDept) return;
    
    // Check for duplicates before attempting to add
    if (departments.some(d => d.toLowerCase() === trimmedDept.toLowerCase())) {
      toast({
        title: 'Duplicate Department',
        description: `"${trimmedDept}" already exists. Please select it from the dropdown.`,
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await addDepartment(trimmedDept, adminUser.id);
      const depts = await getDepartments();
      setDepartments(depts);
      setFormData({ ...formData, department: trimmedDept });
      setNewDepartment('');
      setShowNewDepartment(false);
      toast({
        title: 'Success',
        description: `Department "${trimmedDept}" added successfully`,
      });
    } catch (error: any) {
      console.error('Error adding department:', error);
      toast({
        title: 'Failed to Add Department',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleAddPosition = async () => {
    const trimmedPos = newPosition.trim();
    if (!trimmedPos) return;
    
    // Check for duplicates before attempting to add
    if (positions.some(p => p.toLowerCase() === trimmedPos.toLowerCase())) {
      toast({
        title: 'Duplicate Position',
        description: `"${trimmedPos}" already exists. Please select it from the dropdown.`,
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await addPosition(trimmedPos, adminUser.id);
      const pos = await getPositions();
      setPositions(pos);
      setFormData({ ...formData, position: trimmedPos });
      setNewPosition('');
      setShowNewPosition(false);
      toast({
        title: 'Success',
        description: `Position "${trimmedPos}" added successfully`,
      });
    } catch (error: any) {
      console.error('Error adding position:', error);
      toast({
        title: 'Failed to Add Position',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Comprehensive field validation with specific error messages
    if (!formData.name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter the employee\'s full name',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.phone.trim()) {
      toast({
        title: 'Phone Number Required',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.department) {
      toast({
        title: 'Department Required',
        description: 'Please select or add a department',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.position) {
      toast({
        title: 'Position Required',
        description: 'Please select or add a position',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.hourlyWage || parseFloat(formData.hourlyWage.toString()) <= 0) {
      toast({
        title: 'Hourly Wage Required',
        description: 'Please enter a valid hourly wage greater than 0',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.hireDate) {
      toast({
        title: 'Hire Date Required',
        description: 'Please select the employee\'s hire date',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address or leave it blank',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      let photoUrl = photoPreview;
      
      // Upload photo if a new file was selected
      if (photoFile) {
        try {
          setIsUploadingPhoto(true);
          const tempId = employee?.id || `temp-${Date.now()}`;
          photoUrl = await uploadEmployeePhoto(photoFile, tempId);
        } catch (error: any) {
          toast({
            title: 'Photo upload failed',
            description: error.message,
            variant: 'destructive',
          });
          return;
        } finally {
          setIsUploadingPhoto(false);
        }
      }
      
      // Convert hourlyWage to number before submitting
      await onSubmit({ 
        ...formData, 
        hourlyWage: parseFloat(formData.hourlyWage.toString()),
        photoUrl: photoUrl || undefined 
      });
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message || 'An error occurred while saving employee',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Photo must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Employee Photo Upload */}
      <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center gap-2">
          <Label htmlFor="photo" className="text-base font-semibold">Employee Photo (Optional)</Label>
          <Upload className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex items-center gap-4">
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Employee photo"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 shadow-sm"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-md"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-400" />
            </div>
          )}
          <div className="flex-1">
            <Input
              id="photo"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <label htmlFor="photo" className="cursor-pointer inline-block">
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm active:bg-gray-100">
                <Upload className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {photoFile ? photoFile.name : 'Browse Computer'}
                </span>
              </div>
            </label>
            <p className="text-xs text-gray-600 mt-2">
              💻 Click "Browse Computer" to select a photo from your local files
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Max file size: 5MB • Supported: JPG, PNG, WEBP
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="employeeNumber">Employee ID/Number (Optional)</Label>
          <Input
            id="employeeNumber"
            value={formData.employeeNumber}
            onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
            placeholder="e.g., EMP001, 2024-001"
          />
          <p className="text-xs text-gray-500">Unique identifier for employee tracking</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address (Optional)</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="employee@company.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+260 ..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hireDate">Hire Date *</Label>
          <Input
            id="hireDate"
            type="date"
            value={formData.hireDate}
            onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="department">Department *</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNewDepartment(!showNewDepartment)}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add New
            </Button>
          </div>
          
          {showNewDepartment ? (
            <div className="flex gap-2">
              <Input
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="Enter new department"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDepartment();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddDepartment}
                size="sm"
              >
                Add
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNewDepartment(false);
                  setNewDepartment('');
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Select
              value={formData.department}
              onValueChange={(value) => setFormData({ ...formData, department: value })}
            >
              <SelectTrigger id="department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="position">Position *</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNewPosition(!showNewPosition)}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add New
            </Button>
          </div>
          
          {showNewPosition ? (
            <div className="flex gap-2">
              <Input
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder="Enter new position"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPosition();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddPosition}
                size="sm"
              >
                Add
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNewPosition(false);
                  setNewPosition('');
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Select
              value={formData.position}
              onValueChange={(value) => setFormData({ ...formData, position: value })}
            >
              <SelectTrigger id="position">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="hourlyWage">Hourly Wage (ZMW) *</Label>
          <Input
            id="hourlyWage"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Enter hourly wage"
            value={formData.hourlyWage}
            onChange={(e) => setFormData({ ...formData, hourlyWage: e.target.value as any })}
            required
          />
          <p className="text-xs text-gray-500">Enter the employee's hourly wage in ZMW</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select
            value={formData.status}
            onValueChange={(value: Employee['status']) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.status !== 'active' && (
        <div className="space-y-2">
          <Label htmlFor="statusNote">Status Note</Label>
          <Textarea
            id="statusNote"
            value={formData.statusNote}
            onChange={(e) => setFormData({ ...formData, statusNote: e.target.value })}
            placeholder="Add details about the status change..."
            rows={3}
          />
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || isUploadingPhoto}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isUploadingPhoto}>
          {isUploadingPhoto ? 'Uploading photo...' : isSubmitting ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
        </Button>
      </div>
    </form>
  );
}
