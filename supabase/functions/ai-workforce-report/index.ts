import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id, period = 'monthly' } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'Missing organization_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI Workforce Report for organization:', organization_id, 'Period:', period);

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'quarterly') {
      startDate.setMonth(startDate.getMonth() - 3);
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Fetch data
    const [{ data: timeEntries }, { data: employees }, { data: departments }] = await Promise.all([
      supabaseAdmin
        .from('time_entries')
        .select('*')
        .eq('organization_id', organization_id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]),
      supabaseAdmin
        .from('employees')
        .select('*')
        .eq('organization_id', organization_id),
      supabaseAdmin
        .from('departments')
        .select('name')
        .eq('organization_id', organization_id),
    ]);

    if (!timeEntries || timeEntries.length === 0) {
      return new Response(
        JSON.stringify({
          report: 'Not enough data to generate a comprehensive workforce report for this period.',
          insights: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate statistics
    const totalHours = timeEntries.reduce((sum: number, e: any) => sum + parseFloat(e.total_hours), 0);
    const totalPay = timeEntries.reduce((sum: number, e: any) => sum + parseFloat(e.total_pay), 0);
    const overtimePay = timeEntries.reduce((sum: number, e: any) => sum + parseFloat(e.overtime_pay), 0);
    const holidayHours = timeEntries.filter((e: any) => e.is_holiday).reduce((sum: number, e: any) => sum + parseFloat(e.total_hours), 0);

    // Department breakdown
    const deptStats = new Map();
    timeEntries.forEach((entry: any) => {
      const employee = employees?.find((e: any) => e.id === entry.employee_id);
      if (employee) {
        const dept = employee.department;
        if (!deptStats.has(dept)) {
          deptStats.set(dept, { hours: 0, pay: 0, employees: new Set() });
        }
        const stats = deptStats.get(dept);
        stats.hours += parseFloat(entry.total_hours);
        stats.pay += parseFloat(entry.total_pay);
        stats.employees.add(entry.employee_id);
      }
    });

    const departmentBreakdown = Array.from(deptStats.entries()).map(([dept, stats]: [any, any]) => ({
      department: dept,
      totalHours: stats.hours.toFixed(1),
      totalPay: stats.pay.toFixed(2),
      employeeCount: stats.employees.size,
      avgHoursPerEmployee: (stats.hours / stats.employees.size).toFixed(1),
    }));

    // Employee productivity
    const empStats = new Map();
    timeEntries.forEach((entry: any) => {
      if (!empStats.has(entry.employee_id)) {
        empStats.set(entry.employee_id, {
          name: entry.employee_name,
          hours: 0,
          days: 0,
          overtime: 0,
        });
      }
      const stats = empStats.get(entry.employee_id);
      stats.hours += parseFloat(entry.total_hours);
      stats.days += 1;
      stats.overtime += parseFloat(entry.overtime_pay);
    });

    const topPerformers = Array.from(empStats.entries())
      .map(([id, stats]: [any, any]) => ({
        employee: stats.name,
        totalHours: stats.hours.toFixed(1),
        daysWorked: stats.days,
        avgHoursPerDay: (stats.hours / stats.days).toFixed(1),
      }))
      .sort((a, b) => parseFloat(b.totalHours) - parseFloat(a.totalHours))
      .slice(0, 5);

    // Build analysis data
    const analysisData = {
      period: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
      summary: {
        totalEmployees: employees?.length || 0,
        activeEmployees: employees?.filter((e: any) => e.status === 'active').length || 0,
        totalHoursWorked: totalHours.toFixed(1),
        totalPayroll: totalPay.toFixed(2),
        overtimePayroll: overtimePay.toFixed(2),
        holidayHours: holidayHours.toFixed(1),
        avgHoursPerEmployee: (totalHours / (employees?.length || 1)).toFixed(1),
      },
      departmentBreakdown,
      topPerformers,
    };

    const prompt = `As an HR analytics expert, analyze this workforce data and create a comprehensive natural language report:

${JSON.stringify(analysisData, null, 2)}

Create a detailed report that includes:
1. Executive Summary (2-3 sentences on overall workforce performance)
2. Key Insights (3-5 bullet points highlighting important trends, patterns, or concerns)
3. Department Analysis (brief analysis of department performance differences)
4. Productivity Trends (observations about employee productivity and hours worked)
5. Cost Analysis (insights on payroll, overtime, and labor costs)
6. Recommendations (3-5 actionable recommendations for workforce optimization)

Write in clear, professional business language. Use specific numbers from the data.`;

    // Call OnSpace AI
    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a senior HR analytics consultant specializing in workforce intelligence and operational insights. Create comprehensive, actionable workforce reports.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OnSpace AI error:', errorText);
      throw new Error(`AI report generation failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const report = aiData.choices?.[0]?.message?.content ?? 'Unable to generate report.';

    return new Response(
      JSON.stringify({
        report,
        data: analysisData,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('AI Workforce Report error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
