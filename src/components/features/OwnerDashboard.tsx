import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, Users, DollarSign, TrendingUp, Power, Eye, Upload,
  CheckCircle, XCircle, Clock, AlertTriangle, Plus, MonitorPlay
} from 'lucide-react';
import { 
  getAllOrganizations, 
  getPlatformStats, 
  suspendOrganization, 
  activateOrganization,
  uploadOrganizationLogo,
  calculateTieredPrice,
  createOrganization
} from '@/lib/organization';
import { generateUniqueSubdomain } from '@/lib/subdomain';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/payroll';

interface Organization {
  id: string;
  company_name: string;
  logo_url: string | null;
  contact_email: string;
  subscription_status: string;
  subscription_plan: string;
  trial_ends_at: string | null;
  created_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
}

interface OwnerDashboardProps {
  onViewAsClient?: (orgId: string, orgName: string) => void;
}

export default function OwnerDashboard({ onViewAsClient }: OwnerDashboardProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showLogoDialog, setShowLogoDialog] = useState(false);
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // New client form data
  const [newClientData, setNewClientData] = useState({
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    expectedEmployees: 5,
  });
  const [clientLogoFile, setClientLogoFile] = useState<File | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [orgs, platformStats] = await Promise.all([
        getAllOrganizations(),
        getPlatformStats(),
      ]);
      setOrganizations(orgs);
      setStats(platformStats);
    } catch (error: any) {
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedOrg || !suspensionReason.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide a suspension reason',
        variant: 'destructive',
      });
      return;
    }

    try {
      await suspendOrganization(selectedOrg.id, suspensionReason);
      toast({
        title: 'Organization Suspended',
        description: `${selectedOrg.company_name} has been suspended`,
      });
      setShowSuspendDialog(false);
      setSuspensionReason('');
      setSelectedOrg(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Suspension Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleActivate = async (org: Organization) => {
    try {
      await activateOrganization(org.id);
      toast({
        title: 'Organization Activated',
        description: `${org.company_name} has been reactivated`,
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Activation Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleLogoUpload = async () => {
    if (!selectedOrg || !logoFile) return;

    try {
      await uploadOrganizationLogo(logoFile, selectedOrg.id);
      toast({
        title: 'Logo Uploaded',
        description: `Logo for ${selectedOrg.company_name} updated successfully`,
      });
      setShowLogoDialog(false);
      setLogoFile(null);
      setSelectedOrg(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddClient = async () => {
    if (!newClientData.companyName.trim() || !newClientData.contactEmail.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide company name and contact email',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create organization with auto-generated subdomain
      const organizationId = await createOrganization(
        newClientData.companyName,
        newClientData.contactEmail,
        newClientData.contactPhone,
        clientLogoFile || undefined
      );
      
      // Get the created organization to show subdomain
      const { data: newOrg } = await supabase
        .from('organizations')
        .select('subdomain')
        .eq('id', organizationId)
        .single();

      toast({
        title: 'Client Added',
        description: `${newClientData.companyName} has been successfully created. Login URL: ${newOrg?.subdomain}.pms.app`,
      });
      
      setShowAddClientDialog(false);
      setNewClientData({
        companyName: '',
        contactEmail: '',
        contactPhone: '',
        expectedEmployees: 5,
      });
      setClientLogoFile(null);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Failed to Add Client',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      active: { color: 'bg-green-600', icon: CheckCircle },
      trial: { color: 'bg-blue-600', icon: Clock },
      suspended: { color: 'bg-red-600', icon: XCircle },
      cancelled: { color: 'bg-gray-600', icon: AlertTriangle },
    };

    const config = variants[status] || variants.cancelled;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center gap-3">
            <Building2 className="w-10 h-10" />
            <div>
              <p className="text-sm opacity-90">Total Clients</p>
              <p className="text-3xl font-bold">{stats?.total_clients || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-600 to-emerald-700 text-white">
          <div className="flex items-center gap-3">
            <Users className="w-10 h-10" />
            <div>
              <p className="text-sm opacity-90">Total Employees</p>
              <p className="text-3xl font-bold">{stats?.total_employees || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-600 to-pink-700 text-white">
          <div className="flex items-center gap-3">
            <DollarSign className="w-10 h-10" />
            <div>
              <p className="text-sm opacity-90">Total Revenue</p>
              <p className="text-3xl font-bold">{formatCurrency(stats?.total_revenue || 0)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-600 to-red-700 text-white">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-10 h-10" />
            <div>
              <p className="text-sm opacity-90">This Month</p>
              <p className="text-3xl font-bold">{formatCurrency(stats?.monthly_revenue || 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Active Clients</p>
          <p className="text-2xl font-bold text-green-600">{stats?.active_clients || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Trial Clients</p>
          <p className="text-2xl font-bold text-blue-600">{stats?.trial_clients || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Suspended</p>
          <p className="text-2xl font-bold text-red-600">{stats?.suspended_clients || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Pending Payment</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats?.pending_revenue || 0)}</p>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Client Organizations</h2>
          <Button onClick={() => setShowAddClientDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add New Client
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt={org.company_name}
                          className="w-10 h-10 rounded object-contain bg-gray-50"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{org.company_name}</p>
                        {org.suspended_at && (
                          <p className="text-xs text-red-600">{org.suspension_reason}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{org.contact_email}</p>
                  </TableCell>
                  <TableCell>{getStatusBadge(org.subscription_status)}</TableCell>
                  <TableCell className="capitalize">{org.subscription_plan?.replace('_', ' ')}</TableCell>
                  <TableCell>{new Date(org.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => {
                          setSelectedOrg(org);
                          setShowLogoDialog(true);
                        }}
                      >
                        <Upload className="w-3 h-3" />
                        Logo
                      </Button>
                      {org.subscription_status === 'suspended' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleActivate(org)}
                        >
                          <Power className="w-3 h-3" />
                          Activate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => {
                            setSelectedOrg(org);
                            setShowSuspendDialog(true);
                          }}
                        >
                          <Power className="w-3 h-3" />
                          Suspend
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-blue-600 border-blue-600 hover:bg-blue-50"
                        onClick={() => onViewAsClient?.(org.id, org.company_name)}
                      >
                        <MonitorPlay className="w-3 h-3" />
                        View Dashboard
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Suspending <span className="font-semibold">{selectedOrg?.company_name}</span> will:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Immediately block all user access</li>
              <li>Display a "Payment Required" notice</li>
              <li>Preserve all data (no deletion)</li>
            </ul>
            <div className="space-y-2">
              <Label htmlFor="reason">Suspension Reason *</Label>
              <Textarea
                id="reason"
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="e.g., Payment overdue, Terms violation..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={!suspensionReason.trim()}
            >
              Suspend Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logo Upload Dialog */}
      <Dialog open={showLogoDialog} onOpenChange={setShowLogoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Company Logo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload a logo for <span className="font-semibold">{selectedOrg?.company_name}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="logo">Company Logo</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500">
                Recommended: PNG or SVG, max 2MB, transparent background
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogoUpload} disabled={!logoFile}>
              Upload Logo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={newClientData.companyName}
                onChange={(e) => setNewClientData({ ...newClientData, companyName: e.target.value })}
                placeholder="ABC Corporation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={newClientData.contactEmail}
                onChange={(e) => setNewClientData({ ...newClientData, contactEmail: e.target.value })}
                placeholder="admin@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={newClientData.contactPhone}
                onChange={(e) => setNewClientData({ ...newClientData, contactPhone: e.target.value })}
                placeholder="+260 ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedEmployees">Expected Employee Count</Label>
              <Input
                id="expectedEmployees"
                type="number"
                min="1"
                value={newClientData.expectedEmployees}
                onChange={(e) => setNewClientData({ ...newClientData, expectedEmployees: parseInt(e.target.value) || 1 })}
              />
              <p className="text-xs text-gray-500">
                This will determine the pricing tier for the client
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientLogo">Company Logo (Optional)</Label>
              <Input
                id="clientLogo"
                type="file"
                accept="image/*"
                onChange={(e) => setClientLogoFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500">
                Upload the client's logo for white-label branding
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="mb-2"><strong>Note:</strong> New clients will receive a 30-day trial period and can create their admin account using the contact email provided.</p>
              <p><strong>Pricing:</strong> Based on {newClientData.expectedEmployees} employees - {calculateTieredPrice(newClientData.expectedEmployees).tierName}: {formatCurrency(calculateTieredPrice(newClientData.expectedEmployees).amount)}/month</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddClientDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddClient}>
              Add Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
