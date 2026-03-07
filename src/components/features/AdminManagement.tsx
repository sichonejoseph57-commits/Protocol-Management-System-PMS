import { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getAllUsers, approveAdmin, revokeAdmin } from '@/lib/database';
import { UserCheck, UserX, Shield, Clock, Mail, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AdminManagementProps {
  currentUserId: string;
}

export default function AdminManagement({ currentUserId }: AdminManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error: any) {
      toast({
        title: 'Error loading users',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await approveAdmin(userId, currentUserId);
      toast({
        title: 'Success',
        description: 'Admin access granted successfully',
      });
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRevoke = async (userId: string) => {
    try {
      await revokeAdmin(userId);
      toast({
        title: 'Success',
        description: 'Admin access revoked successfully',
      });
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string, isActive: boolean) => {
    if (role === 'super_admin') {
      return <Badge className="bg-purple-600">Super Admin</Badge>;
    }
    if (role === 'admin' && isActive) {
      return <Badge className="bg-blue-600">Admin</Badge>;
    }
    return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending Approval</Badge>;
  };

  const pendingUsers = users.filter(u => u.role === 'pending');
  const activeAdmins = users.filter(u => u.role === 'admin' && u.is_active);
  const superAdmin = users.find(u => u.role === 'super_admin');

  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Super Admin</p>
              <p className="text-2xl font-bold">1</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Active Admins</p>
              <p className="text-2xl font-bold">{activeAdmins.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold">{pendingUsers.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Pending Admin Requests</h3>
          <div className="space-y-3">
            {pendingUsers.map(user => (
              <Card key={user.id} className="p-4 border-l-4 border-l-yellow-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{user.username}</p>
                        {getRoleBadge(user.role, user.is_active)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleApprove(user.id)}
                    className="gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    Approve Admin Access
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Users */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">All Users</h3>
        <div className="space-y-2">
          {/* Super Admin */}
          {superAdmin && (
            <Card className="p-4 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{superAdmin.username}</p>
                      {getRoleBadge(superAdmin.role, superAdmin.is_active)}
                      {superAdmin.id === currentUserId && (
                        <Badge variant="outline">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {superAdmin.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDistanceToNow(new Date(superAdmin.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                  System Owner
                </Badge>
              </div>
            </Card>
          )}

          {/* Active Admins */}
          {activeAdmins.map(user => (
            <Card key={user.id} className="p-4 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{user.username}</p>
                      {getRoleBadge(user.role, user.is_active)}
                      {user.id === currentUserId && (
                        <Badge variant="outline">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleRevoke(user.id)}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  <UserX className="w-4 h-4" />
                  Revoke Access
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
