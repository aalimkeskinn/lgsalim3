import React, { useState, useEffect } from 'react';
import { getCourseTopics } from '../data/topics';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dersAdi: string, dogru: number, yanlis: number, bos: number, topics: string[]) => Promise<void> | void;
  courseOptions: string[];
  defaultCourse?: string;
}

const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, onSave, courseOptions, defaultCourse = 'all' }) => {
  const [ders, setDers] = useState<string>('');
  const [dogru, setDogru] = useState<string>('');
  const [yanlis, setYanlis] = useState<string>('0');
  const [bos, setBos] = useState<string>('0');
  const [topic, setTopic] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initial = defaultCourse && defaultCourse !== 'all' ? defaultCourse : (courseOptions.find(c => c !== 'all') || '');
      setDers(initial);
      setDogru('');
      setYanlis('0');
      setBos('0');
      setTopic('');
      setSaving(false);
      setError(null);
      // focus first numeric input shortly after open
      setTimeout(() => {
        const el = document.querySelector<HTMLInputElement>('input[type="number"]');
        el?.focus();
      }, 0);
    }
  }, [isOpen, defaultCourse, courseOptions]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!saving) void handleSave();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!ders || dogru === '' || yanlis === '' || bos === '') {
      setError('Tüm alanları doldurun');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const topics = topic ? [topic] : [];
      await onSave(ders, parseInt(dogru, 10) || 0, parseInt(yanlis, 10) || 0, parseInt(bos, 10) || 0, topics);
      onClose();
    } catch (e) {
      setError('Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Hızlı Ekle</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm">✕</button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <label className="text-[11px] text-gray-600">Ders</label>
          <select
            value={ders}
            onChange={(e) => setDers(e.target.value)}
            className="rounded border-gray-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 py-1 px-2 text-xs"
          >
            {courseOptions.filter(Boolean).map(opt => (
              <option key={opt} value={opt}>{opt === 'all' ? 'Tüm Dersler' : opt}</option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-gray-600">Doğru</label>
              <input
                type="number"
                value={dogru}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  if (digits === '') return setDogru('');
                  const n = Math.min(50, parseInt(digits, 10));
                  setDogru(String(n));
                }}
                min={0}
                max={50}
                className="w-full rounded border-gray-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 py-1 px-2 text-xs text-right"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-600">Yanlış</label>
              <input
                type="number"
                value={yanlis}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  if (digits === '') return setYanlis('');
                  const n = Math.min(50, parseInt(digits, 10));
                  setYanlis(String(n));
                }}
                min={0}
                max={50}
                className="w-full rounded border-gray-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 py-1 px-2 text-xs text-right"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-600">Boş</label>
              <input
                type="number"
                value={bos}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  if (digits === '') return setBos('');
                  const n = Math.min(50, parseInt(digits, 10));
                  setBos(String(n));
                }}
                min={0}
                max={50}
                className="w-full rounded border-gray-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 py-1 px-2 text-xs text-right"
                placeholder="0"
              />
            </div>
          </div>
          <div className="mt-2">
            <label className="text-[11px] text-gray-600">Konu (opsiyonel)</label>
            <select
              value={topic}
              onChange={(e)=> setTopic(e.target.value)}
              className="w-full rounded border-gray-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 py-1 px-2 text-xs"
            >
              <option value="">— Seçim yok —</option>
              {getCourseTopics(ders).map((t)=> (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-[11px] text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2 mt-1">
            <button onClick={onClose} className="text-[11px] px-2 py-1 rounded border border-gray-300">Vazgeç</button>
            <button onClick={handleSave} disabled={saving} className="text-[11px] px-2 py-1 rounded bg-emerald-600 text-white disabled:opacity-60">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickAddModal;
