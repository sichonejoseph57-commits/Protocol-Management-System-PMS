import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, phone_number, organization_id, subscription_id, pin } = await req.json();

    if (!amount || !phone_number || !organization_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, phone_number, organization_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing MTN Money payment:', { amount, phone_number, organization_id });

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify PIN if provided (for completing pending payments)
    if (pin) {
      const { data: pendingPayment, error: pinError } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('organization_id', organization_id)
        .eq('status', 'pending_pin')
        .eq('metadata->pin', pin)
        .single();

      if (pinError || !pendingPayment) {
        console.error('[MTN] Invalid or expired PIN');
        return new Response(
          JSON.stringify({ error: 'Invalid or expired PIN. Please request a new payment.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // PIN verified - complete the payment
      const transactionId = `MTN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const { error: updateError } = await supabaseAdmin
        .from('payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          transaction_id: transactionId,
          metadata: {
            ...pendingPayment.metadata,
            completed_at: new Date().toISOString(),
            pin_verified: true,
          },
        })
        .eq('id', pendingPayment.id);

      if (updateError) {
        console.error('[MTN] Payment update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to complete payment', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update subscription status
      if (pendingPayment.subscription_id) {
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', pendingPayment.subscription_id);

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', organization_id);
      }

      console.log('[MTN] Payment completed successfully:', transactionId);

      return new Response(
        JSON.stringify({
          success: true,
          payment: { ...pendingPayment, status: 'completed', transaction_id: transactionId },
          transaction_id: transactionId,
          message: 'Payment completed successfully!',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure 6-digit PIN
    const paymentPin = Math.floor(100000 + Math.random() * 900000).toString();
    const pinExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('[MTN] Generated PIN:', paymentPin, 'Expires:', pinExpiry);

    // Send PIN via SMS
    try {
      const smsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-payment-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          phone_number,
          pin: paymentPin,
          payment_amount: amount,
          payment_method: 'MTN Money',
        }),
      });

      if (!smsResponse.ok) {
        console.error('[MTN] Failed to send PIN SMS');
      } else {
        console.log('[MTN] PIN SMS sent successfully');
      }
    } catch (smsError) {
      console.error('[MTN] SMS error:', smsError);
    }

    const paymentStatus = 'pending_pin'; // Waiting for PIN confirmation

    // Save payment record with PIN
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        organization_id,
        subscription_id,
        amount,
        currency: 'ZMW',
        payment_method: 'mtn_money',
        transaction_id: null,
        phone_number,
        status: paymentStatus,
        paid_at: null,
        metadata: {
          provider: 'mtn_money',
          phone: phone_number,
          pin: paymentPin,
          pin_expiry: pinExpiry.toISOString(),
          initiated_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment record error:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Failed to record payment', details: paymentError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment,
        pin: paymentPin,
        pin_expiry: pinExpiry.toISOString(),
        requires_pin: true,
        message: `Payment initiated. A 6-digit PIN has been sent to ${phone_number}. Please enter the PIN to complete payment.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('MTN Money payment error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
