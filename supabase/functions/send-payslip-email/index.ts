import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { employee_email, employee_name, company_name, payroll_data } = await req.json();

    if (!employee_email || !employee_name || !payroll_data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate payslip HTML
    const html = generatePayslipHTML(employee_name, company_name, payroll_data);

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // For now, just log and return success
    console.log(`Would send email to ${employee_email} for ${employee_name}`);
    console.log('Payroll data:', payroll_data);

    // Example SendGrid integration (uncomment and configure):
    /*
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: employee_email, name: employee_name }],
          subject: `Payslip for ${payroll_data.month} - ${company_name}`,
        }],
        from: { email: 'noreply@pms.app', name: company_name },
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid error: ${await response.text()}`);
    }
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Payslip sent to ${employee_email}` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Send payslip email error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generatePayslipHTML(employeeName: string, companyName: string, payrollData: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payslip</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .payslip { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f3f4f6; font-weight: bold; }
    .total { background: #e5e7eb; font-weight: bold; font-size: 1.1em; }
  </style>
</head>
<body>
  <div class="payslip">
    <div class="header">
      <h1>${companyName}</h1>
      <p>Monthly Payslip</p>
    </div>
    <div class="content">
      <h2>Employee: ${employeeName}</h2>
      <p>Period: ${payrollData.month}</p>
      
      <table>
        <tr>
          <th>Description</th>
          <th style="text-align: right;">Amount (ZMW)</th>
        </tr>
        <tr>
          <td>Regular Pay (${payrollData.regularHours?.toFixed(2)} hours)</td>
          <td style="text-align: right;">${payrollData.regularPay?.toFixed(2)}</td>
        </tr>
        ${payrollData.holidayPay > 0 ? `
        <tr>
          <td>Holiday Pay (${payrollData.holidayHours?.toFixed(2)} hours @ 2x)</td>
          <td style="text-align: right;">${payrollData.holidayPay?.toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr class="total">
          <td>Gross Pay</td>
          <td style="text-align: right;">${payrollData.totalPay?.toFixed(2)}</td>
        </tr>
        ${payrollData.totalDeductions > 0 ? `
        <tr>
          <td>Total Deductions</td>
          <td style="text-align: right; color: red;">-${payrollData.totalDeductions?.toFixed(2)}</td>
        </tr>
        <tr class="total" style="background: #10b981; color: white;">
          <td>Net Pay</td>
          <td style="text-align: right;">${(payrollData.netPay || payrollData.totalPay)?.toFixed(2)}</td>
        </tr>
        ` : ''}
      </table>
      
      <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
        This is a computer-generated payslip. No signature is required.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
