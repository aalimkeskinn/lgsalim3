import React, { useEffect, useState } from 'react';

interface MistakeModalProps {
  isOpen: boolean;
  dersAdi: string;
  topicOptions: string[];
  defaultTopic?: string;
  onClose: () => void;
  onSave: (payload: { topic: string | null; note: string; imageUrl?: string }) => Promise<void> | void;
}

const MistakeModal: React.FC<MistakeModalProps> = ({ isOpen, dersAdi, topicOptions, defaultTopic, onClose, onSave }) => {
  const [topic, setTopic] = useState<string>(defaultTopic || '');
  const [note, setNote] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTopic(defaultTopic || '');
      setNote('');
      setImageUrl('');
    }
  }, [isOpen, defaultTopic]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ topic: topic || null, note, imageUrl: imageUrl || undefined });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Hata Defteri'ne Ekle</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        <div className="space-y-2">
          <div>
            <label className="block text-[11px] text-gray-600">Ders</label>
            <input value={dersAdi} disabled className="w-full rounded border border-gray-300 bg-gray-50 text-xs px-2 py-1" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-600">Konu (opsiyonel)</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white text-xs px-2 py-1"
            >
              <option value="">— Seçim yok —</option>
              {topicOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-600">Not</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded border border-gray-300 bg-white text-xs px-2 py-1"
              placeholder="Kısa açıklama..."
            />
            <div className="text-[10px] text-gray-500 text-right">{note.length}/500</div>
          </div>
          <div>
            <label className="block text-[11px] text-gray-600">Görsel URL (opsiyonel)</label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white text-xs px-2 py-1"
              placeholder="https://..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="px-2 py-1 text-xs rounded border border-gray-300">Vazgeç</button>
          <button onClick={handleSave} disabled={saving} className="px-2 py-1 text-xs rounded bg-emerald-600 text-white disabled:opacity-60">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MistakeModal;
