import React, { useEffect, useMemo, useState } from 'react';

interface BranchInputs {
  dogru: string;
  yanlis: string;
  bos: string;
}

interface ExamAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    ad?: string;
    yayin?: string;
    yabanciDilTur?: 'ingilizce'|'almanca'|'fransizca'|'italyanca';
    turkce: { dogru: number; yanlis: number; bos: number };
    matematik: { dogru: number; yanlis: number; bos: number };
    fen: { dogru: number; yanlis: number; bos: number };
    inkilap: { dogru: number; yanlis: number; bos: number };
    din: { dogru: number; yanlis: number; bos: number };
    ingilizce: { dogru: number; yanlis: number; bos: number };
  }) => Promise<void> | void;
  title?: string;
  initialData?: Partial<{
    ad?: string;
    yayin?: string;
    yabanciDilTur?: 'ingilizce'|'almanca'|'fransizca'|'italyanca';
    turkce: { dogru: number; yanlis: number; bos: number };
    matematik: { dogru: number; yanlis: number; bos: number };
    fen: { dogru: number; yanlis: number; bos: number };
    inkilap: { dogru: number; yanlis: number; bos: number };
    din: { dogru: number; yanlis: number; bos: number };
    ingilizce: { dogru: number; yanlis: number; bos: number };
  }>;
}

const clampNumMax = (s: string, max: number) => {
  const digits = s.replace(/\D/g, '');
  if (!digits) return '';
  return String(Math.min(max, parseInt(digits, 10)));
};

function netOf(b: BranchInputs): number {
  const d = Number(b.dogru || '0');
  const y = Number(b.yanlis || '0');
  return d - y / 3;
}

