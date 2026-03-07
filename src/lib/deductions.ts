import { supabase } from './supabase';
import { Deduction, EmployeeDeduction } from '@/types';

export const getDeductions = async (organizationId?: string): Promise<Deduction[]> => {
  let query = supabase
    .from('deductions')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Failed to load deductions: ${error.message}`);
  
  return (data || []).map(d => ({
    id: d.id,
    organizationId: d.organization_id,
    name: d.name,
    type: d.type,
    isPercentage: d.is_percentage,
    amount: parseFloat(d.amount),
    description: d.description,
    isActive: d.is_active,
    createdBy: d.created_by,
    createdAt: d.created_at,
  }));
};

export const saveDeduction = async (
  deduction: Partial<Deduction>,
  userId: string,
  organizationId: string
): Promise<void> => {
  const dbDeduction: any = {
    organization_id: organizationId,
    name: deduction.name,
    type: deduction.type,
    is_percentage: deduction.isPercentage,
    amount: deduction.amount,
    description: deduction.description || null,
    is_active: deduction.isActive !== false,
    created_by: userId,
  };

  const { error } = await supabase
    .from('deductions')
    .upsert(deduction.id ? { ...dbDeduction, id: deduction.id } : dbDeduction);
  
  if (error) throw new Error(`Failed to save deduction: ${error.message}`);
};

export const deleteDeduction = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('deductions')
    .update({ is_active: false })
    .eq('id', id);
  
  if (error) throw new Error(`Failed to delete deduction: ${error.message}`);
};

export const getEmployeeDeductions = async (employeeId: string): Promise<EmployeeDeduction[]> => {
  const { data, error } = await supabase
    .from('employee_deductions')
    .select('*')
    .eq('employee_id', employeeId);
  
  if (error) throw new Error(`Failed to load employee deductions: ${error.message}`);
  
  return (data || []).map(d => ({
    id: d.id,
    employeeId: d.employee_id,
    deductionId: d.deduction_id,
    amountOverride: d.amount_override ? parseFloat(d.amount_override) : undefined,
    appliedFrom: d.applied_from,
    appliedUntil: d.applied_until,
    createdBy: d.created_by,
    createdAt: d.created_at,
  }));
};

export const applyDeductionsToEmployees = async (
  employeeIds: string[],
  deductionId: string,
  userId: string,
  amountOverride?: number
): Promise<void> => {
  const appliedFrom = new Date().toISOString().split('T')[0];
  
  const records = employeeIds.map(empId => ({
    employee_id: empId,
    deduction_id: deductionId,
    amount_override: amountOverride || null,
    applied_from: appliedFrom,
    created_by: userId,
  }));

  const { error } = await supabase
    .from('employee_deductions')
    .upsert(records, { onConflict: 'employee_id,deduction_id' });
  
  if (error) throw new Error(`Failed to apply deductions: ${error.message}`);
};

export const calculateDeductions = (
  grossPay: number,
  deductions: Deduction[],
  employeeDeductions: EmployeeDeduction[]
): { totalDeductions: number; deductionBreakdown: { name: string; amount: number }[] } => {
  let totalDeductions = 0;
  const deductionBreakdown: { name: string; amount: number }[] = [];
  
  deductions.forEach(deduction => {
    const empDeduction = employeeDeductions.find(ed => ed.deductionId === deduction.id);
    if (!empDeduction) return;
    
    let amount = 0;
    
    if (empDeduction.amountOverride !== undefined) {
      amount = empDeduction.amountOverride;
    } else if (deduction.isPercentage) {
      amount = (grossPay * deduction.amount) / 100;
    } else {
      amount = deduction.amount;
    }
    
    totalDeductions += amount;
    deductionBreakdown.push({ name: deduction.name, amount });
  });
  
  return { totalDeductions, deductionBreakdown };
};
