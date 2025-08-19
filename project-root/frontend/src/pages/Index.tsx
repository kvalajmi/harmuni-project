import { useState, useEffect } from 'react';
import { MessageSquare, Upload, Send, Pause, Play, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import QRDisplay from '@/components/QRDisplay';
import FileUpload from '@/components/FileUpload';
import ControlPanel from '@/components/ControlPanel';
import Statistics from '@/components/Statistics';
import MessageLog from '@/components/MessageLog';

interface ContactData {
  name: string;
  civil_id: string;
  amount: string;
  phone1: string;
  phone2?: string;
  phone3?: string;
  pay_link: string;
}

interface MessageStatus {
  id: string;
  contact: ContactData;
  phone: string;
  status: 'pending' | 'sent' | 'failed';
  timestamp?: Date;
  error?: string;
}

const Index = () => {
  const [whatsappStatus, setWhatsappStatus] = useState<'disconnected' | 'qr' | 'ready'>('disconnected');
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'paused' | 'cancelled'>('idle');
  const [messageLog, setMessageLog] = useState<MessageStatus[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    remaining: 0
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const newSocket = io(apiBaseUrl, {
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('connect', () => {
      setSocket(newSocket);
    });

    newSocket.on('qr', (qrData: string) => {
      setQrCodeData(qrData);
      setWhatsappStatus('qr');
    });

    newSocket.on('ready', (data: any) => {
      setWhatsappStatus('ready');
      setQrCodeData(null);
    });

    newSocket.on('auth_failure', (data: any) => {
      console.error('❌ WhatsApp auth failed:', data);
      setWhatsappStatus('disconnected');
      setQrCodeData(null);
    });

    newSocket.on('disconnected', (data: any) => {
      setWhatsappStatus('disconnected');
      setQrCodeData(null);
    });

    newSocket.on('whatsapp_disconnected', (data: any) => {
      setWhatsappStatus('disconnected');
      setQrCodeData(null);
    });

    newSocket.on('message_sent', (data: any) => {
      
      // Add to message log
      const logEntry: MessageStatus = {
        id: `${data.row}_${data.column}_${Date.now()}`,
        contact: {
          name: data.contact,
          civil_id: '', // Not needed for display
          amount: '', // Not needed for display
          phone1: data.phone,
          pay_link: '' // Not needed for display
        },
        phone: data.phone,
        status: 'sent',
        timestamp: new Date(data.timestamp)
      };
      
      setMessageLog(prev => [logEntry, ...prev].slice(0, 100)); // Keep last 100 entries
    });

    newSocket.on('message_failed', (data: any) => {
      
      // Add to message log
      const logEntry: MessageStatus = {
        id: `${data.row}_${data.column}_${Date.now()}`,
        contact: {
          name: data.contact,
          civil_id: '', // Not needed for display
          amount: '', // Not needed for display
          phone1: data.phone,
          pay_link: '' // Not needed for display
        },
        phone: data.phone,
        status: 'failed',
        timestamp: new Date(data.timestamp),
        error: data.error
      };
      
      setMessageLog(prev => [logEntry, ...prev].slice(0, 100)); // Keep last 100 entries
    });

    newSocket.on('log_update', (logData: any) => {
      
      // Convert backend log format to frontend format
      const logEntry: MessageStatus = {
        id: logData.id,
        contact: {
          name: logData.contact.name,
          civil_id: logData.contact.civil_id,
          amount: '', // Not used in new structure
          phone1: logData.phone,
          pay_link: logData.message || 'رسالة من Excel' // Store actual message content
        },
        phone: logData.phone,
        status: logData.status,
        timestamp: new Date(logData.timestamp),
        error: logData.error
      };
      
      setMessageLog(prev => [logEntry, ...prev].slice(0, 100));
    });

    newSocket.on('stats_update', (newStats: any) => {
      setStats(newStats);
    });

    newSocket.on('status_update', (data: any) => {
      if (data.whatsapp) {
        setWhatsappStatus(data.whatsapp);
      }
      if (data.messaging) {
        setSendingStatus(data.messaging);
      }
    });

    newSocket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const response = await fetch(`${apiBaseUrl}/api/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setContacts(result.data); // Store message rows
        setStats(prev => ({ 
          ...prev, 
          total: result.summary.totalMessages, 
          remaining: result.summary.totalMessages 
        }));
        
        // Update file upload component status
        if ((window as any).updateFileUploadStatus) {
          (window as any).updateFileUploadStatus('success', result.summary);
        }
        
        console.log('✅ File uploaded successfully:', result.summary.validRows, 'rows with', result.summary.totalMessages, 'total messages');
        
        if (result.warnings && result.warnings.length > 0) {
          console.warn('⚠️ Upload warnings:', result.warnings);
        }
      } else {
        console.error('❌ File upload failed:', result.error);
        
        // Update file upload component status
        if ((window as any).updateFileUploadStatus) {
          (window as any).updateFileUploadStatus('error', null, result.error);
        }
        
        alert(`خطأ في رفع الملف: ${result.error}`);
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      
      // Update file upload component status
      if ((window as any).updateFileUploadStatus) {
        (window as any).updateFileUploadStatus('error', null, error.message);
      }
      
      alert('خطأ في رفع الملف. يرجى المحاولة مرة أخرى.');
    }
  };

  const connectToWhatsApp = () => {
    if (socket) {
      console.log('📱 Requesting WhatsApp connection...');
      setWhatsappStatus('qr');
      socket.emit('connect_whatsapp');
    }
  };

  const disconnectFromWhatsApp = () => {
    if (socket) {
      console.log('📱 Requesting WhatsApp disconnect...');
      socket.emit('disconnect_whatsapp');
      setWhatsappStatus('disconnected');
      setQrCodeData(null);
    }
  };

  const handleStartMessaging = () => {
    if (socket && contacts.length > 0) {
      console.log('🚀 Starting bulk messaging with', contacts.length, 'message rows...');
      socket.emit('start_messaging', {
        messageRows: contacts // Send message rows with messages from Excel column G
      });
    }
  };

  const handlePauseMessaging = () => {
    if (socket) {
      console.log('⏸️ Pausing messaging...');
      socket.emit('pause_messaging');
    }
  };

  const handleResumeMessaging = () => {
    if (socket) {
      console.log('▶️ Resuming messaging...');
      socket.emit('resume_messaging');
    }
  };

  const handleCancelMessaging = () => {
    if (socket) {
      console.log('🛑 Cancelling messaging...');
      socket.emit('cancel_messaging');
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* العنوان الرئيسي */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MessageSquare className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold text-foreground font-arabic">
              إرسال رسائل واتساب جماعية
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            نظام متقدم لإرسال الرسائل الجماعية عبر واتساب من ملفات Excel بطريقة آمنة ومنظمة
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* العمود الأيسر - رفع الملف والاتصال */}
          <div className="space-y-6">
            {/* رفع الملف - المكون الرئيسي */}
            <FileUpload onFileUpload={handleFileUpload} />
            
            {/* اتصال واتساب */}
            <QRDisplay 
              status={whatsappStatus} 
              onConnect={connectToWhatsApp}
              onDisconnect={disconnectFromWhatsApp}
              qrCode={qrCodeData}
            />
          </div>

          {/* العمود الأيمن - التحكم والإحصائيات */}
          <div className="space-y-6">
            <ControlPanel 
              whatsappReady={whatsappStatus === 'ready'}
              hasContacts={contacts.length > 0}
              sendingStatus={sendingStatus}
              onStart={handleStartMessaging}
              onPause={handlePauseMessaging}
              onResume={handleResumeMessaging}
              onCancel={handleCancelMessaging}
            />

            <Statistics stats={stats} />
          </div>
        </div>

        {/* سجل الرسائل */}
        <div className="mt-8">
          <MessageLog messages={messageLog} />
        </div>
      </div>
    </div>
  );
};

export default Index;