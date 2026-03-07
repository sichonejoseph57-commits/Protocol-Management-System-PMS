import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Shield, LogOut } from 'lucide-react';

interface PendingApprovalProps {
  username: string;
  email: string;
  onLogout: () => void;
}

export default function PendingApproval({ username, email, onLogout }: PendingApprovalProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10 text-yellow-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Pending Admin Approval
        </h1>
        
        <div className="mb-6 space-y-2">
          <p className="text-gray-600">
            Welcome, <span className="font-semibold">{username}</span>!
          </p>
          <p className="text-gray-600">
            Your account ({email}) has been created successfully.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3 text-left">
            <Shield className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Access Restricted</p>
              <p>
                Your admin access is pending approval from the system owner. 
                You will receive full access to the Protocol Management System once approved.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            Please contact the system administrator to request approval. 
            Once approved, you'll be able to manage employees, track time entries, and generate payroll reports.
          </p>
        </div>

        <Button
          onClick={onLogout}
          variant="outline"
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </Card>
    </div>
  );
}
