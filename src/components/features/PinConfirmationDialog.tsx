import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Clock, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { formatCurrency } from '@/lib/payroll';

interface PinConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => Promise<void>;
  paymentDetails: {
    amount: number;
    phone: string;
    method: 'airtel_money' | 'mtn_money';
    pin: string;
    pinExpiry: string;
  } | null;
  isProcessing: boolean;
}

export default function PinConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  paymentDetails,
  isProcessing,
}: PinConfirmationDialogProps) {
  const [pin, setPin] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paymentDetails) return;

    // Calculate time remaining
    const expiry = new Date(paymentDetails.pinExpiry).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
    setTimeRemaining(remaining);

    // Countdown timer
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentDetails]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 6) {
      setError('PIN must be 6 digits');
      return;
    }

    if (timeRemaining === 0) {
      setError('PIN expired. Please request a new payment.');
      return;
    }

    try {
      await onConfirm(pin);
      setPin('');
    } catch (err: any) {
      setError(err.message || 'Failed to verify PIN');
    }
  };

  const handleCancel = () => {
    setPin('');
    setError('');
    onClose();
  };

  if (!paymentDetails) return null;

  const methodName = paymentDetails.method === 'airtel_money' ? 'Airtel Money' : 'MTN Money';

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Payment PIN Confirmation
          </DialogTitle>
          <DialogDescription>
            Enter the 6-digit PIN sent to your phone to complete payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Payment Details</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <p><strong>Amount:</strong> {formatCurrency(paymentDetails.amount)}</p>
              <p><strong>Method:</strong> {methodName}</p>
              <p><strong>Phone:</strong> {paymentDetails.phone}</p>
            </div>
          </div>

          {/* PIN Display for Testing/Development */}
          <Alert className="bg-yellow-50 border-yellow-300">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Your Payment PIN:</strong>{' '}
              <span className="font-mono text-lg font-bold">{paymentDetails.pin}</span>
              <br />
              <span className="text-xs">
                (In production, this will only be sent via SMS)
              </span>
            </AlertDescription>
          </Alert>

          {/* Timer */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className={`w-4 h-4 ${timeRemaining < 60 ? 'text-red-600' : 'text-gray-600'}`} />
            <span className={timeRemaining < 60 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
              Time remaining: {formatTime(timeRemaining)}
            </span>
          </div>

          {/* PIN Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pin">Enter 6-Digit PIN</Label>
              <Input
                id="pin"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setPin(value);
                  setError('');
                }}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
                disabled={isProcessing || timeRemaining === 0}
                autoFocus
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {timeRemaining === 0 && (
              <Alert variant="destructive">
                <X className="w-4 h-4" />
                <AlertDescription>
                  PIN expired. Please close this dialog and request a new payment.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel Payment
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || pin.length !== 6 || timeRemaining === 0}
                className="flex-1 gap-2"
              >
                {isProcessing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm Payment
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Security Notice */}
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription className="text-xs text-gray-600">
              Never share your PIN with anyone. Protocol Management System will never ask for your PIN via email or phone.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
