import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * SMS Provider Integration for PIN Delivery
 * Configure with your local SMS gateway (e.g., Africa's Talking, Twilio, etc.)
 */

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, pin, payment_amount, payment_method } = await req.json();

    if (!phone_number || !pin) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: phone_number, pin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SMS] Sending PIN to ${phone_number}`);

    // Format SMS message
    const message = `Your Protocol Management System payment PIN is: ${pin}. Amount: ZMW ${payment_amount}. Method: ${payment_method}. Valid for 10 minutes. Do not share this PIN.`;

    // TODO: Integrate with your local SMS provider
    // Example for Africa's Talking (Zambia):
    /*
    const apiKey = Deno.env.get('AFRICASTALKING_API_KEY');
    const username = Deno.env.get('AFRICASTALKING_USERNAME');
    
    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'apiKey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username,
        to: phone_number,
        message,
        from: 'PMS',
      }),
    });
    */

    // For development/testing: Log instead of sending
    console.log('[SMS] PIN Message:', message);
    console.log('[SMS] To:', phone_number);

    // Simulate successful SMS send
    return new Response(
      JSON.stringify({
        success: true,
        message: 'PIN sent successfully',
        // In production, include SMS provider response details
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[SMS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send PIN' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
