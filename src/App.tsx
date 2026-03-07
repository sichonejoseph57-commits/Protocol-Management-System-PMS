import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import LoginForm from '@/components/forms/LoginForm';
import Dashboard from '@/pages/Dashboard';
import PendingApproval from '@/components/layout/PendingApproval';
import SuspendedNotice from '@/components/layout/SuspendedNotice';
import { getOrganization } from '@/lib/organization';

function App() {
  const { user, isAuthenticated, isLoading, login, signup, logout } = useAuth();
  const [organization, setOrganization] = useState<any>(null);
  const [viewAsClientMode, setViewAsClientMode] = useState<{
    active: boolean;
    organizationId: string | null;
    organizationName: string | null;
  }>({ active: false, organizationId: null, organizationName: null });

  useEffect(() => {
    // Load organization based on view mode
    const targetOrgId = viewAsClientMode.active 
      ? viewAsClientMode.organizationId 
      : user?.organizationId;
    
    if (targetOrgId) {
      getOrganization(targetOrgId).then(org => {
        if (org) setOrganization(org);
      });
    } else {
      setOrganization(null);
    }
  }, [user?.organizationId, viewAsClientMode]);

  const handleViewAsClient = (orgId: string, orgName: string) => {
    setViewAsClientMode({
      active: true,
      organizationId: orgId,
      organizationName: orgName,
    });
  };

  const handleExitViewAsClient = () => {
    setViewAsClientMode({
      active: false,
      organizationId: null,
      organizationName: null,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-xl font-semibold text-gray-900">Loading Protocol Management System...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we initialize your session</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} onSignup={signup} />;
  }

  // Check if organization is suspended
  if (organization?.subscription_status === 'suspended') {
    return (
      <SuspendedNotice
        companyName={organization.company_name}
        reason={organization.suspension_reason || 'Payment required'}
        contactEmail="support@protocolmanagementsystem.com"
        onLogout={logout}
      />
    );
  }

  // Check if user is pending approval (ONLY for non-owners)
  // CRITICAL: Super admins should NEVER see pending approval screen
  if (user && user.role === 'pending' && !user.is_active && user.role !== 'super_admin') {
    return (
      <div>
        <Header admin={user} organization={organization} onLogout={logout} />
        <PendingApproval 
          username={user.username} 
          email={user.email} 
          onLogout={logout} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        admin={user} 
        organization={organization} 
        onLogout={logout}
        viewAsClientMode={viewAsClientMode}
        onExitViewAsClient={handleExitViewAsClient}
      />
      <Dashboard 
        adminUser={user!} 
        organization={organization}
        viewAsClientMode={viewAsClientMode}
        onViewAsClient={handleViewAsClient}
        onExitViewAsClient={handleExitViewAsClient}
      />
    </div>
  );
}

export default App;
