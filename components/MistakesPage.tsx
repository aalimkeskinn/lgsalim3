import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, updateDoc, where, Timestamp } from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import Header from './Header';
import type { MistakeEntry } from '../types';

interface MistakesPageProps {
  user: User;
}

const MistakesPage: React.FC<MistakesPageProps> = ({ user }) => {
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'reviewed' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const todayStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'mistakes'),
      where('kullaniciId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: MistakeEntry[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        items.push({
          id: d.id,
          kullaniciId: data.kullaniciId,
          testResultId: data.testResultId,
          dersAdi: data.dersAdi,
          topics: data.topics || [],
          note: data.note || '',
          imageUrl: data.imageUrl || undefined,
          createdAt: data.createdAt,
          nextReviewAt: data.nextReviewAt,
          status: data.status || 'open',
        });
      });
      // sort client-side by createdAt desc
      items.sort((a, b) => {
        const ta = (a.createdAt && (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime())) || 0;
        const tb = (b.createdAt && (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime())) || 0;
        return tb - ta;
      });
      setMistakes(items);
    });
    return () => unsub();
  }, [user.uid]);

  const courses = useMemo(() => {
    const s = new Set<string>();
    mistakes.forEach((m) => s.add(m.dersAdi));
    return ['all', ...Array.from(s)];
  }, [mistakes]);

  const topics = useMemo(() => {
    if (filterCourse === 'all') return ['all'];
    const s = new Set<string>();
    mistakes
      .filter((m) => m.dersAdi === filterCourse)
      .forEach((m) => (m.topics || []).forEach((t) => s.add(t)));
    return ['all', ...Array.from(s)];
  }, [mistakes, filterCourse]);

  const filtered = useMemo(() => {
    return mistakes.filter((m) => {
      if (filterCourse !== 'all' && m.dersAdi !== filterCourse) return false;
      if (filterTopic !== 'all' && !(m.topics || []).includes(filterTopic)) return false;
      if (filterStatus !== 'all' && m.status !== filterStatus) return false;
      if (search.trim()) {
        const txt = (m.note || '').toLowerCase();
        const q = search.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [mistakes, filterCourse, filterTopic, filterStatus, search]);

  const dueToday = useMemo(() => {
    const t0 = todayStart.getTime();
    return mistakes.filter((m) => {
      if (m.status !== 'open') return false;
      const nr = m.nextReviewAt as any;
      if (!nr) return true; // hiç planlanmamışsa bugün göster
      const ts = nr.toMillis ? nr.toMillis() : (typeof nr === 'number' ? nr : new Date(nr).getTime());
      return ts <= t0 + 24*60*60*1000 - 1; // bugün içinde veya geçmiş
    });
  }, [mistakes, todayStart]);

  const updateStatus = async (id: string, status: 'open' | 'reviewed' | 'archived') => {
    try {
      await updateDoc(doc(db, 'mistakes', id), { status });
      setToast({ message: 'Durum güncellendi.', type: 'success' });
      setTimeout(() => setToast(null), 1500);
    } catch (e) {
      setToast({ message: 'Durum güncellenemedi.', type: 'error' });
      setTimeout(() => setToast(null), 2000);
    }
  };

  const postpone = async (id: string, days: number) => {
    try {
      const next = new Date();
      next.setDate(next.getDate() + days);
      await updateDoc(doc(db, 'mistakes', id), { nextReviewAt: Timestamp.fromDate(next) });
      setToast({ message: `Tekrar ${days} gün ertelendi.`, type: 'success' });
      setTimeout(() => setToast(null), 1500);
    } catch (e) {
      setToast({ message: 'Erteleme başarısız.', type: 'error' });
      setTimeout(() => setToast(null), 2000);
    }
  };

  const smartReview = async (id: string, current?: MistakeEntry) => {
    try {
      // Spaced repetition: none -> 3g, <=3g -> 7g, <=7g -> 14g, else -> 30g
      let days = 3;
      if (current?.nextReviewAt) {
        const base = todayStart.getTime();
        const ts = (current.nextReviewAt as any).toMillis ? (current.nextReviewAt as any).toMillis() : new Date(current.nextReviewAt as any).getTime();
        const diffDays = Math.ceil((ts - base) / (24*60*60*1000));
        if (diffDays <= 3) days = 7; else if (diffDays <= 7) days = 14; else days = 30;
      }
      const next = new Date();
      next.setDate(next.getDate() + days);
      await updateDoc(doc(db, 'mistakes', id), { status: 'reviewed', nextReviewAt: Timestamp.fromDate(next) });
      setToast({ message: `Gözden geçirildi • sonraki: ${days} gün`, type: 'success' });
      setTimeout(() => setToast(null), 1500);
    } catch (e) {
      setToast({ message: 'Gözden geçirme başarısız.', type: 'error' });
      setTimeout(() => setToast(null), 2000);
    }
  };

  const bulkPostpone = async (days: number) => {
    try {
      await Promise.all(dueToday.map(m => {
        const next = new Date();
        next.setDate(next.getDate() + days);
        return updateDoc(doc(db, 'mistakes', m.id), { nextReviewAt: Timestamp.fromDate(next) });
      }));
      setToast({ message: `Seçili ${dueToday.length} kayıt +${days}g ertelendi.`, type: 'success' });
      setTimeout(() => setToast(null), 1500);
    } catch (e) {
      setToast({ message: 'Toplu erteleme başarısız.', type: 'error' });
      setTimeout(() => setToast(null), 2000);
    }
  };

  const bulkSmartReview = async () => {
    try {
      await Promise.all(dueToday.map(m => smartReview(m.id, m)));
      setToast({ message: `Seçili ${dueToday.length} kayıt gözden geçirildi.`, type: 'success' });
      setTimeout(() => setToast(null), 1500);
    } catch (e) {
      setToast({ message: 'Toplu gözden geçirme başarısız.', type: 'error' });
      setTimeout(() => setToast(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={user} onLogout={() => signOut(auth)} />
      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 py-4">
        {/* Bugün Tekrar Paneli */}
        <div className="bg-white border border-emerald-200 rounded-lg shadow-sm p-2.5 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-emerald-800">Bugün Tekrar</h2>
              <p className="text-[10px] text-gray-500">nextReviewAt bugün veya öncesi olan açık kayıtlar</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={()=>bulkPostpone(3)} className="px-1.5 py-0.5 text-[10px] border rounded">Tümü +3g</button>
              <button onClick={()=>bulkPostpone(7)} className="px-1.5 py-0.5 text-[10px] border rounded">Tümü +7g</button>
              <button onClick={bulkSmartReview} className="px-1.5 py-0.5 text-[10px] border rounded">Tümü Gözden</button>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{dueToday.length}</span>
            </div>
          </div>
          {dueToday.length === 0 ? (
            <p className="mt-2 text-[11px] text-gray-500">Bugün tekrar edilecek kayıt yok.</p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100">
              {dueToday.slice(0, 8).map((m) => (
                <li key={m.id} className="py-1.5 flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-medium text-gray-900">{m.dersAdi}</span>
                      {(m.topics || []).slice(0,1).map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px]">{t}</span>
                      ))}
                    </div>
                    {m.note && <p className="text-[10px] text-gray-600 truncate">{m.note}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={()=>postpone(m.id, 3)} className="px-1.5 py-0.5 text-[10px] border rounded">+3g</button>
                    <button onClick={()=>postpone(m.id, 7)} className="px-1.5 py-0.5 text-[10px] border rounded">+7g</button>
                    <button onClick={()=>smartReview(m.id, m)} className="px-1.5 py-0.5 text-[10px] border rounded">Gözden</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Hata Defteri</h1>
            <p className="text-xs text-gray-500">Kayıtlarını filtrele, gözden geçir ve arşivle.</p>
          </div>
          <a href="#dashboard" className="text-xs text-emerald-700 hover:underline">← Panel</a>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-2.5 mb-3">
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="flex items-center gap-2">
              <select value={filterCourse} onChange={(e)=>{ setFilterCourse(e.target.value); setFilterTopic('all'); }} className="rounded border-gray-300 bg-white text-[11px] py-1 px-2">
                {courses.map(c => <option key={c} value={c}>{c==='all'?'Tüm Dersler':c}</option>)}
              </select>
              <select value={filterTopic} onChange={(e)=> setFilterTopic(e.target.value)} className="rounded border-gray-300 bg-white text-[11px] py-1 px-2">
                {topics.map(t => <option key={t} value={t}>{t==='all'?'Tüm Konular':t}</option>)}
              </select>
              <select value={filterStatus} onChange={(e)=> setFilterStatus(e.target.value as any)} className="rounded border-gray-300 bg-white text-[11px] py-1 px-2">
                <option value="all">Tüm Durumlar</option>
                <option value="open">Açık</option>
                <option value="reviewed">Gözden</option>
                <option value="archived">Arşiv</option>
              </select>
            </div>
            <div className="flex-1" />
            <input value={search} onChange={(e)=> setSearch(e.target.value)} className="w-full sm:w-64 rounded border-gray-300 bg-white text-[11px] py-1 px-2" placeholder="Not içinde ara..." />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">Kayıt bulunamadı.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((m) => (
                <li key={m.id} className="p-2.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-900">{m.dersAdi}</span>
                      {(m.topics || []).slice(0,1).map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px]">{t}</span>
                      ))}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] border ${m.status==='open'?'bg-amber-50 text-amber-700 border-amber-200': m.status==='reviewed'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-gray-50 text-gray-600 border-gray-200'}`}>{m.status}</span>
                    </div>
                    {m.note && <p className="text-[11px] text-gray-600 mt-0.5">{m.note}</p>}
                    {m.imageUrl && (
                      <div className="mt-1">
                        <a href={m.imageUrl} target="_blank" rel="noreferrer" className="text-[11px] text-sky-700 underline">Görseli aç</a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {m.status !== 'open' && (
                      <button onClick={()=>updateStatus(m.id,'open')} className="px-1.5 py-0.5 text-[10px] border rounded">Açık</button>
                    )}
                    {m.status !== 'reviewed' && (
                      <button onClick={()=>updateStatus(m.id,'reviewed')} className="px-1.5 py-0.5 text-[10px] border rounded">Gözden</button>
                    )}
                    {m.status !== 'archived' && (
                      <button onClick={()=>updateStatus(m.id,'archived')} className="px-1.5 py-0.5 text-[10px] border rounded">Arşiv</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {toast && (
          <div className={`fixed bottom-4 right-4 px-3 py-2 rounded text-white text-sm ${toast.type==='success'?'bg-emerald-600':'bg-rose-600'}`}>{toast.message}</div>
        )}
      </main>
    </div>
  );
};

export default MistakesPage;
