import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Book, Download, FileText, ArrowRight, Trash2, Search, ChevronDown, ChevronUp, Eye, X } from 'lucide-react';
import { saveAs } from 'file-saver';

export default function NovelDetails() {
  const { id } = useParams<{ id: string }>();
  const novelId = Number(id);

  const novel = useLiveQuery(() => db.novels.get(novelId), [novelId]);
  const chapters = useLiveQuery(
    () => db.chapters.where('novelId').equals(novelId).sortBy('chapterNumber'),
    [novelId]
  );

  const [downloadStart, setDownloadStart] = useState<number | ''>('');
  const [downloadEnd, setDownloadEnd] = useState<number | ''>('');
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [previewChapter, setPreviewChapter] = useState<any | null>(null);

  const filteredChapters = useMemo(() => {
    if (!chapters) return [];
    if (!searchQuery.trim()) return chapters;
    return chapters.filter(c =>
      c.chapterNumber.toString().includes(searchQuery) ||
      (c.title && c.title.includes(searchQuery))
    );
  }, [chapters, searchQuery]);

  if (!novel) {
    return <div className="text-center py-12">جاري التحميل...</div>;
  }

  const handleDownload = async () => {
    if (!chapters || chapters.length === 0) return;

    const start = typeof downloadStart === 'number' ? downloadStart : chapters[0].chapterNumber;
    const end = typeof downloadEnd === 'number' ? downloadEnd : chapters[chapters.length - 1].chapterNumber;

    setIsDownloading(true);
    try {
      const chaptersToDownload = await db.chapters
        .where('novelId').equals(novelId)
        .filter(c => c.chapterNumber >= start && c.chapterNumber <= end)
        .sortBy('chapterNumber');

      if (chaptersToDownload.length === 0) {
        alert('لا توجد فصول في هذا النطاق.');
        return;
      }

      let content = '';
      chaptersToDownload.forEach(chapter => {
        content += `الفصل ${chapter.chapterNumber}: ${chapter.title || ''}\n\n`;
        content += `${chapter.content}\n\n`;
        content += `\n${'='.repeat(40)}\n\n`;
      });

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${novel.title} - الفصول ${start} إلى ${end}.txt`);
    } catch (error) {
      console.error('Download error:', error);
      alert('حدث خطأ أثناء التحميل.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteChapter = async (chapterId: number) => {
    if (confirm('هل أنت متأكد من حذف هذا الفصل؟')) {
      await db.chapters.delete(chapterId);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">{novel.title}</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Right Column (Cover & Download) - Appears first on mobile */}
        <div className="w-full md:w-1/3 lg:w-1/4 space-y-4 order-1 md:order-2">
          <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 shadow-sm">
            {novel.coverImage ? (
              <img src={novel.coverImage} alt={novel.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-300">
                <Book className="w-12 h-12" />
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" />
              تحميل الفصول
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-gray-500 mb-1">من فصل</label>
                <input
                  type="number"
                  min="1"
                  value={downloadStart}
                  onChange={(e) => setDownloadStart(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  placeholder="البداية"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-gray-500 mb-1">إلى فصل</label>
                <input
                  type="number"
                  min="1"
                  value={downloadEnd}
                  onChange={(e) => setDownloadEnd(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  placeholder="النهاية"
                />
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={isDownloading || !chapters || chapters.length === 0}
              className="w-full py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDownloading ? 'جاري التجهيز...' : 'تحميل (TXT)'}
            </button>
          </div>
        </div>

        {/* Left Column (Chapter List) - Appears second on mobile */}
        <div className="w-full md:w-2/3 lg:w-3/4 space-y-4 order-2 md:order-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              قائمة الفصول ({chapters?.length || 0})
            </h3>
            <Link
              to={`/novel/${novel.id}/extract`}
              className="bg-green-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <Book className="w-4 h-4" />
              <span>استخراج وإضافة فصول</span>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-gray-50/50">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث برقم الفصل أو العنوان..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
              {filteredChapters?.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  {searchQuery ? 'لا توجد فصول مطابقة للبحث.' : 'لا توجد فصول مضافة بعد.'}
                </div>
              ) : (
                filteredChapters?.map((chapter) => {
                  const isExpanded = expandedChapter === chapter.id;
                  return (
                    <div key={chapter.id} className="flex flex-col">
                      <div
                        onClick={() => setExpandedChapter(isExpanded ? null : chapter.id!)}
                        className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="font-semibold text-sm text-gray-900 truncate">الفصل {chapter.chapterNumber}: {chapter.title}</h4>
                          {!isExpanded && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{chapter.content.substring(0, 80)}...</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewChapter(chapter);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="معاينة الفصل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              chapter.id && handleDeleteChapter(chapter.id);
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="حذف الفصل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="p-4 bg-gray-50 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border-t border-gray-100">
                          {chapter.content}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-base text-gray-900">
                الفصل {previewChapter.chapterNumber} {previewChapter.title ? `- ${previewChapter.title}` : ''}
              </h3>
              <button 
                onClick={() => setPreviewChapter(null)} 
                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 whitespace-pre-wrap leading-relaxed text-gray-800 text-sm sm:text-base">
              {previewChapter.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
