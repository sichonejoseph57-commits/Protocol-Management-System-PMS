
import { supabase } from './supabase';
import { generateUniqueSubdomain } from './subdomain';

export async function uploadEmployeePhoto(file: File, employeeId: string): Promise<string> {
  // Validate file type (security requirement: only images)
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validImageTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG, and WEBP images are allowed.');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size too large. Maximum size is 5MB.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${employeeId}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('employee-photos')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error(`Failed to upload photo: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from('employee-photos')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function uploadOrganizationLogo(file: File, organizationId: string): Promise<string> {
  // Validate file type (security requirement: only images)
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
  if (!validImageTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG, SVG, and WEBP images are allowed.');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size too large. Maximum size is 5MB.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${organizationId}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('organization-logos')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error(`Failed to upload logo: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from('organization-logos')
    .getPublicUrl(filePath);

  // Update organization logo_url and timestamp
  await supabase
    .from('organizations')
    .update({ 
      logo_url: data.publicUrl,
      logo_uploaded_at: new Date().toISOString()
    })
    .eq('id', organizationId);

  return data.publicUrl;
}

export async function getOrganization(organizationId: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrganization(organizationId: string, updates: any) {
  const { data, error } = await supabase
    .from('organizations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', organizationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function suspendOrganization(organizationId: string, reason: string) {
  return updateOrganization(organizationId, {
    subscription_status: 'suspended',
    suspended_at: new Date().toISOString(),
    suspension_reason: reason,
  });
}

export async function activateOrganization(organizationId: string) {
  return updateOrganization(organizationId, {
    subscription_status: 'active',
    suspended_at: null,
    suspension_reason: null,
  });
}

export async function createOrganization(
  companyName: string,
  contactEmail: string,
  contactPhone?: string,
  logoFile?: File
): Promise<string> {
  // Auto-generate unique subdomain from company name
  const subdomain = await generateUniqueSubdomain(companyName, supabase);
  
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      company_name: companyName,
      subdomain,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      subscription_status: 'trial',
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days trial
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to create organization: ${error.message}`);
  
  // Upload logo if provided
  if (logoFile && data.id) {
    try {
      await uploadOrganizationLogo(logoFile, data.id);
    } catch (logoError: any) {
      console.error('Logo upload failed:', logoError);
      // Don't fail the entire operation if logo upload fails
    }
  }
  
  return data.id;
}

export async function getAllOrganizations() {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Alias for backward compatibility
export const getOrganizations = getAllOrganizations;

export async function getPlatformStats() {
  // Calculate stats from organizations table since platform_stats view might not exist
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('subscription_status');
  
  if (orgsError) {
    console.error('Failed to load organizations:', orgsError);
    return {
      total_clients: 0,
      active_clients: 0,
      trial_clients: 0,
      suspended_clients: 0,
      total_employees: 0,
      total_revenue: 0,
      monthly_revenue: 0,
      pending_revenue: 0,
    };
  }
  
  const stats = {
    total_clients: orgs?.length || 0,
    active_clients: orgs?.filter(o => o.subscription_status === 'active').length || 0,
    trial_clients: orgs?.filter(o => o.subscription_status === 'trial').length || 0,
    suspended_clients: orgs?.filter(o => o.subscription_status === 'suspended').length || 0,
    total_employees: 0,
    total_revenue: 0,
    monthly_revenue: 0,
    pending_revenue: 0,
  };
  
  return stats;
}

export async function getActiveSubscription(organizationId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.log('No active subscription found');
    return null;
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    planName: data.plan_name,
    billingCycle: data.billing_cycle,
    employeeCount: data.employee_count,
    amount: parseFloat(data.amount),
    currency: data.currency,
    status: data.status,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Calculate tiered subscription price based on employee count
export function calculateTieredPrice(employeeCount: number): { amount: number; tierName: string } {
  let amount: number;
  let tierName: string;

  if (employeeCount <= 10) {
    amount = 350;
    tierName = 'Starter (1-10 employees)';
  } else if (employeeCount <= 30) {
    amount = 1500;
    tierName = 'Growth (11-30 employees)';
  } else if (employeeCount <= 100) {
    amount = 3000;
    tierName = 'Professional (31-100 employees)';
  } else if (employeeCount <= 400) {
    amount = 6000;
    tierName = 'Enterprise (200-400 employees)';
  } else {
    amount = 6000;
    tierName = 'Custom (400+ employees)';
  }

  return { amount, tierName };
}

export async function createSubscription(
  organizationId: string,
  employeeCount: number,
  billingCycle: 'monthly' | 'quarterly' | 'annually' = 'monthly'
) {
  const { amount, tierName } = calculateTieredPrice(employeeCount);
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date();
  
  switch (billingCycle) {
    case 'monthly':
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      break;
    case 'quarterly':
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3);
      break;
    case 'annually':
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      break;
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      organization_id: organizationId,
      plan_name: tierName,
      billing_cycle: billingCycle,
      employee_count: employeeCount,
      amount,
      currency: 'ZMW',
      status: 'active',
      current_period_start: currentPeriodStart.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    organizationId: data.organization_id,
    planName: data.plan_name,
    billingCycle: data.billing_cycle,
    employeeCount: data.employee_count,
    amount: parseFloat(data.amount),
    currency: data.currency,
    status: data.status,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getPaymentHistory(organizationId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payment history:', error);
    return [];
  }

  return data.map((payment: any) => ({
    id: payment.id,
    organizationId: payment.organization_id,
    subscriptionId: payment.subscription_id,
    amount: parseFloat(payment.amount),
    currency: payment.currency,
    paymentMethod: payment.payment_method,
    transactionId: payment.transaction_id,
    phoneNumber: payment.phone_number,
    status: payment.status,
    metadata: payment.metadata,
    paidAt: payment.paid_at,
    createdAt: payment.created_at,
  }));
}

// OWNER ACCOUNT: All payments route to this number
const OWNER_PAYMENT_ACCOUNT = '0772739988';

export async function processAirtelMoneyPayment(
  organizationId: string,
  subscriptionId: string,
  amount: number,
  phoneNumber: string,
  pin?: string
): Promise<{ success: boolean; requires_pin?: boolean; pin?: string; pin_expiry?: string; transactionId?: string; message?: string; error?: string }> {
  try {
    console.log(`[Payment] Processing Airtel Money payment: ${amount} ZMW from ${phoneNumber} to ${OWNER_PAYMENT_ACCOUNT}`);
    
    const { data, error } = await supabase.functions.invoke('airtel-money-payment', {
      body: {
        organization_id: organizationId,
        subscription_id: subscriptionId,
        amount,
        phone_number: phoneNumber,
        recipient_account: OWNER_PAYMENT_ACCOUNT, // Owner account
        pin,
      },
    });

    if (error) {
      console.error('[Payment] Airtel Money error:', error);
      throw error;
    }

    console.log('[Payment] Airtel Money response:', data);
    return {
      success: true,
      requires_pin: data.requires_pin,
      pin: data.pin,
      pin_expiry: data.pin_expiry,
      transactionId: data.transaction_id,
      message: data.message,
    };
  } catch (error: any) {
    console.error('[Payment] Airtel Money payment error:', error);
    return {
      success: false,
      error: error.message || 'Payment failed. Please try again.',
    };
  }
}

export async function processMTNMoneyPayment(
  organizationId: string,
  subscriptionId: string,
  amount: number,
  phoneNumber: string,
  pin?: string
): Promise<{ success: boolean; requires_pin?: boolean; pin?: string; pin_expiry?: string; transactionId?: string; message?: string; error?: string }> {
  try {
    console.log(`[Payment] Processing MTN Money payment: ${amount} ZMW from ${phoneNumber} to ${OWNER_PAYMENT_ACCOUNT}`);
    
    const { data, error } = await supabase.functions.invoke('mtn-money-payment', {
      body: {
        organization_id: organizationId,
        subscription_id: subscriptionId,
        amount,
        phone_number: phoneNumber,
        recipient_account: OWNER_PAYMENT_ACCOUNT, // Owner account
        pin,
      },
    });

    if (error) {
      console.error('[Payment] MTN Money error:', error);
      throw error;
    }

    console.log('[Payment] MTN Money response:', data);
    return {
      success: true,
      requires_pin: data.requires_pin,
      pin: data.pin,
      pin_expiry: data.pin_expiry,
      transactionId: data.transaction_id,
      message: data.message,
    };
  } catch (error: any) {
    console.error('[Payment] MTN Money payment error:', error);
    return {
      success: false,
      error: error.message || 'Payment failed. Please try again.',
    };
  }
}
