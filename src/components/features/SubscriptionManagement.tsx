import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Smartphone, DollarSign, Calendar, CheckCircle, Clock } from 'lucide-react';
import PinConfirmationDialog from './PinConfirmationDialog';
import {
  getActiveSubscription,
  getPaymentHistory,
  createSubscription,
  processAirtelMoneyPayment,
  processMTNMoneyPayment,
  calculateTieredPrice,
} from '@/lib/organization';
import { Subscription, Payment } from '@/types';
import { formatCurrency } from '@/lib/payroll';

interface SubscriptionManagementProps {
  organizationId: string;
  employeeCount: number;
}

export default function SubscriptionManagement({
  organizationId,
  employeeCount,
}: SubscriptionManagementProps) {
  const { amount: tieredPrice, tierName } = calculateTieredPrice(employeeCount);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'annually'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'airtel_money' | 'mtn_money'>('airtel_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [subData, paymentsData] = await Promise.all([
        getActiveSubscription(organizationId),
        getPaymentHistory(organizationId),
      ]);
      setSubscription(subData);
      setPayments(paymentsData);
    } catch (error: any) {
      toast({
        title: 'Error loading subscription data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAmount = () => {
    switch (billingCycle) {
      case 'quarterly':
        return tieredPrice * 3;
      case 'annually':
        return tieredPrice * 12 * 0.9; // 10% discount for annual
      default:
        return tieredPrice;
    }
  };

  const handlePayment = async () => {
    if (!phoneNumber) {
      toast({
        title: 'Phone number required',
        description: 'Please enter your mobile money number',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      const amount = calculateAmount();

      // Create or update subscription
      let subscriptionId = subscription?.id;
      if (!subscriptionId) {
        const newSub = await createSubscription(
          organizationId,
          employeeCount,
          billingCycle
        );
        subscriptionId = newSub.id;
      }

      // Initiate payment (generates PIN and sends SMS)
      const result = paymentMethod === 'airtel_money'
        ? await processAirtelMoneyPayment(organizationId, subscriptionId, amount, phoneNumber)
        : await processMTNMoneyPayment(organizationId, subscriptionId, amount, phoneNumber);

      if (result.success && result.requires_pin) {
        // Show PIN confirmation dialog
        setPendingPayment({
          amount,
          phone: phoneNumber,
          method: paymentMethod,
          pin: result.pin,
          pinExpiry: result.pin_expiry,
          subscriptionId,
        });
        setShowPinDialog(true);
        toast({
          title: 'PIN Sent',
          description: result.message,
        });
      } else if (result.success) {
        toast({
          title: 'Payment completed',
          description: 'Your subscription has been activated',
        });
        await loadData();
      } else {
        toast({
          title: 'Payment failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePinConfirmation = async (pin: string) => {
    if (!pendingPayment) return;

    try {
      setIsProcessing(true);

      // Submit PIN to complete payment
      const result = pendingPayment.method === 'airtel_money'
        ? await processAirtelMoneyPayment(
            organizationId,
            pendingPayment.subscriptionId,
            pendingPayment.amount,
            pendingPayment.phone,
            pin
          )
        : await processMTNMoneyPayment(
            organizationId,
            pendingPayment.subscriptionId,
            pendingPayment.amount,
            pendingPayment.phone,
            pin
          );

      if (result.success) {
        toast({
          title: 'Payment Successful!',
          description: 'Your subscription has been activated',
        });
        setShowPinDialog(false);
        setPendingPayment(null);
        setPhoneNumber('');
        await loadData();
      } else {
        throw new Error(result.error || 'Invalid PIN');
      }
    } catch (error: any) {
      toast({
        title: 'PIN Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const amount = calculateAmount();

  return (
    <div className="space-y-6">
      {/* Pricing Tiers Overview */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Tiered Pricing Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg ${employeeCount <= 10 ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            <p className="text-sm font-medium mb-1">Starter</p>
            <p className="text-2xl font-bold">350 ZMW</p>
            <p className="text-xs opacity-80">1-10 employees</p>
          </div>
          <div className={`p-4 rounded-lg ${employeeCount > 10 && employeeCount <= 30 ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            <p className="text-sm font-medium mb-1">Growth</p>
            <p className="text-2xl font-bold">1,500 ZMW</p>
            <p className="text-xs opacity-80">11-30 employees</p>
          </div>
          <div className={`p-4 rounded-lg ${employeeCount > 30 && employeeCount <= 100 ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            <p className="text-sm font-medium mb-1">Professional</p>
            <p className="text-2xl font-bold">3,000 ZMW</p>
            <p className="text-xs opacity-80">31-100 employees</p>
          </div>
          <div className={`p-4 rounded-lg ${employeeCount > 100 ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            <p className="text-sm font-medium mb-1">Enterprise</p>
            <p className="text-2xl font-bold">6,000 ZMW</p>
            <p className="text-xs opacity-80">200-400 employees</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-700 font-medium">Your Plan</p>
              <p className="text-lg font-bold text-blue-900">{tierName}</p>
              <p className="text-sm text-blue-600">{formatCurrency(tieredPrice)}/month</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-green-700 font-medium">Active Employees</p>
              <p className="text-2xl font-bold text-green-900">{employeeCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-sm text-amber-700 font-medium">Billing Amount</p>
              <p className="text-2xl font-bold text-amber-900">
                {formatCurrency(amount)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {subscription && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Current Subscription</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Plan</p>
              <p className="font-medium">{subscription.planName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Billing Cycle</p>
              <p className="font-medium capitalize">{subscription.billingCycle}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <Badge className="bg-green-100 text-green-800 capitalize">
                {subscription.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Next Payment</p>
              <p className="font-medium">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Make Payment</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="billing-cycle">Billing Cycle</Label>
              <Select value={billingCycle} onValueChange={(value: any) => setBillingCycle(value)}>
                <SelectTrigger id="billing-cycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually (10% discount)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="airtel_money">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Airtel Money
                    </div>
                  </SelectItem>
                  <SelectItem value="mtn_money">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      MTN Money
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="phone-number">Mobile Money Phone Number</Label>
            <Input
              id="phone-number"
              type="tel"
              placeholder="e.g., 0977123456"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Amount to pay:</strong> {formatCurrency(amount)} ({billingCycle})
              <br />
              <strong>Your tier:</strong> {tierName} - {employeeCount} employees
            </p>
          </div>

          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full gap-2"
            size="lg"
          >
            <CreditCard className="w-5 h-5" />
            {isProcessing ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Payment History</h3>
        {payments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No payment history yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Transaction ID
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">
                      {payment.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-xs">
                      {payment.transactionId || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          payment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {payment.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* PIN Confirmation Dialog */}
      <PinConfirmationDialog
        isOpen={showPinDialog}
        onClose={() => {
          setShowPinDialog(false);
          setPendingPayment(null);
        }}
        onConfirm={handlePinConfirmation}
        paymentDetails={pendingPayment}
        isProcessing={isProcessing}
      />
    </div>
  );
}
