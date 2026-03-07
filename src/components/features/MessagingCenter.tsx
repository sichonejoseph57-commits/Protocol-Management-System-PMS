import { useState, useEffect } from 'react';
import { Message } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { sendMessage, getMessages, markMessageAsRead, getUnreadCount } from '@/lib/messaging';
import { getAllUsers } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send, MailOpen, Reply } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { AuthUser } from '@/hooks/useAuth';

interface MessagingCenterProps {
  currentUser: AuthUser;
}

export default function MessagingCenter({ currentUser }: MessagingCenterProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [superAdminId, setSuperAdminId] = useState<string>('');
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  });
  const { toast } = useToast();

  const isOwner = currentUser.role === 'super_admin';
  const isAdmin = currentUser.role === 'admin';
  const canSendMessages = isOwner || isAdmin; // Only owner and client admin can send

  useEffect(() => {
    loadMessages();
    loadUnreadCount();
    loadSuperAdmin();
    
    // Poll for new messages every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const loadMessages = async () => {
    try {
      const data = await getMessages(currentUser.id);
      setMessages(data);
    } catch (error: any) {
      toast({
        title: 'Error loading messages',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadUnreadCount = async () => {
    const count = await getUnreadCount(currentUser.id);
    setUnreadCount(count);
  };

  const loadSuperAdmin = async () => {
    try {
      const users = await getAllUsers();
      const superAdmin = users.find(u => u.role === 'super_admin');
      if (superAdmin) {
        setSuperAdminId(superAdmin.id);
      }
    } catch (error) {
      console.error('Error loading super admin:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.message) {
      toast({
        title: 'Missing fields',
        description: 'Please provide subject and message',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const recipientId = isOwner 
        ? (selectedMessage?.fromUserId || '') // Owner replies to sender
        : superAdminId; // Client admin sends to owner
      
      const recipientName = isOwner
        ? (selectedMessage?.fromUserName || 'Client Admin')
        : 'System Owner';
      
      await sendMessage(
        currentUser.id,
        currentUser.username,
        recipientId,
        recipientName,
        formData.subject,
        formData.message,
        currentUser.organizationId,
        selectedMessage?.id
      );
      
      toast({
        title: 'Success',
        description: 'Message sent successfully',
      });
      
      setFormData({ subject: '', message: '' });
      setShowCompose(false);
      setSelectedMessage(null);
      loadMessages();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleReadMessage = async (message: Message) => {
    setSelectedMessage(message);
    if (!message.isRead && message.toUserId === currentUser.id) {
      try {
        await markMessageAsRead(message.id);
        loadMessages();
        loadUnreadCount();
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
  };

  const handleReply = (message: Message) => {
    setFormData({
      subject: `Re: ${message.subject}`,
      message: '',
    });
    setSelectedMessage(message);
    setShowCompose(true);
  };

  if (!canSendMessages && currentUser.role === 'hr') {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">
          HR users do not have access to messaging. Only company owners and admins can send messages to the system owner.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold">Messages</h3>
          {unreadCount > 0 && (
            <Badge className="bg-red-600">{unreadCount} Unread</Badge>
          )}
        </div>
        <Button onClick={() => setShowCompose(true)} className="gap-2">
          <Send className="w-4 h-4" />
          {isOwner ? 'Reply to Client' : 'Contact System Owner'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Inbox</h4>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No messages</p>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={`p-3 rounded border cursor-pointer hover:bg-gray-50 ${
                    !msg.isRead && msg.toUserId === currentUser.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'border-gray-200'
                  }`}
                  onClick={() => handleReadMessage(msg)}
                >
                  <div className="flex items-start gap-2">
                    {!msg.isRead && msg.toUserId === currentUser.id ? (
                      <Mail className="w-4 h-4 text-blue-600 mt-0.5" />
                    ) : (
                      <MailOpen className="w-4 h-4 text-gray-400 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {msg.fromUserId === currentUser.id ? `To: ${msg.toUserName}` : `From: ${msg.fromUserName}`}
                        </span>
                      </div>
                      <p className="text-sm font-semibold truncate">{msg.subject}</p>
                      <p className="text-xs text-gray-500">{formatDate(msg.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-3">Message Details</h4>
          {selectedMessage ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-gray-500">From</Label>
                <p className="font-medium">{selectedMessage.fromUserName}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">To</Label>
                <p className="font-medium">{selectedMessage.toUserName}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Subject</Label>
                <p className="font-semibold">{selectedMessage.subject}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Date</Label>
                <p className="text-sm">{formatDate(selectedMessage.createdAt)}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Message</Label>
                <div className="mt-2 p-4 bg-gray-50 rounded border whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleReply(selectedMessage)}
              >
                <Reply className="w-4 h-4" />
                Reply
              </Button>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">
              Select a message to view details
            </p>
          )}
        </Card>
      </div>

      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedMessage ? 'Reply to Message' : isOwner ? 'Send Message to Client' : 'Contact System Owner'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div>
              <Label>Subject *</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Message subject"
                required
              />
            </div>
            <div>
              <Label>Message *</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Type your message here..."
                rows={6}
                required
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="flex-1 gap-2">
                <Send className="w-4 h-4" />
                Send Message
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCompose(false);
                  setFormData({ subject: '', message: '' });
                  setSelectedMessage(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
