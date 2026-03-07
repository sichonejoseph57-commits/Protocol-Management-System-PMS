import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AIWorkforceReportProps {
  organizationId: string;
}

export default function AIWorkforceReport({ organizationId }: AIWorkforceReportProps) {
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'annually'>('monthly');
  const [report, setReport] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateReport = async () => {
    try {
      setIsGenerating(true);

      const { data: result, error } = await supabase.functions.invoke('ai-workforce-report', {
        body: { organization_id: organizationId, period },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate report');
      }

      setReport(result.report);
      setData(result.data);

      toast({
        title: 'Report Generated',
        description: `AI-powered ${period} workforce report is ready`,
      });
    } catch (error: any) {
      console.error('Report generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const content = `
WORKFORCE ANALYTICS REPORT
Generated: ${new Date().toLocaleString()}
Period: ${period.charAt(0).toUpperCase() + period.slice(1)}

${report}

---
RAW DATA SUMMARY
${JSON.stringify(data, null, 2)}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workforce-report-${period}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Downloaded',
      description: 'Workforce report saved successfully',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            AI Workforce Analytics Report
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Automated natural language insights on productivity, costs, and trends
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={generateReport}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </div>

      {report ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h4 className="font-semibold text-gray-900">
                {period.charAt(0).toUpperCase() + period.slice(1)} Workforce Report
              </h4>
            </div>
            <Button onClick={downloadReport} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>

          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {report}
            </div>
          </div>

          {data && (
            <div className="mt-6 pt-6 border-t">
              <h5 className="font-semibold text-gray-900 mb-3">Data Summary</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">Total Employees</p>
                  <p className="text-lg font-bold text-gray-900">
                    {data.summary.totalEmployees}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">Total Hours</p>
                  <p className="text-lg font-bold text-gray-900">
                    {data.summary.totalHoursWorked}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">Total Payroll</p>
                  <p className="text-lg font-bold text-gray-900">
                    ZMW {data.summary.totalPayroll}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">Overtime Pay</p>
                  <p className="text-lg font-bold text-gray-900">
                    ZMW {data.summary.overtimePayroll}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            AI-Powered Insights Awaiting
          </h4>
          <p className="text-gray-600 mb-4">
            Generate a comprehensive natural language report analyzing workforce productivity,
            department performance, cost trends, and actionable recommendations.
          </p>
          <p className="text-sm text-gray-500">
            Select a time period and click "Generate Report"
          </p>
        </Card>
      )}
    </div>
  );
}
