import { useState, useEffect } from 'react';
import { ActivityLog } from '@/types';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getActivityLogs } from '@/lib/activityLog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Users, Clock, Trash2, Edit, Plus, Download, Mail } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ActivityLogsProps {
  organizationId: string;
}

const ACTION_ICONS: Record<string, any> = {
  'employee_add': Plus,
  'employee_edit': Edit,
  'employee_delete': Trash2,
  'time_entry_add': Clock,
  'time_entry_edit': Edit,
  'time_entry_delete': Trash2,
  'payroll_print': FileText,
  'payroll_export': Download,
  'payslip_email': Mail,
};

const ACTION_COLORS: Record<string, string> = {
  'add': 'bg-green-100 text-green-800',
  'edit': 'bg-blue-100 text-blue-800',
  'delete': 'bg-red-100 text-red-800',
  'print': 'bg-purple-100 text-purple-800',
  'export': 'bg-indigo-100 text-indigo-800',
  'email': 'bg-pink-100 text-pink-800',
};

export default function ActivityLogs({ organizationId }: ActivityLogsProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, [organizationId]);

  useEffect(() => {
    applyFilters();
  }, [logs, filterAction, filterEntity, searchTerm]);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const data = await getActivityLogs(organizationId, { limit: 500 });
      setLogs(data);
    } catch (error: any) {
      toast({
        title: 'Error loading activity logs',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];
    
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action.includes(filterAction));
    }
    
    if (filterEntity !== 'all') {
      filtered = filtered.filter(log => log.entityType === filterEntity);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.userName.toLowerCase().includes(term) ||
        log.entityName?.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term)
      );
    }
    
    setFilteredLogs(filtered);
  };

  const getActionBadgeColor = (action: string): string => {
    for (const [key, color] of Object.entries(ACTION_COLORS)) {
      if (action.includes(key)) return color;
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading activity logs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search by user or entity..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="add">Added</SelectItem>
            <SelectItem value="edit">Edited</SelectItem>
            <SelectItem value="delete">Deleted</SelectItem>
            <SelectItem value="print">Printed</SelectItem>
            <SelectItem value="export">Exported</SelectItem>
            <SelectItem value="email">Emailed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="employee">Employees</SelectItem>
            <SelectItem value="time_entry">Time Entries</SelectItem>
            <SelectItem value="payroll">Payroll</SelectItem>
            <SelectItem value="user">Users</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No activity logs found
          </Card>
        ) : (
          filteredLogs.map(log => (
            <Card key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{log.userName}</span>
                    <Badge className={getActionBadgeColor(log.action)}>
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                    {log.entityName && (
                      <span className="text-gray-700">
                        <span className="text-gray-500">→</span> {log.entityName}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatDate(log.createdAt)}
                  </div>
                  {log.details && (
                    <div className="text-xs text-gray-600 mt-2 font-mono bg-gray-100 p-2 rounded">
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      
      <p className="text-sm text-gray-500 text-center">
        Showing {filteredLogs.length} of {logs.length} activity logs
      </p>
    </div>
  );
}
