import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Mail, LogOut } from 'lucide-react';

interface SuspendedNoticeProps {
  companyName: string;
  reason: string;
  contactEmail: string;
  onLogout: () => void;
}

export default function SuspendedNotice({ companyName, reason, contactEmail, onLogout }: SuspendedNoticeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Account Suspended
        </h1>
        
        <div className="mb-6 space-y-2">
          <p className="text-gray-600">
            Access for <span className="font-semibold">{companyName}</span> has been temporarily suspended.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-1">Reason for Suspension</p>
              <p>{reason || 'Please contact support for details'}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3 text-left">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">To Restore Access</p>
              <p className="mb-2">
                Please contact Protocol Management System support:
              </p>
              <a 
                href={`mailto:${contactEmail}`}
                className="font-semibold underline hover:text-blue-900"
              >
                {contactEmail}
              </a>
            </div>
          </div>
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
