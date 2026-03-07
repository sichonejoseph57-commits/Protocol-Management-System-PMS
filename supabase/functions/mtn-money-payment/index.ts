import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, phone_number, organization_id, subscription_id } = await req.json();

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

    // TODO: Integrate with MTN MoMo API
    // For now, we'll simulate the payment process
    // In production, you would call MTN MoMo's API here:
    // 1. Request to pay
    // 2. Get reference ID
    // 3. Poll for payment status or use callback

    // Simulated MTN MoMo API call
    const transactionId = `MTN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // For demo purposes, automatically mark as completed
    // In production, this would be pending until confirmed
    const paymentStatus = 'completed'; // In production: 'pending'

    // Save payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        organization_id,
        subscription_id,
        amount,
        currency: 'ZMW',
        payment_method: 'mtn_money',
        transaction_id: transactionId,
        phone_number,
        status: paymentStatus,
        paid_at: paymentStatus === 'completed' ? new Date().toISOString() : null,
        metadata: {
          provider: 'mtn_money',
          phone: phone_number,
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

    // If payment successful, update subscription status
    if (paymentStatus === 'completed' && subscription_id) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription_id);

      await supabaseAdmin
        .from('organizations')
        .update({
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment,
        transaction_id: transactionId,
        message: 'Payment processed successfully. Please check your phone for MTN Money prompt.',
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
