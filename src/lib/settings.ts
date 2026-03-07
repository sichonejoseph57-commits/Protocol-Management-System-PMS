import { supabase } from '@/lib/supabase';

export interface SystemSettings {
  overtimeThresholdDaily: number;
  overtimeRate: number;
  holidayRate: number;
  overtimeCalculationMethod: 'daily' | 'weekly';
}

export const getSystemSettings = async (): Promise<SystemSettings> => {
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value');
  
  if (error) {
    console.error('Error loading settings:', error);
    // Return defaults if error
    return {
      overtimeThresholdDaily: 8,
      overtimeRate: 1.5,
      holidayRate: 2.0,
      overtimeCalculationMethod: 'daily',
    };
  }

  const settings: SystemSettings = {
    overtimeThresholdDaily: 8,
    overtimeRate: 1.5,
    holidayRate: 2.0,
    overtimeCalculationMethod: 'daily',
  };

  data?.forEach(setting => {
    switch (setting.setting_key) {
      case 'overtime_threshold_daily':
        settings.overtimeThresholdDaily = parseFloat(setting.setting_value);
        break;
      case 'overtime_rate':
        settings.overtimeRate = parseFloat(setting.setting_value);
        break;
      case 'holiday_rate':
        settings.holidayRate = parseFloat(setting.setting_value);
        break;
      case 'overtime_calculation_method':
        settings.overtimeCalculationMethod = setting.setting_value as 'daily' | 'weekly';
        break;
    }
  });

  return settings;
};

export const updateSystemSetting = async (
  key: string,
  value: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from('system_settings')
    .update({
      setting_value: value,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('setting_key', key);
  
  if (error) throw new Error('Failed to update setting');
};

export const updateAllSettings = async (
  settings: SystemSettings,
  userId: string
): Promise<void> => {
  const updates = [
    { key: 'overtime_threshold_daily', value: settings.overtimeThresholdDaily.toString() },
    { key: 'overtime_rate', value: settings.overtimeRate.toString() },
    { key: 'holiday_rate', value: settings.holidayRate.toString() },
    { key: 'overtime_calculation_method', value: settings.overtimeCalculationMethod },
  ];

  for (const update of updates) {
    await updateSystemSetting(update.key, update.value, userId);
  }
};
