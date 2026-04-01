import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Plus, Book, Image as ImageIcon } from 'lucide-react';
import { db } from '../db';

export default function Home() {
  const novels = useLiveQuery(() => db.novels.orderBy('createdAt').reverse().toArray());
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCover, setNewCover] = useState('');

  const handleAddNovel = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await db.novels.add({
      title: newTitle.trim(),
      coverImage: newCover.trim() || undefined,
      createdAt: Date.now(),
    });

    setNewTitle('');
    setNewCover('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">رواياتي</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          <span>إضافة رواية</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddNovel} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 space-y-3 md:space-y-4">
          <h3 className="text-base md:text-lg font-semibold">إضافة رواية جديدة</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">عنوان الرواية</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                placeholder="أدخل عنوان الرواية..."
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">رابط صورة الغلاف (اختياري)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ImageIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={newCover}
                    onChange={(e) => setNewCover(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              حفظ
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {novels?.map((novel) => (
          <Link
            key={novel.id}
            to={`/novel/${novel.id}`}
            className="group flex flex-col gap-2"
          >
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 relative">
              {novel.coverImage ? (
                <img
                  src={novel.coverImage}
                  alt={novel.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-300 transition-transform duration-500 group-hover:scale-110">
                  <Book className="w-8 h-8 md:w-12 md:h-12" />
                </div>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2 text-center group-hover:text-blue-600 transition-colors">
              {novel.title}
            </h3>
          </Link>
        ))}
        {novels?.length === 0 && !isAdding && (
          <div className="col-span-full py-8 md:py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <Book className="w-8 h-8 md:w-12 md:h-12 mx-auto text-gray-400 mb-2 md:mb-3" />
            <p className="text-sm md:text-base">لا توجد روايات مضافة بعد.</p>
            <p className="text-xs md:text-sm mt-1">انقر على "إضافة رواية" للبدء.</p>
          </div>
        )}
      </div>
    </div>
  );
}
