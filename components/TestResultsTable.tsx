import React, { useState } from 'react';
import type { TestResult } from '../types';
import TrashIcon from './icons/TrashIcon';
import SaveIcon from './icons/SaveIcon';
import Spinner from './Spinner';
import EditIcon from './icons/EditIcon';
import XCircleIcon from './icons/XCircleIcon';
import ChevronSortIcon from './icons/ChevronSortIcon';
import { getCourseTopics } from '../data/topics';


interface TestResultsTableProps {
  results: TestResult[];
  currentUserId: string;
  onDelete: (id: string) => void;
  onAddResult: (dersAdi: string, dogruSayisi: number, yanlisSayisi: number, bosSayisi: number, topics: string[]) => Promise<void>;
  onUpdateResult: (id: string, dersAdi: string, dogruSayisi: number, yanlisSayisi: number, bosSayisi: number, topics: string[]) => Promise<void>;
  onAddMistake: (result: TestResult) => void;
  currentUserEmail: string;
  isAdding: boolean;
  onCancelAdd: () => void;
  sortConfig: { key: keyof TestResult; direction: 'ascending' | 'descending' } | null;
  requestSort: (key: keyof TestResult) => void;
  isCompact: boolean;
}

const getSuccessRate = (dogru: number, yanlis: number, bos: number = 0): { percentage: number; display: string, net: number } => {
  const safeDogru = dogru || 0;
  const safeYanlis = yanlis || 0;
  const safeBos = bos || 0;
  const total = safeDogru + safeYanlis + safeBos;
  const net = safeDogru - (safeYanlis / 4);
  if (total === 0) {
    return { percentage: 0, display: '0%', net: 0 };
  }
  const percentage = Math.round((Math.max(0, net) / total) * 100);
  return { percentage, display: `${percentage}%`, net };
};

const getProgressBarColor = (percentage: number): string => {
  if (percentage >= 70) return 'bg-[#4CAF50]'; // Green
  if (percentage >= 60) return 'bg-[#FFC107]'; // Yellow
  return 'bg-[#F44336]'; // Red
};

// Colored label styles for percentage pill
const getRateLabelClasses = (percentage: number): string => {
  if (percentage >= 70) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (percentage >= 60) return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-rose-50 text-rose-700 border border-rose-200';
};


interface InputRowProps {
  onAddResult: (dersAdi: string, dogruSayisi: number, yanlisSayisi: number, bosSayisi: number, topics: string[]) => Promise<void>;
  currentUserEmail: string;
  onCancel: () => void;
  isCompact: boolean;
}

