import { useState } from 'react';
import { TimeEntry } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { formatCurrency } from '@/lib/payroll';
import { exportTimeEntries } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';

interface TimeEntryTableProps {
  timeEntries: TimeEntry[];
}

export default function TimeEntryTable({ timeEntries }: TimeEntryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  const filteredEntries = timeEntries.filter((entry) => {
    const matchesSearch =
      entry.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.enteredBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStartDate = !startDate || entry.date >= startDate;
    const matchesEndDate = !endDate || entry.date <= endDate;
    
    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const handleExport = () => {
    try {
      exportTimeEntries(timeEntries, {
        employeeName: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      toast({
        title: 'Success',
        description: `Exported ${filteredEntries.length} time entries to CSV`,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Sort by date descending
  const sortedEntries = [...filteredEntries].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search by employee or admin name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative w-[160px]">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="pl-10"
            placeholder="Start date"
          />
        </div>
        <div className="relative w-[160px]">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="pl-10"
            placeholder="End date"
          />
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Hours / Break
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Pay
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Entered By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No time entries found
                  </td>
                </tr>
              ) : (
                sortedEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{formatDate(entry.date)}</p>
                        {entry.isHoliday && (
                          <Badge className="bg-amber-100 text-amber-800 mt-1">Holiday</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{entry.employeeName}</p>
                      {entry.notes && (
                        <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {entry.clockIn} - {entry.clockOut}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{entry.totalHours.toFixed(2)} hrs</p>
                        {entry.breakMinutes > 0 && (
                          <p className="text-xs text-gray-500">Break: {entry.breakMinutes} min</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        {entry.isHoliday ? (
                          <div>
                            <p className="font-medium text-amber-700">
                              {formatCurrency(entry.overtimePay)}
                            </p>
                            <p className="text-xs text-gray-500">Holiday 2x rate</p>
                          </div>
                        ) : entry.overtimePay > 0 ? (
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatCurrency(entry.regularPay + entry.overtimePay)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Regular: {formatCurrency(entry.regularPay)}<br/>
                              Overtime: {formatCurrency(entry.overtimePay)}
                            </p>
                          </div>
                        ) : (
                          <p className="font-medium text-gray-900">
                            {formatCurrency(entry.regularPay)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={
                        entry.status === 'active' ? 'bg-green-100 text-green-800' :
                        entry.status === 'sick-leave' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {entry.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900">{entry.enteredBy}</p>
                      <p className="text-xs text-gray-500">{formatDate(entry.enteredAt)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