const ExamAddModal: React.FC<ExamAddModalProps> = ({ isOpen, onClose, onSave, title = 'Deneme Ekle', initialData }) => {
  const [ad, setAd] = useState('');
  const [yayin, setYayin] = useState('');
  const [turkce, setTurkce] = useState<BranchInputs>({ dogru: '', yanlis: '', bos: '' });
  const [matematik, setMatematik] = useState<BranchInputs>({ dogru: '', yanlis: '', bos: '' });
  const [fen, setFen] = useState<BranchInputs>({ dogru: '', yanlis: '', bos: '' });
  const [inkilap, setInkilap] = useState<BranchInputs>({ dogru: '', yanlis: '', bos: '' });
  const [din, setDin] = useState<BranchInputs>({ dogru: '', yanlis: '', bos: '' });
  const [ingilizce, setIngilizce] = useState<BranchInputs>({ dogru: '', yanlis: '', bos: '' });
  const [yabanciDilTur, setYabanciDilTur] = useState<'ingilizce'|'almanca'|'fransizca'|'italyanca'>('ingilizce');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAXS = { T: 20, M: 20, F: 20, I: 10, D: 10, E: 10 } as const;

  useEffect(() => {
    if (isOpen) {
      setAd(initialData?.ad || ''); setYayin(initialData?.yayin || '');
      setYabanciDilTur((initialData?.yabanciDilTur as any) || 'ingilizce');
      setTurkce({ dogru: initialData?.turkce?.dogru?.toString() || '', yanlis: initialData?.turkce?.yanlis?.toString() || '', bos: initialData?.turkce?.bos?.toString() || '' });
      setMatematik({ dogru: initialData?.matematik?.dogru?.toString() || '', yanlis: initialData?.matematik?.yanlis?.toString() || '', bos: initialData?.matematik?.bos?.toString() || '' });
      setFen({ dogru: initialData?.fen?.dogru?.toString() || '', yanlis: initialData?.fen?.yanlis?.toString() || '', bos: initialData?.fen?.bos?.toString() || '' });
      setInkilap({ dogru: initialData?.inkilap?.dogru?.toString() || '', yanlis: initialData?.inkilap?.yanlis?.toString() || '', bos: initialData?.inkilap?.bos?.toString() || '' });
      setDin({ dogru: initialData?.din?.dogru?.toString() || '', yanlis: initialData?.din?.yanlis?.toString() || '', bos: initialData?.din?.bos?.toString() || '' });
      setIngilizce({ dogru: initialData?.ingilizce?.dogru?.toString() || '', yanlis: initialData?.ingilizce?.yanlis?.toString() || '', bos: initialData?.ingilizce?.bos?.toString() || '' });
      setSaving(false); setError(null);
    }
  }, [isOpen, initialData]);

  const totalNet = useMemo(() => (
    netOf(turkce) + netOf(matematik) + netOf(fen) + netOf(inkilap) + netOf(din) + netOf(ingilizce)
  ), [turkce, matematik, fen, inkilap, din, ingilizce]);

  if (!isOpen) return null;

  const handleSave = async () => {
    // Basic validation (allow zeros but require inputs)
    const required = [turkce, matematik, fen, inkilap, din, ingilizce];
    if (required.some(b => b.dogru === '' || b.yanlis === '' || b.bos === '')) {
      setError('Tüm branş alanlarını doldurun');
      return;
    }
    setError(null); setSaving(true);
    try {
      await onSave({
        ad: ad.trim() || undefined,
        yayin: yayin.trim() || undefined,
        yabanciDilTur,
        turkce: { dogru: Number(turkce.dogru), yanlis: Number(turkce.yanlis), bos: Number(turkce.bos) },
        matematik: { dogru: Number(matematik.dogru), yanlis: Number(matematik.yanlis), bos: Number(matematik.bos) },
        fen: { dogru: Number(fen.dogru), yanlis: Number(fen.yanlis), bos: Number(fen.bos) },
        inkilap: { dogru: Number(inkilap.dogru), yanlis: Number(inkilap.yanlis), bos: Number(inkilap.bos) },
        din: { dogru: Number(din.dogru), yanlis: Number(din.yanlis), bos: Number(din.bos) },
        ingilizce: { dogru: Number(ingilizce.dogru), yanlis: Number(ingilizce.yanlis), bos: Number(ingilizce.bos) },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const Branch = (label: string, value: BranchInputs, setValue: (v: BranchInputs) => void, maxQ: number) => {
    const d = Number(value.dogru || '0');
    const y = Number(value.yanlis || '0');
    const b = Number(value.bos || '0');
    const over = d + y + b > maxQ;
    return (
      <div className="grid grid-cols-5 gap-1 items-end">
        <div className="col-span-2 text-[11px] text-gray-700 font-medium flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-gray-500">Max {maxQ}</span>
        </div>
        <input value={value.dogru} onChange={e=> setValue({ ...value, dogru: clampNumMax(e.target.value, maxQ) })} placeholder="Doğru" className="rounded border-gray-300 bg-white text-xs px-2 py-1" />
        <input value={value.yanlis} onChange={e=> setValue({ ...value, yanlis: clampNumMax(e.target.value, maxQ) })} placeholder="Yanlış" className="rounded border-gray-300 bg-white text-xs px-2 py-1" />
        <input value={value.bos} onChange={e=> setValue({ ...value, bos: clampNumMax(e.target.value, maxQ) })} placeholder="Boş" className="rounded border-gray-300 bg-white text-xs px-2 py-1" />
        {over && <div className="col-span-5 text-[10px] text-rose-600">Toplam (D+Y+B) {maxQ}'i aşamaz.</div>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-[11px] text-gray-600">Deneme Adı</label>
            <input value={ad} onChange={(e)=> setAd(e.target.value)} className="w-full rounded border-gray-300 bg-white text-xs px-2 py-1" placeholder="(opsiyonel)" />
          </div>
          <div>
            <label className="text-[11px] text-gray-600">Yayın/Kurum</label>
            <input value={yayin} onChange={(e)=> setYayin(e.target.value)} className="w-full rounded border-gray-300 bg-white text-xs px-2 py-1" placeholder="(opsiyonel)" />
          </div>
        </div>

        <div className="mb-2">
          <label className="text-[11px] text-gray-600">Yabancı Dil Türü</label>
          <select value={yabanciDilTur} onChange={e=> setYabanciDilTur(e.target.value as any)} className="w-full rounded border-gray-300 bg-white text-xs px-2 py-1">
            <option value="ingilizce">İngilizce</option>
            <option value="almanca">Almanca</option>
            <option value="fransizca">Fransızca</option>
            <option value="italyanca">İtalyanca</option>
          </select>
        </div>

        <div className="space-y-1">
          {Branch('Türkçe', turkce, setTurkce, MAXS.T)}
          {Branch('Matematik', matematik, setMatematik, MAXS.M)}
          {Branch('Fen Bilimleri', fen, setFen, MAXS.F)}
          {Branch('T.C. İnkılap', inkilap, setInkilap, MAXS.I)}
          {Branch('Din Kültürü', din, setDin, MAXS.D)}
          {Branch('Yabancı Dil', ingilizce, setIngilizce, MAXS.E)}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="text-[11px] text-gray-600">Toplam Net: <span className="font-semibold text-gray-900">{totalNet.toFixed(2)}</span></div>
          {error && <div className="text-[11px] text-rose-600">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-2 py-1 text-xs rounded border border-gray-300">Vazgeç</button>
          <button onClick={handleSave} disabled={saving} className="px-2 py-1 text-xs rounded bg-emerald-600 text-white disabled:opacity-60">Kaydet</button>
        </div>
      </div>
    </div>
  );
};

export default ExamAddModal;
