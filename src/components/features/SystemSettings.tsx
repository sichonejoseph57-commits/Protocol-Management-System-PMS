import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save } from 'lucide-react';
import { getSystemSettings, updateAllSettings, SystemSettings } from '@/lib/settings';

interface SystemSettingsProps {
  userId: string;
}

export default function SystemSettingsComponent({ userId }: SystemSettingsProps) {
  const [settings, setSettings] = useState<SystemSettings>({
    overtimeThresholdDaily: 8,
    overtimeRate: 1.5,
    holidayRate: 2.0,
    overtimeCalculationMethod: 'daily',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await getSystemSettings();
      setSettings(data);
    } catch (error: any) {
      toast({
        title: 'Error loading settings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateAllSettings(settings, userId);
      toast({
        title: 'Success',
        description: 'System settings updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-primary" />
        <div>
          <h3 className="text-2xl font-bold text-gray-900">System Settings</h3>
          <p className="text-sm text-gray-600">Configure overtime and holiday pay calculations</p>
        </div>
      </div>

      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4 text-gray-900">Overtime Configuration</h4>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="overtime-method">Overtime Calculation Method</Label>
            <Select
              value={settings.overtimeCalculationMethod}
              onValueChange={(value: 'daily' | 'weekly') =>
                setSettings({ ...settings, overtimeCalculationMethod: value })
              }
            >
              <SelectTrigger id="overtime-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily (Hours over threshold per day)</SelectItem>
                <SelectItem value="weekly">Weekly (Hours over 40 per week)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">
              Choose how overtime hours are calculated
            </p>
          </div>

          <div>
            <Label htmlFor="overtime-threshold">Daily Overtime Threshold (Hours)</Label>
            <Input
              id="overtime-threshold"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={settings.overtimeThresholdDaily}
              onChange={(e) =>
                setSettings({ ...settings, overtimeThresholdDaily: parseFloat(e.target.value) || 8 })
              }
            />
            <p className="text-sm text-gray-500 mt-1">
              Hours worked per day before overtime pay applies
            </p>
          </div>

          <div>
            <Label htmlFor="overtime-rate">Overtime Rate Multiplier</Label>
            <Input
              id="overtime-rate"
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={settings.overtimeRate}
              onChange={(e) =>
                setSettings({ ...settings, overtimeRate: parseFloat(e.target.value) || 1.5 })
              }
            />
            <p className="text-sm text-gray-500 mt-1">
              Multiplier for overtime pay (e.g., 1.5 = time and a half, 2.0 = double time)
            </p>
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Example:</strong> With a {settings.overtimeRate}× multiplier, an employee earning ZMW 50/hour 
                would receive ZMW {(50 * settings.overtimeRate).toFixed(2)}/hour for overtime hours.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4 text-gray-900">Holiday Pay Configuration</h4>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="holiday-rate">Holiday Rate Multiplier</Label>
            <Input
              id="holiday-rate"
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={settings.holidayRate}
              onChange={(e) =>
                setSettings({ ...settings, holidayRate: parseFloat(e.target.value) || 2.0 })
              }
            />
            <p className="text-sm text-gray-500 mt-1">
              Multiplier for holiday pay (e.g., 2.0 = double time on public holidays)
            </p>
            <div className="mt-2 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Zambian Law Compliance:</strong> The current {settings.holidayRate}× rate for public holidays 
                ensures compliance with Zambian labor regulations.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
          size="lg"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
