import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ArrowRight, Zap, AlertCircle, CheckCircle2, X, Eye } from 'lucide-react';

export default function ExtractChapters() {
  const { id } = useParams<{ id: string }>();
  const novelId = Number(id);
  const navigate = useNavigate();

  const existingChapters = useLiveQuery(
    () => db.chapters.where('novelId').equals(novelId).toArray(),
    [novelId]
  );
  const existingChapterNumbers = new Set(existingChapters?.map(c => c.chapterNumber) || []);

  const [activeTab, setActiveTab] = useState<'link' | 'manual'>('manual');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [extractedChapters, setExtractedChapters] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [previewChapter, setPreviewChapter] = useState<any | null>(null);
  const [rangeStart, setRangeStart] = useState<number | ''>('');
  const [rangeEnd, setRangeEnd] = useState<number | ''>('');

  useEffect(() => {
    if (extractedChapters.length > 0) {
      const newSelected = new Set<number>();
      const seenNumbers = new Set<number>();
      
      extractedChapters.forEach((ch, i) => {
        // Select by default if not in DB and not a duplicate within the extracted list
        if (!existingChapterNumbers.has(ch.chapterNumber) && !seenNumbers.has(ch.chapterNumber)) {
          newSelected.add(i);
          seenNumbers.add(ch.chapterNumber);
        }
      });
      setSelectedIndices(newSelected);
    }
  }, [extractedChapters, existingChapters]);

  const handleExtract = async () => {
    if (!inputText.trim()) {
      setError('الرجاء إدخال النص أولاً.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      let cleanedText = inputText
        .replace(/Google Privacy PolicyOpens in a new window/gi, '')
        .replace(/Google Terms of ServiceOpens in a new window/gi, '')
        .replace(/Your privacy & Gemini AppsOpens in a new window/gi, '')
        .replace(/Gemini may display inaccurate info.*/gi, '');

      cleanedText = cleanedText
        .split('\n')
        .filter(line => !/[\u4e00-\u9fa5]/.test(line))
        .join('\n');

      const chapterRegex = /(?:الفصل|Chapter)\s*(\d+)(?:[:\-،\s]*([^\n]*))?/gi;
      const chapters = [];
      let match;
      let lastIndex = 0;
      let currentChapter: any = null;

      chapterRegex.lastIndex = 0;

      while ((match = chapterRegex.exec(cleanedText)) !== null) {
        if (currentChapter) {
          currentChapter.content = cleanedText.substring(lastIndex, match.index).trim();
          currentChapter.content = currentChapter.content.replace(/\n{3,}/g, '\n\n');
          if (currentChapter.content) {
            chapters.push(currentChapter);
          }
        }

        currentChapter = {
          chapterNumber: parseInt(match[1], 10),
          title: match[2] ? match[2].trim() : '',
          content: ''
        };
        lastIndex = chapterRegex.lastIndex;
      }

      if (currentChapter) {
        currentChapter.content = cleanedText.substring(lastIndex).trim();
        currentChapter.content = currentChapter.content.replace(/\n{3,}/g, '\n\n');
        if (currentChapter.content) {
          chapters.push(currentChapter);
        }
      }

      if (chapters.length === 0) {
        throw new Error('لم يتم العثور على أي فصول. تأكد من أن النص يحتوي على كلمة "الفصل" متبوعة برقم (مثال: الفصل 1).');
      }

      setExtractedChapters(chapters);
      setShowModal(true);

    } catch (err: any) {
      console.error('Extraction error:', err);
      setError(err.message || 'حدث خطأ أثناء معالجة النص.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectRange = (select: boolean) => {
    if (typeof rangeStart !== 'number' || typeof rangeEnd !== 'number') return;
    const newSelected = new Set(selectedIndices);
    extractedChapters.forEach((ch, idx) => {
      if (ch.chapterNumber >= rangeStart && ch.chapterNumber <= rangeEnd) {
        if (select) newSelected.add(idx);
        else newSelected.delete(idx);
      }
    });
    setSelectedIndices(newSelected);
  };

  const toggleSelection = (idx: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(idx)) newSelected.delete(idx);
    else newSelected.add(idx);
    setSelectedIndices(newSelected);
  };

  const handleSaveChapters = async () => {
    try {
      const selectedChapters = extractedChapters.filter((_, idx) => selectedIndices.has(idx));
      
      if (selectedChapters.length === 0) {
        alert('الرجاء تحديد فصل واحد على الأقل للحفظ.');
        return;
      }

      const selectedNumbers = selectedChapters.map(c => c.chapterNumber);
      
      // Check for duplicates within selection
      const duplicatesInSelection = selectedNumbers.filter((item, index) => selectedNumbers.indexOf(item) !== index);
      if (duplicatesInSelection.length > 0) {
        alert(`يوجد أرقام فصول مكررة في التحديد: ${[...new Set(duplicatesInSelection)].join(', ')}. يرجى إبقاء نسخة واحدة فقط.`);
        return;
      }

      // Check for duplicates against DB
      const duplicatesWithDb = selectedNumbers.filter(num => existingChapterNumbers.has(num));
      if (duplicatesWithDb.length > 0) {
        alert(`الفصول التالية موجودة مسبقاً في الرواية: ${[...new Set(duplicatesWithDb)].join(', ')}. يرجى إلغاء تحديدها.`);
        return;
      }

      const chaptersToAdd = selectedChapters.map((ch: any) => ({
        novelId,
        chapterNumber: ch.chapterNumber,
        title: ch.title || '',
        content: ch.content,
        createdAt: Date.now(),
      }));

      await db.chapters.bulkAdd(chaptersToAdd);

      setSuccess(`تم إضافة ${chaptersToAdd.length} فصول بنجاح!`);
      setShowModal(false);
      setInputText('');
      setExtractedChapters([]);
      
      setTimeout(() => {
        navigate(`/novel/${novelId}`);
      }, 1500);
    } catch (err: any) {
      console.error('Save error:', err);
      setError('حدث خطأ أثناء الحفظ في قاعدة البيانات.');
    }
  };

  // Count occurrences to highlight internal duplicates
  const extractedNumbersCount = extractedChapters.reduce((acc, ch) => {
    acc[ch.chapterNumber] = (acc[ch.chapterNumber] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link to={`/novel/${novelId}`} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          استخراج الفصول السريع
        </h2>
      </div>
      <p className="text-sm text-gray-500">استخراج الفصول برمجياً وبسرعة فائقة. سيتم تجاهل النصوص الصينية تلقائياً.</p>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-3 text-sm text-center font-medium transition-colors ${
              activeTab === 'link' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            عبر الرابط
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 text-sm text-center font-medium transition-colors ${
              activeTab === 'manual' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            لصق يدوي
          </button>
        </div>

        <div className="p-4 space-y-3">
          {activeTab === 'link' ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-sm">ميزة الجلب المباشر من الرابط غير مدعومة حالياً بسبب قيود المتصفح (CORS).</p>
              <p className="mt-1 text-xs">يرجى نسخ محتوى الصفحة ولصقه في تبويب "لصق يدوي".</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>الصق النص المترجم هنا (يجب أن يحتوي على كلمة "الفصل" متبوعة برقم)</span>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="انسخ النص والصقه هنا..."
                className="w-full h-48 md:h-64 p-3 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                dir="auto"
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{success}</p>
            </div>
          )}

          <button
            onClick={handleExtract}
            disabled={isProcessing || (activeTab === 'manual' && !inputText.trim())}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              'استخراج الفصول الآن'
            )}
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">الفصول المستخرجة ({extractedChapters.length})</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-3 bg-white border-b border-gray-100 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-md border border-gray-200 w-full sm:w-auto">
                  <span className="text-xs font-medium text-gray-700 whitespace-nowrap">من:</span>
                  <input 
                    type="number" 
                    value={rangeStart} 
                    onChange={e => setRangeStart(e.target.value ? Number(e.target.value) : '')} 
                    className="w-16 px-1.5 py-1 text-xs border border-gray-300 rounded outline-none focus:border-blue-500" 
                    placeholder="فصل" 
                  />
                  <span className="text-xs font-medium text-gray-700">إلى:</span>
                  <input 
                    type="number" 
                    value={rangeEnd} 
                    onChange={e => setRangeEnd(e.target.value ? Number(e.target.value) : '')} 
                    className="w-16 px-1.5 py-1 text-xs border border-gray-300 rounded outline-none focus:border-blue-500" 
                    placeholder="فصل" 
                  />
                  <div className="flex gap-1 mr-auto">
                    <button onClick={() => handleSelectRange(true)} className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium transition-colors">تحديد</button>
                    <button onClick={() => handleSelectRange(false)} className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium transition-colors">إلغاء</button>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => setSelectedIndices(new Set(extractedChapters.map((_, i) => i)))} className="flex-1 sm:flex-none px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-xs font-medium transition-colors">تحديد الكل</button>
                  <button onClick={() => setSelectedIndices(new Set())} className="flex-1 sm:flex-none px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-xs font-medium transition-colors">إلغاء الكل</button>
                </div>
              </div>
              <div className="text-xs text-gray-500 font-medium">
                تم تحديد <span className="text-blue-600 font-bold">{selectedIndices.size}</span> من أصل {extractedChapters.length} فصل
              </div>
            </div>

            <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3 bg-gray-50/30">
              {extractedChapters.map((ch, idx) => {
                const isSelected = selectedIndices.has(idx);
                const isDbDuplicate = existingChapterNumbers.has(ch.chapterNumber);
                const isInternalDuplicate = extractedNumbersCount[ch.chapterNumber] > 1;
                const hasWarning = isDbDuplicate || isInternalDuplicate;

                return (
                  <div key={idx} className={`p-3 rounded-lg border transition-colors ${isSelected ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 bg-white'} ${hasWarning && isSelected ? 'border-orange-400 bg-orange-50/30' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => toggleSelection(idx)} 
                            className="w-4 h-4 cursor-pointer accent-blue-600" 
                          />
                          <span className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            الفصل {ch.chapterNumber}
                          </span>
                        </label>
                        {ch.title && <span className="font-medium text-gray-700 text-sm line-clamp-1">{ch.title}</span>}
                        {isDbDuplicate && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">موجود مسبقاً</span>}
                        {isInternalDuplicate && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">مكرر بالنص</span>}
                      </div>
                      <button 
                        onClick={() => setPreviewChapter(ch)} 
                        className="flex items-center justify-center gap-1 text-xs text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-2 py-1 rounded transition-colors self-start sm:self-auto"
                      >
                        <Eye className="w-3 h-3" />
                        معاينة
                      </button>
                    </div>
                    <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">
                      {ch.content}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveChapters}
                disabled={selectedIndices.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                حفظ ({selectedIndices.size})
              </button>
            </div>
          </div>
        </div>
      )}

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
