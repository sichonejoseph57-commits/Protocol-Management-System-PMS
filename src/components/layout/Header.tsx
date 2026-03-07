import { Button } from '@/components/ui/button';
import { LogOut, Clock, Cloud, Shield, Building2, Eye, X } from 'lucide-react';
import { AuthUser } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import pmsLogo from '@/assets/pms-logo.jpg';

interface HeaderProps {
  admin: AuthUser | null;
  organization?: any;
  onLogout: () => void;
  viewAsClientMode?: {
    active: boolean;
    organizationId: string | null;
    organizationName: string | null;
  };
  onExitViewAsClient?: () => void;
}

export default function Header({ admin, organization, onLogout, viewAsClientMode, onExitViewAsClient }: HeaderProps) {
  const showClientLogo = admin && organization?.logo_url;
  const displayName = organization?.company_name || 'Protocol Management System';
  const isViewingAsClient = viewAsClientMode?.active && admin?.role === 'super_admin';
  return (
    <>
    {isViewingAsClient && (
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5" />
            <span className="font-semibold">Viewing as Client:</span>
            <span>{viewAsClientMode?.organizationName}</span>
            <Badge className="bg-white/20 text-white border-white/30">Support Mode</Badge>
          </div>
          <Button
            onClick={onExitViewAsClient}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 gap-2"
          >
            <X className="w-4 h-4" />
            Exit Client View
          </Button>
        </div>
      </div>
    )}
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            {showClientLogo ? (
              <img
                src={organization.logo_url}
                alt={organization.company_name}
                className="h-12 w-auto object-contain"
              />
            ) : (
              <img
                src={pmsLogo}
                alt="Protocol Management System"
                className="h-12 w-auto object-contain pms-main-logo"
                onError={(e) => {
                  // Fallback to icon if logo fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            )}
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg hidden">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {displayName}
                {!showClientLogo && <Cloud className="w-4 h-4 text-blue-600" />}
              </h1>
              <p className="text-xs text-gray-500">
                {showClientLogo ? 'Powered by Protocol Management System' : 'Professional Business Platform'}
              </p>
            </div>
          </div>
          
          {admin && (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-sm font-medium text-gray-900">{admin.username}</p>
                  {admin.role === 'super_admin' && (
                    <Badge className="bg-purple-600 text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Owner
                    </Badge>
                  )}
                  {admin.role === 'admin' && (
                    <Badge className="bg-blue-600 text-xs">Admin</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">{admin.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
