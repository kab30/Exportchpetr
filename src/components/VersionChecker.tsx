import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

// قم بتغيير هذا الرقم في كل مرة تقوم فيها برفع تحديث جديد للموقع
const CURRENT_VERSION = '1.0.0';

export default function VersionChecker() {
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // إضافة طابع زمني لمنع الكاش عند جلب ملف الإصدار
        const res = await fetch(`/version.json?t=${Date.now()}`);
        const data = await res.json();
        
        if (data.version && data.version !== CURRENT_VERSION) {
          console.log(`New version detected: ${data.version}. Current: ${CURRENT_VERSION}`);
          setIsUpdating(true);
          
          // مسح كاش المتصفح (Service Workers & HTTP Cache)
          // ملاحظة هامة: هذا الكود لن يمسح IndexedDB حيث تُحفظ الروايات
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          
          // تحديث الصفحة إجبارياً بعد ثانية ونصف
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (error) {
        console.error('Failed to check version:', error);
      }
    };

    // التحقق عند فتح الموقع
    checkVersion();
    
    // التحقق كل 15 دقيقة إذا بقي الموقع مفتوحاً
    const interval = setInterval(checkVersion, 1000 * 60 * 15);
    return () => clearInterval(interval);
  }, []);

  if (!isUpdating) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-blue-100">
        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900">تحديث جديد متاح!</h3>
          <p className="text-sm text-gray-500 mt-1">جاري تحديث الموقع للإصدار الأحدث...</p>
        </div>
      </div>
    </div>
  );
}