const InputRow: React.FC<InputRowProps> = ({ onAddResult, currentUserEmail, onCancel, isCompact }) => {
    const [dersAdi, setDersAdi] = useState('');
    const [dogruSayisi, setDogruSayisi] = useState('');
    const [yanlisSayisi, setYanlisSayisi] = useState('');
    const [bosSayisi, setBosSayisi] = useState('');
    const [topics, setTopics] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!dersAdi || dogruSayisi === '' || yanlisSayisi === '' || bosSayisi === '') {
            setError("Tüm alanlar doldurulmalıdır.");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await onAddResult(dersAdi, parseInt(dogruSayisi, 10), parseInt(yanlisSayisi, 10), parseInt(bosSayisi, 10), topics);
        } catch (err) {
            console.error("Error in handleSave:", err);
        } finally {
            setLoading(false);
        }
    };

    const cellPadding = isCompact ? 'px-1 py-0.5' : 'px-2 py-1';

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSave();
      }
    };

    return (
        <tr className="bg-yellow-50 border-b">
            <td className={`${cellPadding} border-r border-l border-gray-300`}>
                <select
                    value={dersAdi}
                    onChange={(e) => { setDersAdi(e.target.value); setTopics([]); }}
                    onKeyDown={handleKeyDown}
                    className={`w-full bg-transparent focus:outline-none ${isCompact ? 'p-1 text-[10px]' : 'p-1.5 text-xs'}`}
                    required
                >
                    <option value="" disabled>Bir ders seçin</option>
                    <option value="Türkçe">Türkçe</option>
                    <option value="Matematik">Matematik</option>
                    <option value="Fen Bilgisi">Fen Bilgisi</option>
                    <option value="Sosyal Bilgiler">Sosyal Bilgiler</option>
                    <option value="Din Kültürü">Din Kültürü</option>
                    <option value="İngilizce">İngilizce</option>
                </select>
            </td>
            <td className={`${cellPadding} border-r border-gray-300 w-44`}>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500">Konu</label>
                <div className={`border border-gray-300 rounded ${isCompact ? 'p-1' : 'p-1.5'} bg-white max-h-20 overflow-auto`}> 
                  <div className="grid grid-cols-1 gap-1">
                    {getCourseTopics(dersAdi).map((t) => {
                      const checked = topics[0] === t;
                      return (
                        <label key={t} className="inline-flex items-center gap-1 text-[10px] text-gray-700">
                          <input
                            type="radio"
                            name="topic-select-add"
                            className="h-3 w-3 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            checked={checked}
                            onChange={() => setTopics([t])}
                          />
                          <span>{t}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                {topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {topics.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px]">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-1">
                  <button type="button" onClick={() => setTopics([])} className="text-[10px] text-gray-500 hover:text-gray-700 underline">Seçimi temizle</button>
                </div>
              </div>
            </td>
            <td className={`${cellPadding} border-r border-gray-300 w-28`}>
                 <input
                    type="number"
                    value={dogruSayisi}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      if (digits === '') return setDogruSayisi('');
                      const n = Math.min(50, parseInt(digits, 10));
                      setDogruSayisi(String(n));
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="0"
                    min="0"
                    max="50"
                    className={`w-full bg-transparent focus:outline-none ${isCompact ? 'p-1 text-[10px]' : 'p-1.5 text-xs'} text-right`}
                />
            </td>
            <td className={`${cellPadding} border-r border-gray-300 w-28`}>
                <input
                    type="number"
                    value={yanlisSayisi}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      if (digits === '') return setYanlisSayisi('');
                      const n = Math.min(50, parseInt(digits, 10));
                      setYanlisSayisi(String(n));
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="0"
                    min="0"
                    max="50"
                    className={`w-full bg-transparent focus:outline-none ${isCompact ? 'p-1 text-[10px]' : 'p-1.5 text-xs'} text-right`}
                />
            </td>
            <td className={`${cellPadding} border-r border-gray-300 w-28`}>
                <input
                    type="number"
                    value={bosSayisi}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      if (digits === '') return setBosSayisi('');
                      const n = Math.min(50, parseInt(digits, 10));
                      setBosSayisi(String(n));
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="0"
                    min="0"
                    max="50"
                    className={`w-full bg-transparent focus:outline-none ${isCompact ? 'p-1 text-[10px]' : 'p-1.5 text-xs'} text-right`}
                />
            </td>
            <td className={`${cellPadding} border-r border-gray-300 w-28`}>{((Number(dogruSayisi) || 0) - (Number(yanlisSayisi) || 0) / 4).toFixed(2)}</td>
            <td className={`${cellPadding} border-r border-gray-300 w-48`}></td>
            <td className={`${cellPadding} border-r border-gray-300 truncate`}>
                {currentUserEmail}
            </td>
            <td className={`${cellPadding} border-r border-gray-300 w-32 text-center`}>
                <div className="flex items-center justify-center gap-1">
                    <button onClick={handleSave} disabled={loading} className={`${isCompact ? 'p-1' : 'p-1.5'} text-green-600 hover:bg-green-100 rounded-full`}>
                        {loading ? <Spinner /> : <SaveIcon />}
                    </button>
                    <button onClick={onCancel} disabled={loading} className={`${isCompact ? 'p-1' : 'p-1.5'} text-red-600 hover:bg-red-100 rounded-full`}>
                        <XCircleIcon />
                    </button>
                </div>
                {error && <p className="text-red-500 text-xs mt-1 text-center">{error}</p>}
            </td>
        </tr>
    );
};


const TestResultsTable: React.FC<TestResultsTableProps> = ({ results, currentUserId, onDelete, onAddResult, onUpdateResult, onAddMistake, currentUserEmail, isAdding, onCancelAdd, sortConfig, requestSort, isCompact }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ dersAdi: '', dogruSayisi: '', yanlisSayisi: '', bosSayisi: '', topics: [] as string[] });
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  
  const handleEditClick = (result: TestResult) => {
    setEditingId(result.id);
    setEditFormData({
        dersAdi: result.dersAdi,
        dogruSayisi: String(result.dogruSayisi),
        yanlisSayisi: String(result.yanlisSayisi),
        bosSayisi: String(result.bosSayisi || 0),
        topics: (result.topics || []) as string[]
    });
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'dogruSayisi' || name === 'yanlisSayisi' || name === 'bosSayisi') {
        const digits = value.replace(/\D/g, '');
        const next = digits === '' ? '' : String(Math.min(50, parseInt(digits, 10)));
        setEditFormData(prev => ({ ...prev, [name]: next }));
    } else {
        setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  const handleEditTopicsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const opts = Array.from(e.target.selectedOptions).map(o => o.value);
    setEditFormData(prev => ({ ...prev, topics: opts.slice(0, 10) }));
  };

  const handleSaveUpdate = async (id: string) => {
    if (!editFormData.dersAdi || editFormData.dogruSayisi === '' || editFormData.yanlisSayisi === '' || editFormData.bosSayisi === '') {
        setEditError("Tüm alanlar doldurulmalıdır.");
        return;
    }
    setEditError(null);
    setIsSaving(true);
    try {
        await onUpdateResult(
            id,
            editFormData.dersAdi,
            parseInt(editFormData.dogruSayisi, 10),
            parseInt(editFormData.yanlisSayisi, 10),
            parseInt(editFormData.bosSayisi, 10),
            editFormData.topics
        );
        setEditingId(null);
    } catch (error) {
        // Error toast is shown in parent component
    } finally {
        setIsSaving(false);
    }
  };

  const cellPadding = isCompact ? 'px-1 py-0.5' : 'px-2 py-1';
  const headerPadding = isCompact ? 'px-1.5 py-1.5' : 'px-2 py-2';
  
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
        <table className="w-full text-xs text-left text-gray-700">
          <thead className="text-[10px] text-gray-700 uppercase bg-gradient-to-b from-gray-100 to-gray-200">
            <tr>
              <th scope="col" className={`${headerPadding} border-r border-gray-200`}>
                <button onClick={() => requestSort('dersAdi')} className="flex items-center gap-1 w-full">
                  Ders Adı <ChevronSortIcon columnKey="dersAdi" sortConfig={sortConfig} />
                </button>
              </th>
              <th scope="col" className={`${headerPadding} border-r border-gray-200 w-44`}>
                Konular
              </th>
              <th scope="col" className={`${headerPadding} border-r border-gray-200 w-28 text-center`}>
                <button onClick={() => requestSort('dogruSayisi')} className="flex items-center gap-1 w-full justify-center">
                  Doğru <ChevronSortIcon columnKey="dogruSayisi" sortConfig={sortConfig} />
                </button>
              </th>
              <th scope="col" className={`${headerPadding} border-r border-gray-200 w-28 text-center`}>
                <button onClick={() => requestSort('yanlisSayisi')} className="flex items-center gap-1 w-full justify-center">
                  Yanlış <ChevronSortIcon columnKey="yanlisSayisi" sortConfig={sortConfig} />
                </button>
              </th>
              <th scope="col" className={`${headerPadding} border-r border-gray-200 w-28 text-center`}>
                <button onClick={() => requestSort('bosSayisi')} className="flex items-center gap-1 w-full justify-center">
                  Boş <ChevronSortIcon columnKey="bosSayisi" sortConfig={sortConfig} />
                </button>
              </th>
              <th scope="col" className={`${headerPadding} border-r border-gray-200 w-28 text-center`}>Net</th>
              <th scope="col" className={`${headerPadding} border-r border-gray-200 w-48 text-center`}>Başarı Oranı</th>
              <th scope="col" className={`${headerPadding} border-r border-gray-200`}>
                <button onClick={() => requestSort('kullaniciEmail')} className="flex items-center gap-1 w-full">
                  E-posta <ChevronSortIcon columnKey="kullaniciEmail" sortConfig={sortConfig} />
                </button>
              </th>
              <th scope="col" className={`${headerPadding} w-32 text-center`}>Eylemler</th>
            </tr>
          </thead>
          <tbody>
            {isAdding && <InputRow onAddResult={onAddResult} currentUserEmail={currentUserEmail} onCancel={onCancelAdd} isCompact={isCompact} />}

            {results.map((result, index) => {
              const isEditing = editingId === result.id;
              const rowClass = `${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50/70 transition-colors`;

              if (isEditing) {
                const { percentage, net } = getSuccessRate(
                  Number(editFormData.dogruSayisi) || 0, 
                  Number(editFormData.yanlisSayisi) || 0, 
                  Number(editFormData.bosSayisi) || 0
                );
                const barColor = getProgressBarColor(percentage);
                const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleSaveUpdate(result.id);
                  }
                };
                return (
                  <tr key={result.id} className="bg-yellow-50 border-b">
                    <td className={`${cellPadding} border-r border-l border-gray-300`}>
                      <input type="text" name="dersAdi" value={editFormData.dersAdi} onChange={handleFormChange} onKeyDown={handleEditKeyDown} className="w-full bg-transparent focus:outline-none focus:ring-2 focus:ring-yellow-500 p-2"/>
                    </td>
                    <td className={`${cellPadding} border-r border-gray-300 w-44`}>
                      <div className="flex flex-col gap-1">
                        <div className={`border border-gray-300 rounded ${isCompact ? 'p-1' : 'p-1.5'} bg-white max-h-20 overflow-auto`}>
                          <div className="grid grid-cols-1 gap-1">
                            {getCourseTopics(editFormData.dersAdi).map((t) => {
                              const checked = (editFormData.topics[0] || '') === t;
                              return (
                                <label key={t} className="inline-flex items-center gap-1 text-[10px] text-gray-700">
                                  <input
                                    type="radio"
                                    name={`topic-select-${editingId || 'edit'}`}
                                    className="h-3 w-3 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    checked={checked}
                                    onChange={() => setEditFormData((prev) => ({ ...prev, topics: [t] }))}
                                  />
                                  <span>{t}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        {editFormData.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {editFormData.topics.map((t) => (
                              <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px]">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-1">
                          <button type="button" onClick={() => setEditFormData((prev)=>({ ...prev, topics: [] }))} className="text-[10px] text-gray-500 hover:text-gray-700 underline">Seçimi temizle</button>
                        </div>
                      </div>
                    </td>
                    <td className={`${cellPadding} border-r border-gray-300 w-28`}>
                      <input type="number" name="dogruSayisi" value={editFormData.dogruSayisi} onChange={handleFormChange} onKeyDown={handleEditKeyDown} min="0" max="50" className="w-full bg-transparent focus:outline-none focus:ring-2 focus:ring-yellow-500 p-2 text-right" />
                    </td>
                    <td className={`${cellPadding} border-r border-gray-300 w-28`}>
                      <input type="number" name="yanlisSayisi" value={editFormData.yanlisSayisi} onChange={handleFormChange} onKeyDown={handleEditKeyDown} min="0" max="50" className="w-full bg-transparent focus:outline-none focus:ring-2 focus:ring-yellow-500 p-2 text-right" />
                    </td>
                    <td className={`${cellPadding} border-r border-gray-300 w-28`}>
                      <input type="number" name="bosSayisi" value={editFormData.bosSayisi} onChange={handleFormChange} onKeyDown={handleEditKeyDown} min="0" max="50" className="w-full bg-transparent focus:outline-none focus:ring-2 focus:ring-yellow-500 p-2 text-right" />
                    </td>
                    <td className={`${cellPadding} text-right border-r border-gray-300 w-28`}>{net.toFixed(2)}</td>
                    <td className={`${cellPadding} border-r border-gray-300 w-48`}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-full h-1.5 bg-gray-100 rounded-full">
                          <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="font-medium text-gray-700 text-[10px]">{percentage}%</span>
                      </div>
                    </td>
                    <td className={`${cellPadding} border-r border-gray-300 truncate`}>{result.kullaniciEmail}</td>
                    <td className={`${cellPadding} border-r border-gray-300 w-32`}>
                      <div className="flex justify-center items-center gap-1">
                        <button onClick={() => handleSaveUpdate(result.id)} disabled={isSaving} className="p-1.5 text-green-600 hover:bg-green-100 rounded-full disabled:opacity-50" aria-label="Kaydet">
                          {isSaving ? <Spinner /> : <SaveIcon />}
                        </button>
                        <button onClick={handleCancelEdit} disabled={isSaving} className="p-1.5 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50" aria-label="İptal">
                          <XCircleIcon />
                        </button>
                      </div>
                      {editError && <p className="text-red-500 text-xs mt-1 text-center">{editError}</p>}
                    </td>
                  </tr>
                );
              }

              const { percentage, display, net } = getSuccessRate(
                result.dogruSayisi || 0, 
                result.yanlisSayisi || 0, 
                result.bosSayisi || 0
              );
              const barColor = getProgressBarColor(percentage);
              return (
              <tr key={result.id} className={`${rowClass} border-b`}>
                <td className={`${cellPadding} font-medium text-gray-900 border-r border-l border-gray-200`}>{result.dersAdi}</td>
                <td className={`${cellPadding} border-r border-gray-200`}>
                  <div className="flex flex-wrap gap-1">
                    {(result.topics || []).map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200 text-[10px]" title={t}>{t}</span>
                    ))}
                  </div>
                </td>
                <td className={`${cellPadding} text-right border-r border-gray-200`}>{result.dogruSayisi}</td>
                <td className={`${cellPadding} text-right border-r border-gray-200`}>{result.yanlisSayisi}</td>
                <td className={`${cellPadding} text-right border-r border-gray-200`}>{result.bosSayisi || 0}</td>
                <td className={`${cellPadding} text-right border-r border-gray-200 ${percentage >= 70 ? 'text-emerald-700' : percentage >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>{net.toFixed(2)}</td>
                <td className={`${cellPadding} border-r border-gray-200`}>
                    <div className="flex items-center gap-1.5">
                        <div className="w-full h-1.5 bg-gray-100 rounded-full">
                            <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${getRateLabelClasses(percentage)}`}>{display}</span>
                    </div>
                </td>
                <td className={`${cellPadding} border-r border-gray-200 truncate`} title={result.kullaniciEmail}>{result.kullaniciEmail}</td>
                <td className={`${cellPadding} border-r border-gray-200`}>
                  {result.kullaniciId === currentUserId && (
                    <div className="flex justify-center items-center gap-1">
                       <button
                          onClick={() => handleEditClick(result)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full"
                          aria-label="Düzenle"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => onAddMistake(result)}
                          className="px-1.5 py-0.5 text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded"
                          title="Hata Defteri'ne Ekle"
                        >
                          Hata Defteri
                        </button>
                        <button
                          onClick={() => onDelete(result.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-full"
                          aria-label="Sil"
                        >
                          <TrashIcon />
                        </button>
                    </div>
                  )}
                </td>
              </tr>
            )})}
             {results.length === 0 && !isAdding && (
              <tr className="bg-white">
                    <td colSpan={9} className="text-center text-gray-500 py-8 border border-gray-300">
                        <p>Henüz test sonucu eklenmemiş.</p>
                        <p className="text-xs">Başlamak için yukarıdaki "Yeni Sonuç Ekle" butonunu kullanın.</p>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
    </div>
  );
};

export default TestResultsTable;