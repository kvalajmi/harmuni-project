import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ContactData {
  name: string;
  civil_id: string;
  amount: string;
  phone1: string;
  phone2?: string;
  phone3?: string;
  pay_link: string;
}

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

const FileUpload = ({ onFileUpload }: FileUploadProps) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedCount, setUploadedCount] = useState<number>(0);
  const [uploadSummary, setUploadSummary] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      throw new Error('نوع الملف غير مدعوم. يرجى استخدام ملفات Excel فقط (.xlsx, .xls)');
    }
    
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت');
    }
  };

  const processFile = useCallback(async (file: File) => {
    try {
      validateFile(file);
      
      setUploadStatus('uploading');
      setUploadedFileName(file.name);
      
      await onFileUpload(file);
      
    } catch (error: any) {
      console.error('❌ File validation error:', error);
      setUploadStatus('error');
      alert(error.message || 'خطأ في معالجة الملف');
    }
  }, [onFileUpload]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  // Update status from parent component
  const updateUploadStatus = useCallback((status: 'success' | 'error', summary?: any, error?: string) => {
    setUploadStatus(status);
    if (status === 'success' && summary) {
      setUploadedCount(summary.totalMessages || summary.validRows || 0);
      setUploadSummary(summary);
    }
    if (status === 'error' && error) {
      console.error('Upload error:', error);
    }
  }, []);

  // Expose update function to parent
  React.useEffect(() => {
    (window as any).updateFileUploadStatus = updateUploadStatus;
    return () => {
      delete (window as any).updateFileUploadStatus;
    };
  }, [updateUploadStatus]);

  return (
    <Card className="card-whatsapp">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <FileSpreadsheet className="w-8 h-8 text-primary ml-2" />
          <h3 className="text-xl font-semibold text-foreground">
            رفع ملف Excel
          </h3>
        </div>

        {uploadStatus === 'idle' && (
          <div className="space-y-4">
            <div 
              className={`relative border-3 border-dashed rounded-2xl p-16 transition-all duration-300 cursor-pointer group overflow-hidden ${
                isDragOver 
                  ? 'border-green-500 bg-green-50 scale-[1.01] shadow-2xl shadow-green-500/20' 
                  : 'border-gray-300 hover:border-green-400 hover:bg-green-50/30 hover:shadow-lg'
              }`}
              onClick={handleFileSelect}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Animated background pattern */}
              <div className={`absolute inset-0 transition-opacity duration-300 ${
                isDragOver ? 'opacity-10' : 'opacity-5'
              }`}>
                <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-600 rounded-2xl"></div>
              </div>
              
              {/* Floating elements for visual appeal */}
              <div className="absolute top-4 right-4 opacity-20">
                <FileSpreadsheet className="w-8 h-8 text-green-500 rotate-12" />
              </div>
              <div className="absolute bottom-4 left-4 opacity-20">
                <Upload className="w-6 h-6 text-green-500 -rotate-12" />
              </div>
              
              <div className="relative z-10 text-center">
                <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDragOver 
                    ? 'bg-green-500 text-white scale-110 shadow-lg' 
                    : 'bg-green-100 text-green-600 group-hover:bg-green-200 group-hover:scale-105'
                }`}>
                  <FileSpreadsheet className={`transition-all duration-300 ${
                    isDragOver ? 'w-12 h-12 animate-bounce' : 'w-10 h-10'
                  }`} />
                </div>
                
                <h4 className={`text-2xl font-bold mb-4 transition-colors ${
                  isDragOver ? 'text-green-600' : 'text-gray-800'
                }`}>
                  {isDragOver ? '✨ اتركه هنا لرفع الملف' : '📊 رفع ملف Excel'}
                </h4>
                
                <p className={`text-lg mb-6 transition-colors ${
                  isDragOver ? 'text-green-600 font-semibold' : 'text-gray-600'
                }`}>
                  {isDragOver ? 'جاري معالجة الملف...' : 'اسحب ملف Excel هنا أو اضغط للاختيار'}
                </p>
                
                {/* Excel structure guide */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-sm border border-gray-200/50 shadow-sm">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Download className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-gray-800">هيكل ملف Excel المطلوب:</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="font-semibold text-green-700 mb-2">الأعمدة الأساسية:</div>
                      <div className="space-y-1 text-gray-700">
                        <div>📝 A: اسم العميل</div>
                        <div>🆔 B: الرقم المدني</div>
                        <div>📱 C: هاتف 1 (مطلوب)</div>
                        <div>📞 D: هاتف 2 (اختياري)</div>
                        <div>☎️ E: هاتف 3 (اختياري)</div>
                        <div>💬 G: النص (الرسالة)</div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="font-semibold text-blue-700 mb-2">متطلبات الملف:</div>
                      <div className="space-y-1 text-gray-700">
                        <div>📄 الصيغة: .xlsx أو .xls</div>
                        <div>📏 الحجم: أقل من 10 ميجابايت</div>
                        <div>🔢 أرقام الهواتف: 8 أرقام كويتية</div>
                        <div>✍️ الرسائل: نص كامل في العمود G</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800 font-medium">
                      💡 نصيحة: سيتم إرسال محتوى العمود G لكل رقم هاتف صحيح في نفس الصف
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {uploadStatus === 'uploading' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping"></div>
                <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
                  <FileSpreadsheet className="w-12 h-12 text-white animate-pulse" />
                </div>
              </div>
              
              <h4 className="text-xl font-bold text-green-600 mb-2">🔄 جاري معالجة الملف</h4>
              <p className="text-gray-600 mb-4">يرجى الانتظار بينما نقوم بتحليل بيانات Excel...</p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="font-medium">{uploadedFileName}</span>
                </div>
              </div>
              
              {/* Loading animation */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">تحليل الأعمدة والهواتف والرسائل...</p>
              </div>
            </div>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-pulse"></div>
                <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              
              <h4 className="text-2xl font-bold text-green-600 mb-2">🎉 تم الرفع بنجاح!</h4>
              <p className="text-xl font-semibold text-green-700 mb-6">
                {uploadedCount} رسالة جاهزة للإرسال
              </p>
              
              {uploadSummary && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 text-sm">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                      <div className="text-3xl font-bold text-green-600">{uploadSummary.validRows}</div>
                      <div className="text-sm text-gray-600 font-medium">صفوف صحيحة</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                      <div className="text-3xl font-bold text-blue-600">{uploadSummary.totalMessages}</div>
                      <div className="text-sm text-gray-600 font-medium">رسائل إجمالية</div>
                    </div>
                  </div>
                  
                  {uploadSummary.invalidRows > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-yellow-700">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">تنبيه:</span>
                      </div>
                      <p className="text-yellow-700 text-xs mt-1">
                        {uploadSummary.invalidRows} صف يحتوي على أخطاء وتم تجاهلها
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <span className="font-medium">{uploadedFileName}</span>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => {
                setUploadStatus('idle');
                setUploadedFileName('');
                setUploadedCount(0);
                setUploadSummary(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              variant="outline"
              className="w-full h-12 text-lg border-green-300 hover:bg-green-50 hover:border-green-400"
            >
              <Upload className="w-5 h-5 ml-2" />
              رفع ملف Excel آخر
            </Button>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse"></div>
                <div className="relative w-24 h-24 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <AlertCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              
              <h4 className="text-2xl font-bold text-red-600 mb-2">❌ خطأ في الرفع</h4>
              <p className="text-gray-600 mb-6">
                يرجى التأكد من صيغة الملف والأعمدة المطلوبة والمحاولة مرة أخرى
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h5 className="font-bold text-red-700 mb-3">تحقق من:</h5>
                <div className="text-sm text-red-600 space-y-2 text-right">
                  <div>✓ صيغة الملف: .xlsx أو .xls فقط</div>
                  <div>✓ العمود C يحتوي على أرقام هواتف</div>
                  <div>✓ العمود G يحتوي على نصوص الرسائل</div>
                  <div>✓ حجم الملف أقل من 10 ميجابايت</div>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={() => setUploadStatus('idle')}
              className="w-full h-12 text-lg bg-red-500 hover:bg-red-600 text-white"
            >
              <Upload className="w-5 h-5 ml-2" />
              المحاولة مرة أخرى
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </Card>
  );
};

export default FileUpload;