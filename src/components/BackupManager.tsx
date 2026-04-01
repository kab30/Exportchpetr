import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { createBackup, downloadBackupFile, restoreFromBackup } from '../utils/backup';
import { Database, Download, Upload, Trash2, RefreshCw, X } from 'lucide-react';

export default function BackupManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backups = useLiveQuery(() => db.backups.orderBy('timestamp').reverse().toArray());

  // Run daily backup check on mount
  useEffect(() => {
    createBackup();
  }, []);

  const handleManualBackup = async () => {
    setIsCreating(true);
    await createBackup();
    setIsCreating(false);
  };

  const handleDownload = (backup: any) => {
    downloadBackupFile(backup.data, backup.date);
  };

  const handleDelete = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذه النسخة الاحتياطية؟')) {
      await db.backups.delete(id);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (confirm('استعادة نسخة احتياطية ستمسح جميع البيانات الحالية. هل أنت متأكد؟')) {
      setIsRestoring(true);
      try {
        const text = await file.text();
        const success = await restoreFromBackup(text);
        if (success) {
          alert('تم استعادة النسخة الاحتياطية بنجاح!');
          window.location.reload();
        } else {
          alert('فشل في استعادة النسخة الاحتياطية. تأكد من صحة الملف.');
        }
      } catch (error) {
        console.error(error);
        alert('حدث خطأ أثناء قراءة الملف.');
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } else {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
        title="النسخ الاحتياطي"
      >
        <Database className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                النسخ الاحتياطي
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              <div className="flex gap-2">
                <button
                  onClick={handleManualBackup}
                  disabled={isCreating}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  إنشاء نسخة الآن
                </button>
                <button
                  onClick={handleRestoreClick}
                  disabled={isRestoring}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isRestoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  استعادة من ملف
                </button>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">النسخ الاحتياطية المحفوظة (آخر 3 أيام)</h4>
                <div className="space-y-2">
                  {!backups || backups.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">لا توجد نسخ احتياطية محفوظة بعد.</p>
                  ) : (
                    backups.map((backup) => (
                      <div key={backup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{backup.date}</p>
                          <p className="text-xs text-gray-500">{new Date(backup.timestamp).toLocaleTimeString('ar-SA')}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDownload(backup)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="تحميل النسخة"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => backup.id && handleDelete(backup.id)}
                            className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                            title="حذف النسخة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
