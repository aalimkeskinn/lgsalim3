import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot, Label, LabelList, CartesianGrid, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { User, signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import Header from './Header';
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import type { ExamResult } from '../types';
import ExamAddModal from './ExamAddModal';
import WidgetCard from './WidgetCard';

interface ExamsPageProps {
  user: User;
}

function net(d: number, y: number) { return d - y / 3; }

// Renk tokenları ve yardımcı formatlayıcılar
const SUBJECT_COLORS = {
  TR: '#0ea5e9', // Türkçe
  MAT: '#22c55e', // Matematik
  FEN: '#a855f7', // Fen
  INK: '#06b6d4', // İnkılap
  DIN: '#f59e0b', // Din
  ING: '#3b82f6', // İngilizce
} as const;
const SEM_COLORS = {
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#64748b',
} as const;
const fmt2 = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt1 = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const ExamsPage: React.FC<ExamsPageProps> = ({ user }) => {
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filterPublisher, setFilterPublisher] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editing, setEditing] = useState<ExamResult | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [scope, setScope] = useState<'self'|'school'>(() => {
    try { return (localStorage.getItem('exams_scope') as any) || 'self'; } catch { return 'self'; }
  });
  const [deletingSeed, setDeletingSeed] = useState(false);
  const [lastSeedId, setLastSeedId] = useState<string>(() => {
    try { return localStorage.getItem('last_seed_batch') || ''; } catch { return ''; }
  });
  const [wideView, setWideView] = useState<boolean>(() => {
    try { return localStorage.getItem('exams_wide') === '1'; } catch { return false; }
  });
  const [denseView, setDenseView] = useState<boolean>(() => {
    try { return localStorage.getItem('exams_dense') === '1'; } catch { return false; }
  });
  const [scoringMethod, setScoringMethod] = useState<'simple'|'zt'>(() => {
    try { return (localStorage.getItem('scoring_method') as any) || 'simple'; } catch { return 'simple'; }
  });
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [targetScore, setTargetScore] = useState<number>(() => {
    try { const v = localStorage.getItem('target_score'); return v ? Number(v) : 500; } catch { return 500; }
  });
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [editingMistake, setEditingMistake] = useState<any|null>(null);
  const [mistakeNote, setMistakeNote] = useState<string>('');
  const [viewTab, setViewTab] = useState<'trend'|'yayinlar'|'branslar'|'isi'|'tablo'>(() => {
    try { return (localStorage.getItem('exams_tab') as any) || 'trend'; } catch { return 'trend'; }
  });
  const [branchFilter, setBranchFilter] = useState<'all'|'T'|'M'|'F'|'I'|'D'|'E'>(() => {
    try { return (localStorage.getItem('exams_branch') as any) || 'all'; } catch { return 'all'; }
  });
  const [sortBy, setSortBy] = useState<'date'|'publisher'|'score'|'name'|'total'>(() => {
    try { return (localStorage.getItem('exams_sort_by') as any) || 'date'; } catch { return 'date'; }
  });
  const [sortDir, setSortDir] = useState<'asc'|'desc'>(() => {
    try { return (localStorage.getItem('exams_sort_dir') as any) || 'desc'; } catch { return 'desc'; }
  });
  const [scrolled, setScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement|null>(null);

  // Global shortcuts: Cmd/Ctrl+K focus search, 1-5 switch tabs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (cmd && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (!e.altKey && !e.metaKey && !e.ctrlKey) {
        const map: Record<string, typeof viewTab> = { '1':'trend','2':'yayinlar','3':'branslar','4':'isi','5':'tablo' } as const;
        const next = map[e.key as keyof typeof map];
        if (next) {
          setViewTab(next);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewTab]);

  // Scroll shadow for sticky tabs
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  // LGS istatistikleri (2023) yüklemesi
  type LgsStats = {
    dersler: { T: { avg: number; std: number }; M: { avg: number; std: number }; F: { avg: number; std: number }; I: { avg: number; std: number }; D: { avg: number; std: number }; E: { avg: number; std: number } };
    taspMin: number;
    taspMax: number;
  } | null;
  const [lgsStats, setLgsStats] = useState<LgsStats>(null);
  useEffect(() => {
    (async () => {
      try {
        const ref = doc(db, 'lgs_stats', '2023');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data: any = snap.data();
          // Beklenen alanlar yoksa guard
          if (data?.dersler && (data?.taspMin ?? null) !== null && (data?.taspMax ?? null) !== null) {
            setLgsStats({ dersler: data.dersler, taspMin: data.taspMin, taspMax: data.taspMax });
          } else {
            setLgsStats(null);
          }
        } else {
          setLgsStats(null);
        }
      } catch (e) {
        setLgsStats(null);
      }
    })();
  }, []);

  useEffect(() => {
    try { localStorage.setItem('scoring_method', scoringMethod); } catch {}
  }, [scoringMethod]);
  useEffect(() => {
    try { localStorage.setItem('exams_tab', viewTab); } catch {}
  }, [viewTab]);
  useEffect(() => {
    try { localStorage.setItem('exams_branch', branchFilter); } catch {}
  }, [branchFilter]);
  useEffect(() => {
    try { localStorage.setItem('exams_sort_by', sortBy); } catch {}
  }, [sortBy]);
  useEffect(() => {
    try { localStorage.setItem('exams_sort_dir', sortDir); } catch {}
  }, [sortDir]);

  useEffect(() => {
    try { localStorage.setItem('exams_scope', scope); } catch {}
    // subscribe according to scope (self: only my exams; school: all users)
    const q = scope === 'self'
      ? query(collection(db, 'exams'), where('kullaniciId', '==', user.uid))
      : query(collection(db, 'exams'));
    const unsub = onSnapshot(q, (snap) => {
      const items: ExamResult[] = [] as any;
      snap.forEach((d) => {
        const data: any = d.data();
        items.push({ id: d.id, ...data });
      });
      // sort client-side by createdAt desc
      items.sort((a: any, b: any) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
      setExams(items);
    });
    return () => unsub();
  }, [user.uid, scope]);

  const publishers = useMemo(() => {
    const s = new Set<string>();
    exams.forEach(e => { if (e.yayin) s.add(e.yayin); });
    return ['all', ...Array.from(s)];
  }, [exams]);

  const filtered = useMemo(() => {
    return exams.filter((e) => {
      if (filterPublisher !== 'all' && (e.yayin || '') !== filterPublisher) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!((e.ad || '').toLowerCase().includes(q) || (e.yayin || '').toLowerCase().includes(q))) return false;
      }
      if (dateFrom) {
        const from = new Date(dateFrom).getTime();
        const t = e.createdAt?.toMillis ? e.createdAt.toMillis() : 0;
        if (t < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo).getTime() + 24*60*60*1000 - 1;
        const t = e.createdAt?.toMillis ? e.createdAt.toMillis() : 0;
        if (t > to) return false;
      }
      return true;
    });
  }, [exams, filterPublisher, search, dateFrom, dateTo]);

  // Weights and score helpers
  const WEIGHTS = { T: 4, M: 4, F: 4, I: 1, D: 1, E: 1 } as const;
  const MAXS = { T: 20, M: 20, F: 20, I: 10, D: 10, E: 10 } as const;
  const scoreOf = (e: any) => {
    const cap = (val: number, max: number) => Math.max(0, Math.min(max, val));
    const nT = cap(net(e.turkce.dogru, e.turkce.yanlis), MAXS.T);
    const nM = cap(net(e.matematik.dogru, e.matematik.yanlis), MAXS.M);
    const nF = cap(net(e.fen.dogru, e.fen.yanlis), MAXS.F);
    const nI = cap(net(e.inkilap.dogru, e.inkilap.yanlis), MAXS.I);
    const nD = cap(net(e.din.dogru, e.din.yanlis), MAXS.D);
    const nE = cap(net(e.ingilizce.dogru, e.ingilizce.yanlis), MAXS.E);
    const SUM_W = WEIGHTS.T + WEIGHTS.M + WEIGHTS.F + WEIGHTS.I + WEIGHTS.D + WEIGHTS.E;
    const s =
      500 * (WEIGHTS.T / SUM_W) * (nT / MAXS.T) +
      500 * (WEIGHTS.M / SUM_W) * (nM / MAXS.M) +
      500 * (WEIGHTS.F / SUM_W) * (nF / MAXS.F) +
      500 * (WEIGHTS.I / SUM_W) * (nI / MAXS.I) +
      500 * (WEIGHTS.D / SUM_W) * (nD / MAXS.D) +
      500 * (WEIGHTS.E / SUM_W) * (nE / MAXS.E);
    return Math.round(s);
  };

  const openMistakeModal = (m:any) => {
    setEditingMistake(m);
    setMistakeNote(m?.note || '');
  };

  const saveMistake = async () => {
    if (!editingMistake?.id) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'mistakes', editingMistake.id), {
        note: mistakeNote || null,
      });
      setToast({ message: 'Not kaydedildi.', type: 'success' });
      setEditingMistake(null);
    } catch (e:any) {
      setToast({ message: `Kaydedilemedi: ${e?.message||''}` , type: 'error' });
    } finally {
      setTimeout(()=> setToast(null), 1500);
    }
  };

  const deleteMistake = async () => {
    if (!editingMistake?.id) return;
    const ok = window.confirm('Bu hata kaydını silmek istiyor musunuz?');
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'mistakes', editingMistake.id));
      setToast({ message: 'Kayıt silindi.', type: 'success' });
      setEditingMistake(null);
    } catch (e:any) {
      setToast({ message: `Silinemedi: ${e?.message||''}` , type: 'error' });
    } finally {
      setTimeout(()=> setToast(null), 1500);
    }
  };

  // Z/T tabanlı tahmini MSP (2023 istatistiklerine göre)
  const scoreOfZTPuan = (e: any, stats: NonNullable<LgsStats>) => {
    const safeStd = (v: number) => (v && v !== 0 ? v : 1);
    const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
    const nT = Math.max(0, net(e.turkce.dogru, e.turkce.yanlis));
    const nM = Math.max(0, net(e.matematik.dogru, e.matematik.yanlis));
    const nF = Math.max(0, net(e.fen.dogru, e.fen.yanlis));
    const nI = Math.max(0, net(e.inkilap.dogru, e.inkilap.yanlis));
    const nD = Math.max(0, net(e.din.dogru, e.din.yanlis));
    const nE = Math.max(0, net(e.ingilizce.dogru, e.ingilizce.yanlis));
    const zT = (nT - stats.dersler.T.avg) / safeStd(stats.dersler.T.std);
    const zM = (nM - stats.dersler.M.avg) / safeStd(stats.dersler.M.std);
    const zF = (nF - stats.dersler.F.avg) / safeStd(stats.dersler.F.std);
    const zI = (nI - stats.dersler.I.avg) / safeStd(stats.dersler.I.std);
    const zD = (nD - stats.dersler.D.avg) / safeStd(stats.dersler.D.std);
    const zE = (nE - stats.dersler.E.avg) / safeStd(stats.dersler.E.std);
    const tT = 50 + 10 * zT;
    const tM = 50 + 10 * zM;
    const tF = 50 + 10 * zF;
    const tI = 50 + 10 * zI;
    const tD = 50 + 10 * zD;
    const tE = 50 + 10 * zE;
    const ASP = WEIGHTS.T * tT + WEIGHTS.M * tM + WEIGHTS.F * tF + WEIGHTS.I * tI + WEIGHTS.D * tD + WEIGHTS.E * tE;
    const range = Math.max(1, stats.taspMax - stats.taspMin);
    const msp = 100 + ((ASP - stats.taspMin) / range) * 400;
    return Math.round(clamp(msp, 100, 500));
  };

  // Derived series
  const last5Chrono = [...filtered].slice(0, 5).reverse();
  const scores5 = last5Chrono.map(e => scoreOf(e));
  const last20Chrono = [...filtered].slice(0, 20).reverse();
  const scores20 = last20Chrono.map(e => scoreOf(e));
  const minS = Math.min(400, ...scores5);
  const maxS = Math.max(500, ...scores5);
  const minS20 = scores20.length ? Math.min(Math.min(...scores20), 350) : 350;
  const maxS20 = scores20.length ? Math.max(Math.max(...scores20), 500) : 500;

  // Tablo için sıralanmış liste
  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    const scoreFn = (e:any) => (scoringMethod==='zt' && lgsStats ? scoreOfZTPuan(e, lgsStats) : scoreOf(e));
    arr.sort((a:any, b:any) => {
      if (sortBy === 'date') {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return (ta - tb) * dir;
      }
      if (sortBy === 'publisher') {
        const pa = (a.yayin || '').localeCompare(b.yayin || '');
        return pa * dir;
      }
      if (sortBy === 'name') {
        const na = (a.ad || '').localeCompare(b.ad || '');
        return na * dir;
      }
      if (sortBy === 'total') {
        const n = (e:any) => {
          const nT = net(e.turkce.dogru, e.turkce.yanlis);
          const nM = net(e.matematik.dogru, e.matematik.yanlis);
          const nF = net(e.fen.dogru, e.fen.yanlis);
          const nI = net(e.inkilap.dogru, e.inkilap.yanlis);
          const nD = net(e.din.dogru, e.din.yanlis);
          const nE = net(e.ingilizce.dogru, e.ingilizce.yanlis);
          return nT + nM + nF + nI + nD + nE;
        };
        const ta = n(a); const tb = n(b);
        return (ta - tb) * dir;
      }
      // score
      const sa = scoreFn(a);
      const sb = scoreFn(b);
      return (sa - sb) * dir;
    });
    return arr;
  }, [filtered, sortBy, sortDir, scoringMethod, lgsStats]);

  const onSort = (col: 'date'|'publisher'|'score'|'name'|'total') => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir(col === 'publisher' ? 'asc' : 'desc');
    }
  };
  const sortIndicator = (col: 'date'|'publisher'|'score'|'name'|'total') => (
    <span className="ml-1 text-[10px] text-gray-500">{sortBy===col ? (sortDir==='asc' ? '▲' : '▼') : ''}</span>
  );

  // KPI helpers
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0);
  const movingAvg = (arr: number[], n: number) => {
    if (arr.length === 0) return [] as number[];
    const out: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      const start = Math.max(0, i - n + 1);
      out.push(avg(arr.slice(start, i + 1)));
    }
    return out;
  };
  const kpiLast5 = useMemo(() => avg(scores20.slice(-5)), [scores20]);
  const kpiPrev5 = useMemo(() => avg(scores20.slice(-10, -5)), [scores20]);
  const kpiDeltaPct = useMemo(() => {
    const base = kpiPrev5 || 1;
    return ((kpiLast5 - kpiPrev5) / base) * 100;
  }, [kpiLast5, kpiPrev5]);
  const scores20MA5 = useMemo(() => movingAvg(scores20, 5), [scores20]);

  // Overall change from first to last exam (percentage)
  const overallDeltaPct = useMemo(() => {
    if (!scores20.length) return 0;
    const first = scores20[0] ?? 0;
    const last = scores20[scores20.length - 1] ?? 0;
    const base = Math.max(1, first || 1);
    return ((last - (first || last)) / base) * 100;
  }, [scores20]);
  const overallDeltaText = useMemo(() => {
    const sign = overallDeltaPct >= 0 ? '+' : '';
    return `${sign}${Math.abs(overallDeltaPct).toFixed(1)}`;
  }, [overallDeltaPct]);
  useEffect(() => {
    try { localStorage.setItem('target_score', String(targetScore)); } catch {}
  }, [targetScore]);

  // Hata defteri aboneliği (kullanıcıya özel)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'mistakes'), (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      items.sort((a:any,b:any)=>{
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
      setMistakes(items);
    });
    return () => unsub();
  }, [user.uid]);

  // Anomali/Uyarı: son 3'te hızlı düşüş, son 10'da yüksek dalgalanma
  const alertInfo = useMemo(() => {
    if (alertDismissed) return { type: null as null | 'drop' | 'vol', text: '' };
    const last3 = scores20.slice(-3);
    const last10 = scores20.slice(-10);
    let drop = false; let dropAmt = 0;
    if (last3.length === 3) {
      dropAmt = (last3[2] ?? 0) - (last3[0] ?? 0);
      drop = dropAmt <= -10; // 3 denemede ≥10 MSP düşüş
    }
    let vol = false; let std = 0;
    if (last10.length >= 5) {
      const mean = last10.reduce((a,b)=>a+b,0) / last10.length;
      const variance = last10.reduce((a,b)=> a + Math.pow(b-mean, 2), 0) / last10.length;
      std = Math.sqrt(variance);
      vol = std >= 15; // yüksek dalgalanma eşiği ~15 MSP
    }
    if (drop) {
      return { type: 'drop' as const, text: `Son 3 denemede ${Math.abs(Math.round(dropAmt))} MSP düşüş. Öneri: 2 gün konu pekiştirme + kısa denemeler (15-20 soru).` };
    }
    if (vol) {
      return { type: 'vol' as const, text: `Puan dalgalanması yüksek (σ≈${Math.round(std)}). Öneri: rutin oluşturun (günlük 1 kısa deneme) ve zorlandığınız branşlarda tekrar yapın.` };
    }
    return { type: null as null, text: '' };
  }, [scores20, alertDismissed]);

  // Branch averages (for Weak Topics)
  const branchAverages = useMemo(() => {
    const n = filtered.length || 1;
    const sum = { T: 0, M: 0, F: 0, I: 0, D: 0, E: 0 };
    filtered.forEach((e:any) => {
      sum.T += net(e.turkce.dogru, e.turkce.yanlis);
      sum.M += net(e.matematik.dogru, e.matematik.yanlis);
      sum.F += net(e.fen.dogru, e.fen.yanlis);
      sum.I += net(e.inkilap.dogru, e.inkilap.yanlis);
      sum.D += net(e.din.dogru, e.din.yanlis);
      sum.E += net(e.ingilizce.dogru, e.ingilizce.yanlis);
    });
    const avgObj = {
      Türkçe: Math.max(0, (sum.T / n)),
      Matematik: Math.max(0, (sum.M / n)),
      Fen: Math.max(0, (sum.F / n)),
      İnkılap: Math.max(0, (sum.I / n)),
      Din: Math.max(0, (sum.D / n)),
      İngilizce: Math.max(0, (sum.E / n)),
    } as Record<string, number>;
    return avgObj;
  }, [filtered]);
  const weakestThree = useMemo(() => {
    return Object.entries(branchAverages)
      .sort((a,b)=> a[1]-b[1])
      .slice(0,3);
  }, [branchAverages]);

  const avgScore20 = useMemo(() => scores20.length ? Math.round(avg(scores20)) : 0, [scores20]);
  const targetDelta = useMemo(() => Math.max(0, targetScore - avgScore20), [targetScore, avgScore20]);
  const riskLevel = useMemo(() => {
    if (avgScore20 >= targetScore) return 'İyi';
    if (targetDelta <= 20) return 'Yakın';
    if (targetDelta <= 50) return 'Orta';
    return 'Risk';
  }, [avgScore20, targetScore, targetDelta]);

  // Dinamik grafik yükseklikleri (Sıkı/Standart)
  const chartH = denseView ? 120 : 160;
  const areaH = denseView ? 130 : 180;

  // Actions
  const handleAdd = async (payload: any) => {
    try {
      await addDoc(collection(db, 'exams'), {
        kullaniciId: user.uid,
        createdAt: serverTimestamp(),
        ...payload,
      });
      setToast({ message: 'Deneme eklendi.', type: 'success' });
    } catch (e) {
      setToast({ message: 'Deneme eklenemedi.', type: 'error' });
    } finally {
      setTimeout(()=> setToast(null), 1500);
    }
  };

  const handleAddMistakeExam = async (exam: any) => {
    try {
      const payload = {
        kullaniciId: user.uid,
        examId: exam.id,
        createdAt: serverTimestamp(),
        note: 'Denemeden eklendi',
        ad: exam.ad || null,
        yayin: exam.yayin || null,
        turkce: exam.turkce || null,
        matematik: exam.matematik || null,
        fen: exam.fen || null,
        inkilap: exam.inkilap || null,
        din: exam.din || null,
        ingilizce: exam.ingilizce || null,
        snapshotScore: typeof scoreOf === 'function' ? scoreOf(exam) : null,
      } as any;
      // Sadece kullanıcı alt koleksiyonuna yaz (güvenlik kurallarına daha uyumlu)
      await addDoc(collection(db, 'users', user.uid, 'mistakes'), payload);
      setToast({ message: 'Hata Defteri’ne eklendi.', type: 'success' });
    } catch (err: any) {
      console.error('handleAddMistakeExam error', err);
      const msg = err?.message || 'Bilinmeyen hata';
      setToast({ message: `Hata Defteri kaydedilemedi: ${msg}`, type: 'error' });
    } finally {
      setTimeout(()=> setToast(null), 1500);
    }
  };

  const seedExams = async () => {
    setSeeding(true);
    const batchId = `seed_${Date.now()}`;
    try {
      const tasks: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        // random helper within range
        const mkBranch = (max: number) => {
          const d = Math.floor(Math.random() * (max - Math.floor(max*0.4))) + Math.floor(max*0.4); // 40%..100%
          const rem = Math.max(0, max - d);
          const y = Math.floor(Math.random() * (rem + 1));
          const b = Math.max(0, rem - y);
          return { dogru: d, yanlis: y, bos: b };
        };
        const payload = {
          ad: `Deneme #${i+1}`,
          yayin: ['Karaağaç','Tonguç','Zambak','Bilfen','Limit'][Math.floor(Math.random()*5)],
          turkce: mkBranch(20),
          matematik: mkBranch(20),
          fen: mkBranch(20),
          inkilap: mkBranch(10),
          din: mkBranch(10),
          ingilizce: mkBranch(10),
        };
        tasks.push(addDoc(collection(db, 'exams'), {
          kullaniciId: user.uid,
          createdAt: serverTimestamp(),
          seedBatchId: batchId,
          ...payload,
        }));
      }
      await Promise.all(tasks);
      try { localStorage.setItem('last_seed_batch', batchId); } catch {}
      setLastSeedId(batchId);
      setToast({ message: '10 deneme başarıyla eklendi.', type: 'success' });
    } catch (e) {
      setToast({ message: 'Seed ekleme başarısız.', type: 'error' });
    } finally {
      setSeeding(false);
      setTimeout(()=> setToast(null), 1500);
    }
  };

  const deleteLastSeed = async () => {
    if (!lastSeedId) {
      setToast({ message: 'Silinecek seed bulunamadı.', type: 'error' });
      setTimeout(()=> setToast(null), 1500);
      return;
    }
    setDeletingSeed(true);
    try {
      const toDelete = exams.filter(e => (e as any).seedBatchId === lastSeedId);
      await Promise.all(toDelete.map(e => deleteDoc(doc(db, 'exams', e.id))));
      setToast({ message: `${toDelete.length} kayıt silindi.`, type: 'success' });
    } catch {
      setToast({ message: 'Seed silme başarısız.', type: 'error' });
    } finally {
      setDeletingSeed(false);
      setTimeout(()=> setToast(null), 1500);
    }
  };

  const handleDelete = async (exam: ExamResult) => {
    try {
      const ok = window.confirm('Bu denemeyi silmek istediğine emin misin?');
      if (!ok) return;
      await deleteDoc(doc(db, 'exams', exam.id));
      setToast({ message: 'Kayıt silindi.', type: 'success' });
    } catch {
      setToast({ message: 'Kayıt silinemedi.', type: 'error' });
    } finally {
      setTimeout(()=> setToast(null), 1500);
    }
  };

  // CSV dışa aktar (Tablo görünümü)
  const exportCSV = () => {
    try {
      const rows = sortedFiltered.map((e:any) => {
        const nT = Math.max(0, net(e.turkce.dogru, e.turkce.yanlis));
        const nM = Math.max(0, net(e.matematik.dogru, e.matematik.yanlis));
        const nF = Math.max(0, net(e.fen.dogru, e.fen.yanlis));
        const nI = Math.max(0, net(e.inkilap.dogru, e.inkilap.yanlis));
        const nD = Math.max(0, net(e.din.dogru, e.din.yanlis));
        const nE = Math.max(0, net(e.ingilizce.dogru, e.ingilizce.yanlis));
        const total = nT+nM+nF+nI+nD+nE;
        const puan = (scoringMethod==='zt' && lgsStats ? scoreOfZTPuan(e, lgsStats as any) : scoreOf(e));
        const t = e.createdAt?.toDate ? e.createdAt.toDate() as Date : null;
        const tarih = t ? t.toLocaleDateString('tr-TR') : '';
        return [tarih, e.ad || '', e.yayin || '', nT.toFixed(1), nM.toFixed(1), nF.toFixed(1), nI.toFixed(1), nD.toFixed(1), nE.toFixed(1), total.toFixed(1), String(puan)];
      });
      const header = ['Tarih','Ad','Yayın','T','M','F','İ','D','E','Toplam Net','Puan'];
      const csv = [header, ...rows]
        .map(r => r.map((v) => {
          const s = String(v);
          if (s.includes(',') || s.includes(';') || s.includes('"') || s.includes('\n')) {
            return '"' + s.replace(/"/g,'""') + '"';
          }
          return s;
        }).join(','))
        .join('\n');
      const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `denemeler_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={() => signOut(auth)} />
      <main className="w-full mx-0 px-0 py-3">
        <div className="container mx-auto max-w-6xl px-3 sm:px-4 lg:px-6">
        {/* Başlık */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Öğrenci Performans Paneli</h1>
            <p className="text-xs text-gray-600">Kompakt ve içgörü odaklı grafiklerle görünümü özelleştirin.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=> window.print()} className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-800">PDF İndir</button>
            <button onClick={()=> setIsOpen(true)} className="px-3 py-1.5 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm">Sınav Ekle</button>
            <button
              onClick={seedExams}
              disabled={seeding}
              className={`px-2.5 py-1.5 text-xs rounded-md border font-medium shadow-sm ${seeding ? 'bg-amber-200 border-amber-300 text-amber-700 cursor-not-allowed' : 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800'}`}
              title="Test verisi (10 deneme) ekle"
            >{seeding ? 'Ekleniyor…' : 'Test Verisi Ekle'}</button>
            <button
              onClick={deleteLastSeed}
              disabled={!lastSeedId || deletingSeed}
              className={`px-2.5 py-1.5 text-xs rounded-md border font-medium shadow-sm ${(!lastSeedId || deletingSeed) ? 'bg-rose-200 border-rose-300 text-rose-700 cursor-not-allowed' : 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-800'}`}
              title={lastSeedId ? 'Son eklenen test verisini sil' : 'Önce test verisi ekleyin'}
            >{deletingSeed ? 'Siliniyor…' : 'Test Verisini Sil'}</button>
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-600 mr-1">
              <span>Hedef:</span>
              <span className="font-semibold text-gray-900">{targetScore}</span>
            </div>
            <button
              onClick={()=> setTargetScore(500)}
              className="px-2.5 py-1.5 text-xs rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              title="Hedef puanı 500'e sıfırla"
            >Hedef=500</button>
            <button
              onClick={()=>{ const nv = !denseView; setDenseView(nv); try { localStorage.setItem('exams_dense', nv ? '1' : '0'); } catch {} }}
              className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-800"
              title="Görünüm yoğunluğu"
            >{denseView ? 'Standart' : 'Sıkı'}</button>
          </div>
        </div>

        {/* Uyarı Banner (tahmini puan) */}
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-[12px]">
          Bu puan, 2023 LGS verileri baz alınarak hesaplanmış bir <b>TAHMİNDİR</b>. Gerçek sınav puanınız, 2024 LGS'ye giren tüm öğrencilerin başarısına göre değişiklik gösterebilir.
        </div>
        {alertInfo.type && !alertDismissed && (
          <div className={`mb-3 rounded-md px-3 py-2 text-[12px] flex items-start justify-between ${alertInfo.type==='drop' ? 'border border-rose-200 bg-rose-50 text-rose-800' : 'border border-sky-200 bg-sky-50 text-sky-800'}`}>
            <div>{alertInfo.text}</div>
            <button
              onClick={()=>{ setAlertDismissed(true); try { localStorage.setItem('exams_alert_dismissed','1'); } catch {} }}
              className="ml-3 text-[11px] underline decoration-dotted"
              title="Uyarıyı kapat"
            >Kapat</button>
          </div>
        )}
        {viewTab==='tablo' && (
          <div className="mt-3 grid grid-cols-1">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">Hata Defteri (Son Eklenenler)</h3>
                <span className="text-[11px] text-gray-500">{mistakes.length} kayıt</span>
              </div>
              {mistakes.length === 0 ? (
                <p className="text-[12px] text-gray-600">Henüz kayıt yok. Tablo satırlarından “Hata Defteri” ile ekleyebilirsiniz.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {mistakes.slice(0,5).map((m:any) => {
                    const t = m.createdAt?.toDate ? m.createdAt.toDate() as Date : null;
                    const dstr = t ? t.toLocaleDateString('tr-TR') : '-';
                return (
                      <li key={m.id} className="py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 px-2 rounded" onClick={()=> openMistakeModal(m)} title="Detayı aç">
                        <div className="min-w-0">
                          <div className="text-[12px] text-gray-900 truncate">{m.ad || 'Deneme'}</div>
                          <div className="text-[11px] text-gray-500 truncate">{m.yayin || '-'} • {dstr}</div>
                        </div>
                        {typeof m.snapshotScore === 'number' && (
                          <span className="ml-2 text-[11px] px-2 py-0.5 rounded border border-gray-200 text-gray-700">{m.snapshotScore}</span>
                        )}
                      </li>
                );
              })}
                </ul>
              )}
        </div>
          </div>
        )}

        {/* Sekmeler (Profesyonel tasarım) */}
        <div className="mb-4 sticky top-0 z-30">
          <div className={`rounded-xl border border-gray-200 bg-white/70 backdrop-blur-xl ${scrolled ? 'shadow-md' : 'shadow-sm'} px-2 py-1 overflow-x-auto`}>
            <div className="inline-flex items-center gap-2 text-[12px]" role="tablist" aria-label="Exams sections">
              {([
                {k:'trend', label:'Trend'},
                {k:'yayinlar', label:'Yayınlar'},
                {k:'branslar', label:'Branşlar'},
                {k:'isi', label:'Isı Haritası'},
                {k:'tablo', label:'Tablo'},
              ] as any[]).map(t => (
                <button
                  key={t.k}
                  role="tab"
                  aria-selected={viewTab===t.k}
                  onClick={()=> setViewTab(t.k)}
                  className={`relative group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${viewTab===t.k
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                  title={t.label}
                >
                  {/* Icon */}
                  {t.k==='trend' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><path d="M3 3v18h18"/><path d="M19 7l-6 6-4-4-4 4"/></svg>
                  )}
                  {t.k==='yayinlar' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><path d="M20 10V4a2 2 0 0 0-2-2H7l-4 4v14a2 2 0 0 0 2 2h11"/><path d="M7 2v6H3"/><path d="M17 17l2 2 4-4"/></svg>
                  )}
                  {t.k==='branslar' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                  )}
                  {t.k==='isi' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-4 4-8 4-8z"/><path d="M12 22a6 6 0 0 0 6-6"/></svg>
                  )}
                  {t.k==='tablo' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M9 20V10"/></svg>
                  )}
                  <span className="font-medium">{t.label}</span>
                  {/* Count badge for Tablo */}
                  {t.k==='tablo' && (
                    <span className={`ml-1 inline-flex items-center justify-center px-1.5 h-4 rounded-full text-[10px] ${viewTab===t.k ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{filtered.length}</span>
                  )}
                  {/* Active underline */}
                  {viewTab===t.k && (<span className="absolute -bottom-1 left-3 right-3 h-0.5 rounded bg-white/90" />)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Şeridi + Hedef Kartı */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          {/* KPI Şeridi */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Ortalama Puan</p>
              <p className="text-xl font-semibold text-blue-600">{avgScore20}</p>
              <p className="text-[11px] text-gray-500">Son 20 ortalaması</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Δ Son 5</p>
              <p className={`text-xl font-semibold ${kpiDeltaPct>=0?'text-emerald-600':'text-rose-600'}`}>{kpiDeltaPct>=0?'+':''}{kpiDeltaPct.toFixed(1)}%</p>
              <p className="text-[11px] text-gray-500">Son 5 vs önceki 5</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Hedefe Kalan</p>
              <p className={`text-xl font-semibold ${avgScore20>=targetScore?'text-emerald-600':'text-amber-600'}`}>{avgScore20>=targetScore ? 0 : targetDelta}</p>
              <p className="text-[11px] text-gray-500">Hedef: {targetScore}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Risk</p>
              <p className={`text-xl font-semibold ${riskLevel==='Risk'?'text-rose-600':riskLevel==='Orta'?'text-amber-600':'text-emerald-600'}`}>{riskLevel}</p>
              <p className="text-[11px] text-gray-500">Yakın ≤20 • Orta ≤50</p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
            <div className="flex items-center justify-between">
            <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Hedef Puan</p>
                <div className="flex items-baseline gap-2">
                  <input type="number" value={targetScore} onChange={(e)=> setTargetScore(Number(e.target.value||0))} className="w-20 rounded border-gray-300 text-xs px-2 py-1" />
                  <span className="text-xs text-gray-500">Ort: <span className="font-semibold text-gray-900">{avgScore20}</span></span>
                  <span className={`text-xs ${avgScore20>=targetScore?'text-emerald-600':'text-amber-600'}`}>{avgScore20>=targetScore? 'Hedefe Ulaşıldı' : `-${targetDelta}`}</span>
            </div>
          </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Risk</p>
                  <p className={`text-sm font-semibold ${riskLevel==='Risk'?'text-rose-600':riskLevel==='Orta'?'text-amber-600':'text-emerald-600'}`}>{riskLevel}</p>
                </div>
                <div style={{ width: 90, height: 90 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      {(() => {
                        const total = Math.max(1, targetScore || 1);
                        const progress = Math.max(0, Math.min(1, avgScore20 / total));
                        const data = [
                          { name: 'Tamamlandı', value: progress },
                          { name: 'Kalan', value: 1 - progress },
                        ];
              return (
                          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={40} startAngle={90} endAngle={-270} stroke="none">
                            <Cell fill="#10b981" />
                            <Cell fill="#e5e7eb" />
                          </Pie>
                        );
                      })()}
                    </PieChart>
                  </ResponsiveContainer>
                  </div>
                </div>
          </div>
        </div>

          {/* Weak Topics */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Zayıf Konular (Ort. Net)</p>
            {weakestThree.length === 0 ? (
              <p className="text-[11px] text-gray-600">Yeterli veri yok.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {weakestThree.map(([name, val]) => (
                  <div key={name} className="rounded border border-gray-200 p-2">
                    <p className="text-xs font-medium text-gray-800">{name}</p>
                    <div className="mt-1 h-2 bg-gray-100 rounded-full">
                  {(() => {
                        const maxNet = ['Türkçe','Matematik','Fen'].includes(name as string) ? 20 : 10;
                        const pct = Math.min(100, Math.max(0, (Number(val) / maxNet) * 100));
                        return <div className="h-2 bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />;
                  })()}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1">{fmt2(Number(val))} net</p>
                  </div>
                ))}
                </div>
              )}
            </div>
          </div>

        {/* Kompakt Filtreler (Sticky) */}
        <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80 border-b border-gray-200 py-2 mb-3 shadow-sm">
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filterPublisher} onChange={(e)=> setFilterPublisher(e.target.value)} className="rounded border-gray-300 text-[11px] py-1 px-2">
            {publishers.map(p => <option key={p} value={p}>{p==='all'?'Tüm Yayınlar':p}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e)=> setDateFrom(e.target.value)} className="rounded border-gray-300 text-[11px] py-1 px-2" />
          <input type="date" value={dateTo} onChange={(e)=> setDateTo(e.target.value)} className="rounded border-gray-300 text-[11px] py-1 px-2" />
          <input value={search} onChange={(e)=> setSearch(e.target.value)} className="w-40 rounded border-gray-300 text-[11px] py-1 px-2" placeholder="Deneme adı/yayın ara..." />
          {/* Puanlama yöntemi seçici */}
          <select value={scoringMethod} onChange={(e)=> setScoringMethod(e.target.value as any)} className="rounded border-gray-300 text-[11px] py-1 px-2">
            <option value="simple">Puanlama: Basit</option>
            <option value="zt">Puanlama: Z/T Tabanlı</option>
          </select>
          <div className="flex-1" />
          {/* Aktif filtre rozetleri */}
          <div className="flex flex-wrap items-center gap-1">
            {filterPublisher !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Yayın: {filterPublisher}
                <button className="ml-1" onClick={()=> setFilterPublisher('all')} title="Filtreyi temizle">×</button>
              </span>
            )}
            {branchFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                Branş: {branchFilter==='T'?'Türkçe':branchFilter==='M'?'Matematik':branchFilter==='F'?'Fen':branchFilter==='I'?'İnkılap':branchFilter==='D'?'Din':'İngilizce'}
                <button className="ml-1" onClick={()=> setBranchFilter('all')} title="Filtreyi temizle">×</button>
              </span>
            )}
            {(dateFrom || dateTo) && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Tarih: {dateFrom || '—'} → {dateTo || '—'}
                <button className="ml-1" onClick={()=> { setDateFrom(''); setDateTo(''); }} title="Filtreyi temizle">×</button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Arama: “{search}”
                <button className="ml-1" onClick={()=> setSearch('')} title="Filtreyi temizle">×</button>
              </span>
            )}
            {(filterPublisher!=='all' || dateFrom || dateTo || search) && (
              <button
                onClick={()=> { setFilterPublisher('all'); setDateFrom(''); setDateTo(''); setSearch(''); setBranchFilter('all'); }}
                className="ml-1 px-2 py-0.5 text-[10px] rounded border border-gray-300 bg-white"
              >Temizle</button>
            )}
          </div>
          <div className="inline-flex items-center rounded-full bg-white border border-gray-300 p-0.5">
            <button type="button" className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full ${scope==='self'?'bg-white text-emerald-700 border border-emerald-200 shadow-sm':'text-gray-700'}`} onClick={()=> setScope('self')}>Kendim</button>
            <button type="button" className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full ${scope==='school'?'bg-white text-sky-700 border border-sky-200 shadow-sm':'text-gray-700'}`} onClick={()=> setScope('school')}>Okul geneli</button>
          </div>
        </div>
        </div>


        {/* Boş durum kartı (filtre sonrası kayıt yoksa) */}
        {filtered.length===0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mt-4">
            <p className="text-sm text-gray-700 font-medium">Kayıt bulunamadı</p>
            <p className="text-[11px] text-gray-500 mt-1">Filtreleri genişletmeyi veya temizlemeyi deneyin.</p>
          </div>
        )}

        {/* Widget Grid */}
        {(viewTab==='trend' || viewTab==='yayinlar' || viewTab==='branslar' || viewTab==='isi') && (
        <div className="grid grid-cols-1 gap-4 mt-4">
          {viewTab==='trend' && (
          <WidgetCard title={branchFilter==='all' ? 'Branş Performans Trendi' : `${branchFilter==='T'?'Türkçe':branchFilter==='M'?'Matematik':branchFilter==='F'?'Fen':branchFilter==='I'?'İnkılap':branchFilter==='D'?'Din':'İngilizce'} Net Trendi`}>
            <div style={{ width: '100%', height: areaH }}>
              <ResponsiveContainer>
                {(() => {
                  if (branchFilter==='all') {
                    const data = scores20.map((s, i) => ({ idx: i + 1, puan: s }));
                    // min/max noktaları
                    let minPt = null as null | { idx:number; puan:number };
                    let maxPt = null as null | { idx:number; puan:number };
                    data.forEach(d => {
                      if (!minPt || d.puan < minPt.puan) minPt = d;
                      if (!maxPt || d.puan > maxPt.puan) maxPt = d;
                    });
                    return (
                      <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="10%" stopColor="#2563eb" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#f0f0f0" strokeDasharray="2 2" />
                        <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v)=>`E${v}`} interval="preserveStartEnd"/>
                        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} domain={[minS20, maxS20]} />
                        <Tooltip
                          contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                          labelFormatter={(l)=>`Exam ${l}`}
                          formatter={(val:any)=> Math.round(Number(val))}
                        />
                        <ReferenceLine y={kpiLast5} stroke="#9ca3af" strokeDasharray="3 3" />
                        {minPt && (
                          <ReferenceDot x={minPt.idx} y={minPt.puan} r={3} fill="#ef4444">
                            <Label value={`Min ${Math.round(minPt.puan)}`} position="left" fontSize={10} fill="#ef4444" />
                          </ReferenceDot>
                        )}
                        {maxPt && (
                          <ReferenceDot x={maxPt.idx} y={maxPt.puan} r={3} fill="#10b981">
                            <Label value={`Max ${Math.round(maxPt.puan)}`} position="right" fontSize={10} fill="#10b981" />
                          </ReferenceDot>
                        )}
                        <Area type="monotone" dataKey="puan" stroke="#2563eb" strokeWidth={1.5} fill="url(#scoreArea)" />
                      </AreaChart>
                    );
                  } else {
                    const label = branchFilter==='T'?'Türkçe':branchFilter==='M'?'Matematik':branchFilter==='F'?'Fen':branchFilter==='I'?'İnkılap':branchFilter==='D'?'Din':'İngilizce';
                    const max = (branchFilter==='T'||branchFilter==='M'||branchFilter==='F') ? MAXS.T : MAXS.I;
                    const branchVals = [...filtered].slice(0,20).reverse().map((e:any) => {
                      const pick = branchFilter==='T'? e.turkce : branchFilter==='M'? e.matematik : branchFilter==='F'? e.fen : branchFilter==='I'? e.inkilap : branchFilter==='D'? e.din : e.ingilizce;
                      const n = Math.max(0, net(pick.dogru, pick.yanlis));
                      return n;
                    });
                    const data = branchVals.map((v, i)=> ({ idx: i+1, puan: v }));
                    let minPt = null as null | { idx:number; puan:number };
                    let maxPt = null as null | { idx:number; puan:number };
                    data.forEach(d => {
                      if (!minPt || d.puan < minPt.puan) minPt = d;
                      if (!maxPt || d.puan > maxPt.puan) maxPt = d;
                    });
                    return (
                      <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="10%" stopColor="#2563eb" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#f0f0f0" strokeDasharray="2 2" />
                        <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v)=>`E${v}`} interval="preserveStartEnd"/>
                        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} domain={[0, max]} />
                        <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }} labelFormatter={(l)=>`Exam ${l}`} formatter={(val:any)=> `${fmt2(Number(val))} net`} />
                        {minPt && (
                          <ReferenceDot x={minPt.idx} y={minPt.puan} r={3} fill="#ef4444">
                            <Label value={`Min ${fmt2(minPt.puan)} net`} position="left" fontSize={10} fill="#ef4444" />
                          </ReferenceDot>
                        )}
                        {maxPt && (
                          <ReferenceDot x={maxPt.idx} y={maxPt.puan} r={3} fill="#10b981">
                            <Label value={`Max ${fmt2(maxPt.puan)} net`} position="right" fontSize={10} fill="#10b981" />
                          </ReferenceDot>
                        )}
                        <Area type="monotone" dataKey="puan" stroke="#2563eb" strokeWidth={1.5} fill="url(#scoreArea)" />
                      </AreaChart>
                    );
                  }
                })()}
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">Kesik çizgi, son 5 ortalamayı gösterir.</p>
            <p className="mt-1 text-[11px] text-amber-600">Turuncu çizgi hedef puanı ({targetScore}) gösterir.</p>
          </WidgetCard>
          )}
          {viewTab==='yayinlar' && (
          <WidgetCard title="Yayın Bazlı Ortalama Puan">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-indigo-50 text-indigo-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10V4a2 2 0 0 0-2-2H7l-4 4v14a2 2 0 0 0 2 2h11"/><path d="M7 2v6H3"/><path d="M17 17l2 2 4-4"/></svg>
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">Yayınlar</div>
                  <div className="text-[11px] text-gray-500">Yayına göre kıyas: ortalama, medyan, min–max</div>
                </div>
              </div>
              <button className="text-[11px] text-gray-500 hover:text-gray-700" title="Öneri: n<3 olan yayınlarda sonuçlar güvenilmez olabilir.">i</button>
            </div>
            <div className="space-y-1">
              {publishers.length <= 1 ? (
                <div className="p-3">
                  <div className="animate-pulse">
                    <div className="h-3 bg-gray-200 rounded mb-2 w-1/2" />
                    <div className="h-10 bg-gray-100 rounded" />
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500">Kayıt bulunamadı.</p>
                </div>
              ) : (
                (() => {
                  // Yayın bazında skor listeleri
                  const mapAll = filtered.reduce((acc: Record<string, number[]>, e:any)=>{
                    const k = e.yayin || 'Diğer';
                    (acc[k] = acc[k] || []).push(scoreOf(e));
                    return acc;
                  }, {} as Record<string, number[]>);
                  const items = Object.entries(mapAll).map(([yayin, arr])=>{
                    const sorted = [...arr].sort((a,b)=>a-b);
                    const avg = sorted.reduce((a,b)=>a+b,0)/sorted.length;
                    const med = sorted.length%2===1 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2;
                    const min = sorted[0];
                    const max = sorted[sorted.length-1];
                    return { yayin, avg, med, min, max, cnt: sorted.length };
                  }).sort((a,b)=> b.avg - a.avg);
                  const overall = filtered.length ? Math.round(filtered.reduce((s,e:any)=> s+scoreOf(e),0)/filtered.length) : 0;
                  const overallPct = Math.min(100, Math.max(0, (overall - 300) / 200 * 100));
                return (
                    <>
                      {items.map((it, idx) => {
                        const pctAvg = Math.min(100, Math.max(0, (it.avg - 300) / 200 * 100));
                        const pctMed = Math.min(100, Math.max(0, (it.med - 300) / 200 * 100));
                        const medal = idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':'';
                        return (
                          <div
                            key={it.yayin}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-1"
                            title={`${it.yayin}\nAdet: ${it.cnt}\nOrt: ${Math.round(it.avg)} • Medyan: ${Math.round(it.med)}\nMin: ${Math.round(it.min)} • Max: ${Math.round(it.max)}\nTıklayın: yayın filtresi uygula`}
                            onClick={()=> setFilterPublisher(it.yayin)}
                          >
                            <div className="w-32 text-[11px] text-gray-700 shrink-0 truncate">{medal} {it.yayin}</div>
                            <div className="flex-1 h-[10px] bg-gray-100 rounded-full overflow-hidden relative">
                              {/* Genel ortalama çizgisi */}
                              <div className="absolute inset-y-0 left-0 w-px bg-gray-300" style={{ left: `${overallPct}%` }} title={`Genel Ort: ${overall}`} />
                              {/* Medyan işaretçisi */}
                              <div className="absolute -top-[2px] h-[14px] w-[2px] bg-indigo-400" style={{ left: `${pctMed}%` }} title={`Medyan: ${Math.round(it.med)}`} />
                              {/* Ortalama dolum barı */}
                              <div className="h-[10px] bg-blue-500" style={{ width: `${pctAvg}%` }} />
                    </div>
                            <div className="w-14 text-right text-[11px] text-gray-700">{Math.round(it.avg)}</div>
                            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700" title="Kayıt sayısı">{it.cnt}</span>
                            {it.cnt < 3 && (
                              <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700" title={"Düşük örneklem (n<3)"}>{"n<3"}</span>
                            )}
                  </div>
                );
              })}
                    </>
                  );
                })()
          )}
        </div>
            <p className="mt-2 text-[11px] text-gray-500">🥇 en yüksek ortalama. İnce çizgi: genel ort., mor çizgi: medyan.</p>
            <p className="mt-1 text-[11px] text-gray-500">Yayınları kıyaslarken örneklem büyüklüğüne dikkat edin; ortalaması istikrarlı yayınları tercih edin.</p>
          </WidgetCard>
          )}
          {viewTab==='isi' && (
          <WidgetCard title="Branş Performans Isı Haritası">
          <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-rose-50 text-rose-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-4 4-8 4-8z"/><path d="M12 22a6 6 0 0 0 6-6"/></svg>
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">Isı Haritası</div>
                  <div className="text-[11px] text-gray-500">Son 10 denemedeki branş başarı yoğunluğu</div>
          </div>
              </div>
              <button className="text-[11px] text-gray-500 hover:text-gray-700" title="Daha koyu kareler yüksek doğruluk. Branş adına tıklayarak vurgulayın.">i</button>
            </div>
            {(() => {
              const last10 = [...filtered].slice(0,10).reverse();
              const heat = last10.map((e:any)=>{
                const t = Math.max(0, net(e.turkce.dogru, e.turkce.yanlis));
                const m = Math.max(0, net(e.matematik.dogru, e.matematik.yanlis));
                const f = Math.max(0, net(e.fen.dogru, e.fen.yanlis));
                const i = Math.max(0, net(e.inkilap.dogru, e.inkilap.yanlis));
                const d = Math.max(0, net(e.din.dogru, e.din.yanlis));
                const eIng = Math.max(0, net(e.ingilizce.dogru, e.ingilizce.yanlis));
                return {
                  T: t / MAXS.T, M: m / MAXS.M, F: f / MAXS.F, I: i / MAXS.I, D: d / MAXS.D, E: eIng / MAXS.E,
                  Tr: t, Mr: m, Fr: f, Ir: i, Dr: d, Er: eIng
                };
              });
              if (heat.length === 0) return (
                <div className="p-3">
                  <div className="animate-pulse">
                    <div className="h-3 bg-gray-200 rounded mb-2 w-1/3" />
                    <div className="h-16 bg-gray-100 rounded" />
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500">Kayıt bulunamadı.</p>
                </div>
              );
              return (
            <div className="overflow-x-auto">
                  <div className="grid" style={{ gridTemplateColumns: `70px repeat(${heat.length}, minmax(16px, 1fr))` }}>
                <div></div>
                    {last10.map((_, idx) => (
                  <div key={idx} className="text-[10px] text-center text-gray-500">E{idx+1}</div>
                ))}
                {([
                  {k:'T', label:'Türkçe'}, {k:'M', label:'Matematik'}, {k:'F', label:'Fen'},
                  {k:'I', label:'İnkılap'}, {k:'D', label:'Din'}, {k:'E', label:'İngilizce'}
                ] as any[]).map((row) => (
                  <React.Fragment key={row.k}>
                        <div
                          className={`text-[11px] pr-2 cursor-pointer ${branchFilter==='all' || branchFilter===row.k ? 'text-gray-700' : 'text-gray-400'}`}
                          onClick={()=> setBranchFilter(branchFilter===row.k ? 'all' : row.k)}
                          title={`${row.label} filtresini ${branchFilter===row.k?'kaldır':'uygula'}`}
                        >{row.label}</div>
                        {heat.map((col:any, idx:number) => {
                      const v = Math.max(0, Math.min(1, (col as any)[row.k]));
                      const color = `rgba(37,99,235,${0.18 + v*0.82})`;
                          const rawKey = row.k + 'r';
                          const raw = (col as any)[rawKey];
                          const max = (row.k==='T'||row.k==='M'||row.k==='F') ? MAXS.T : MAXS.I;
                          const pct = (v*100);
                          const dimmed = branchFilter!=='all' && branchFilter!==row.k;
                          return <div key={idx} className={`h-4 rounded-sm ${dimmed?'opacity-30':''}`} style={{ backgroundColor: color }} title={`${row.label} – E${idx+1}: ${fmt2(raw)} / ${max} net (${pct.toFixed(1)}%)`} />;
                    })}
                  </React.Fragment>
                ))}
              </div>
              </div>
              );
            })()}
            <p className="mt-2 text-[11px] text-gray-500">Daha koyu kareler daha yüksek doğruluğu gösterir. Branş etiketlerine tıklayarak o branşı vurgulayabilirsiniz.</p>
          </WidgetCard>
          )}

          {viewTab==='branslar' && (<React.Fragment>
          {/* Branş Karşılaştırmalı Netler (Son 5 vs Önceki 5) */}
          <WidgetCard title="Branş Karşılaştırmalı Netler (Son 5 vs Önceki 5)">
          <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-violet-50 text-violet-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/><path d="M8 21V3"/><path d="M16 21V3"/></svg>
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">Branş Karşılaştırma</div>
                  <div className="text-[11px] text-gray-500">Son 5 vs önceki 5 sınav ortalamaları</div>
          </div>
              </div>
              <button className="text-[11px] text-gray-500 hover:text-gray-700" title="Açık bar: son 5; koyu bar: önceki 5. Δ pozitifse gelişme.">i</button>
            </div>
            {(() => {
              const take = [...filtered].slice(0, 10).reverse();
              if (take.length < 5) {
              return (
                  <div className="p-3">
                    <div className="animate-pulse">
                      <div className="h-3 bg-gray-200 rounded mb-2 w-1/2" />
                      <div className="h-24 bg-gray-100 rounded" />
                  </div>
                    <p className="mt-2 text-[11px] text-gray-500">Karşılaştırma için yeterli veri yok.</p>
                </div>
              );
              }
              const avgOf = (arr:number[]) => (arr.length? arr.reduce((a,b)=>a+b,0)/arr.length : 0);
              const last5 = take.slice(-5);
              const prev5 = take.slice(0,5);
              const mk = (sel:(e:any)=>number, max:number) => ({ l5: avgOf(last5.map(sel)), p5: avgOf(prev5.map(sel)), max });
              const T = mk((e:any)=> Math.max(0, net(e.turkce.dogru, e.turkce.yanlis)), MAXS.T);
              const M = mk((e:any)=> Math.max(0, net(e.matematik.dogru, e.matematik.yanlis)), MAXS.M);
              const F = mk((e:any)=> Math.max(0, net(e.fen.dogru, e.fen.yanlis)), MAXS.F);
              const I = mk((e:any)=> Math.max(0, net(e.inkilap.dogru, e.inkilap.yanlis)), MAXS.I);
              const D = mk((e:any)=> Math.max(0, net(e.din.dogru, e.din.yanlis)), MAXS.D);
              const E = mk((e:any)=> Math.max(0, net(e.ingilizce.dogru, e.ingilizce.yanlis)), MAXS.E);
              const data = [
                { name: 'Türkçe', key:'T', l5: T.l5, p5: T.p5 },
                { name: 'Matematik', key:'M', l5: M.l5, p5: M.p5 },
                { name: 'Fen', key:'F', l5: F.l5, p5: F.p5 },
                { name: 'İnkılap', key:'I', l5: I.l5, p5: I.p5 },
                { name: 'Din', key:'D', l5: D.l5, p5: D.p5 },
                { name: 'İngilizce', key:'E', l5: E.l5, p5: E.p5 },
              ].map(d => ({ ...d, dim: (branchFilter!=='all' && branchFilter!==d.key) }));
              return (
                <div style={{ width: '100%', height: chartH }}>
                  <ResponsiveContainer>
                    <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <Tooltip
                        contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 6 }}
                        formatter={(val:any, key:any, ctx:any)=> {
                          const l5 = (ctx?.payload?.l5 ?? 0) as number;
                          const p5 = (ctx?.payload?.p5 ?? 0) as number;
                          const delta = l5 - p5;
                          const pct = p5 ? (delta / p5) * 100 : 0;
                          const label = key === 'l5' ? 'Son 5' : 'Önceki 5';
                          return [`${fmt1(Number(val))} (Δ ${delta>=0?'+':''}${fmt1(delta)} | ${pct>=0?'+':''}${pct.toFixed(1)}%)`, label];
                        }}
                      />
                      <Bar dataKey="p5" name="Önceki 5" fill="#c7d2fe" radius={[3,3,0,0]}>
                        {data.map((d, i) => (
                          <Cell key={`p5-${i}`} fill="#c7d2fe" opacity={d.dim?0.35:1} />
                        ))}
                        <LabelList dataKey="p5" position="top" formatter={(v:any)=> fmt1(Number(v))} fontSize={10} fill="#6b7280" />
                      </Bar>
                      <Bar dataKey="l5" name="Son 5" fill="#6366f1" radius={[3,3,0,0]}>
                        {data.map((d, i) => (
                          <Cell key={`l5-${i}`} fill="#6366f1" opacity={d.dim?0.5:1} />
                        ))}
                        <LabelList dataKey="l5" position="top" formatter={(v:any)=> fmt1(Number(v))} fontSize={10} fill="#374151" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
          </div>
              );
            })()}
            {(() => {
              // Alt legend: branş bazında Δ ve %Δ rozetleri
              const take = [...filtered].slice(0, 10).reverse();
              const avgOf = (arr:number[]) => (arr.length? arr.reduce((a,b)=>a+b,0)/arr.length : 0);
              const last5 = take.slice(-5);
              const prev5 = take.slice(0,5);
              const mk = (sel:(e:any)=>number) => ({ l5: avgOf(last5.map(sel)), p5: avgOf(prev5.map(sel)) });
              const T = mk((e:any)=> Math.max(0, net(e.turkce.dogru, e.turkce.yanlis)));
              const M = mk((e:any)=> Math.max(0, net(e.matematik.dogru, e.matematik.yanlis)));
              const F = mk((e:any)=> Math.max(0, net(e.fen.dogru, e.fen.yanlis)));
              const I = mk((e:any)=> Math.max(0, net(e.inkilap.dogru, e.inkilap.yanlis)));
              const D = mk((e:any)=> Math.max(0, net(e.din.dogru, e.din.yanlis)));
              const E = mk((e:any)=> Math.max(0, net(e.ingilizce.dogru, e.ingilizce.yanlis)));
              const rows = [
                { name: 'Türkçe', ...T }, { name: 'Matematik', ...M }, { name: 'Fen', ...F },
                { name: 'İnkılap', ...I }, { name: 'Din', ...D }, { name: 'İngilizce', ...E },
              ].map(r => {
                const delta = r.l5 - r.p5;
                const pct = r.p5 ? (delta / r.p5) * 100 : 0;
                return { ...r, delta, pct };
              });
              return (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
                  {rows.map(r => (
                    <div key={r.name} className="text-[11px] text-gray-700 flex items-center gap-1">
                      <button
                        type="button"
                        className="w-20 text-left truncate underline decoration-dotted hover:text-indigo-700"
                        onClick={()=> setBranchFilter(r.name==='Türkçe'?'T':r.name==='Matematik'?'M':r.name==='Fen'?'F':r.name==='İnkılap'?'I':r.name==='Din'?'D':'E')}
                        title={`${r.name} filtresi uygula`}
                      >{r.name}</button>
                      <span className={`px-1.5 py-0.5 rounded ${r.delta>=0?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>{r.delta>=0?'+':''}{fmt1(r.delta)}</span>
                      <span className={`px-1.5 py-0.5 rounded ${r.pct>=0?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>{r.pct>=0?'+':''}{r.pct.toFixed(1)}%</span>
        </div>
                  ))}
                </div>
              );
            })()}
            <p className="mt-2 text-[11px] text-gray-500">Etiketler net ortalamaları gösterir. %Δ ve Δ rozetleri aşağıdadır.</p>
            <p className="mt-1 text-[11px] text-gray-500">Açık renk (Son 5) – önceki 5 sınava göre değişimi okuyun: Δ pozitif ise gelişme var.</p>
          </WidgetCard>
          <WidgetCard title={branchFilter==='all' ? 'Ortalama Netler (Δ vs Önceki 5)' : `${branchFilter==='T'?'Türkçe':branchFilter==='M'?'Matematik':branchFilter==='F'?'Fen':branchFilter==='I'?'İnkılap':branchFilter==='D'?'Din':'İngilizce'} – Ortalama Netler (Δ vs Önceki 5)`}>
            {(() => {
              if (branchFilter==='all') {
                return (
                  <>
              <div className="flex items-baseline gap-2">
                      <div className={`text-xl font-semibold ${kpiDeltaPct>=0?'text-emerald-600':'text-rose-600'}`}>{kpiDeltaPct>=0?'+':''}{kpiDeltaPct.toFixed(1)}%</div>
                      <div className="text-[11px] text-gray-500">son 5 vs önceki 5</div>
              </div>
                    <div style={{ width: '100%', height: chartH }}>
              <ResponsiveContainer>
                {(() => {
                  const data = scores20.map((s, i) => ({ idx: i + 1, puan: s }));
                  return (
                            <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                              <CartesianGrid stroke="#f0f0f0" />
                              <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v)=>`E${v}`} />
                              <YAxis domain={[minS20, maxS20]} tick={{ fontSize: 10, fill: '#6b7280' }} />
                              <Tooltip
                                contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                                labelFormatter={(l)=>`Exam ${l}`}
                                formatter={(val:any)=> Math.round(Number(val))}
                              />
                      <ReferenceLine y={kpiLast5} stroke="#9ca3af" strokeDasharray="3 3" />
                              <Bar dataKey="puan" fill="#60a5fa" radius={[3,3,0,0]} barSize={10} />
                    </BarChart>
                  );
                })()}
              </ResponsiveContainer>
            </div>
                  </>
                );
              } else {
                const max = (branchFilter==='T'||branchFilter==='M'||branchFilter==='F') ? MAXS.T : MAXS.I;
                const vals = [...filtered].slice(0,20).reverse().map((e:any) => {
                  const pick = branchFilter==='T'? e.turkce : branchFilter==='M'? e.matematik : branchFilter==='F'? e.fen : branchFilter==='I'? e.inkilap : branchFilter==='D'? e.din : e.ingilizce;
                  return Math.max(0, net(pick.dogru, pick.yanlis));
                });
                const last5 = vals.slice(-5);
                const prev5 = vals.slice(-10, -5);
                const avgOf = (arr:number[]) => (arr.length? arr.reduce((a,b)=>a+b,0)/arr.length : 0);
                const delta = avgOf(last5) - avgOf(prev5);
                const pct = avgOf(prev5) ? (delta / avgOf(prev5)) * 100 : 0;
                const data = vals.map((v, i)=> ({ idx: i+1, puan: v }));
                return (
                  <>
                    <div className="flex items-baseline gap-2">
                      <div className={`text-xl font-semibold ${delta>=0?'text-emerald-600':'text-rose-600'}`}>{delta>=0?'+':''}{pct.toFixed(1)}%</div>
                      <div className="text-[11px] text-gray-500">son 5 vs önceki 5</div>
        </div>
                    <div style={{ width: '100%', height: chartH }}>
                      <ResponsiveContainer>
                        <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="#f0f0f0" />
                          <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v)=>`E${v}`} />
                          <YAxis domain={[0, max]} tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }} labelFormatter={(l)=>`Exam ${l}`} formatter={(v:any)=> `${fmt2(Number(v))} net`} />
                          <Bar dataKey="puan" fill="#60a5fa" radius={[3,3,0,0]} barSize={10} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                );
              }
            })()}
          </WidgetCard>
          <WidgetCard title="Önerilen Haftalık Odak">
            <div className="text-[12px] text-gray-700 mb-1">Zayıf görünen branşlar için küçük bir çalışma planı:</div>
            <ul className="list-disc pl-4 text-[12px] text-gray-700">
              {weakestThree.map(([n]) => (
                <li key={String(n)}>
                  {String(n)}: 3 gün × 20 soru deneme + 1 gün konu tekrarı (kısa notlar).
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-gray-500">Öneriler veri geldikçe kendini günceller.</p>
          </WidgetCard>
          </React.Fragment>)}
          {viewTab==='trend' && (
          <WidgetCard title="Genel Puan Gelişimi">
          <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M19 7l-6 6-4-4-4 4"/></svg>
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">Trend</div>
                  <div className="text-[11px] text-gray-500">Son denemelerde MSP değişimi</div>
          </div>
              </div>
              <button className="text-[11px] text-gray-500 hover:text-gray-700" title="MSP: 100–500 aralığında normalize puan. Hedef çizgisi turuncudur.">i</button>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-xl font-semibold text-emerald-600">{overallDeltaText}%</div>
              <div className="text-[11px] text-gray-500">tüm denemeler</div>
            </div>
            <div style={{ width: '100%', height: chartH }}>
              <ResponsiveContainer>
                {(() => {
                  if (filtered.length < 3) {
                  return (
                      <div className="w-full h-full p-3 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded mb-2" />
                        <div className="h-24 bg-gray-100 rounded" />
                      </div>
                    );
                  }
                  const data = scores20.map((s, i) => ({ idx: i + 1, puan: s }));
                  return (
                    <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#f0f0f0" strokeDasharray="2 2" />
                      <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v)=>`E${v}`} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} domain={[Math.min(minS20, targetScore), Math.max(maxS20, targetScore)]} />
                      <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }} labelFormatter={(l)=>`Exam ${l}`} />
                      <ReferenceLine y={targetScore} stroke="#f59e0b" strokeDasharray="4 2">
                        <Label value={`Hedef ${targetScore}`} position="right" fontSize={10} fill="#f59e0b" />
                      </ReferenceLine>
                      <Line type="monotone" dataKey="puan" stroke="#0ea5e9" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  );
                })()}
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">Y ekseni MSP (100–500). İnce grid aralıkları trend okumayı kolaylaştırır.</p>
            <p className="mt-1 text-[11px] text-amber-600">Turuncu çizgi hedef puanı ({targetScore}) gösterir.</p>
          </WidgetCard>
          )}
        </div>
        )}

        {/* Tablo görünümü */}
        {viewTab==='tablo' && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto mt-3">
            {filtered.length > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-2 py-2 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      value={search}
                      onChange={(e)=> setSearch(e.target.value)}
                      placeholder="Ara: deneme adı/yayın"
                      className="w-44 sm:w-60 px-2.5 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      ref={searchInputRef}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">⌘K</span>
                  </div>
                  <select
                    value={filterPublisher}
                    onChange={(e)=> setFilterPublisher(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-800"
                    title="Yayına göre filtrele"
                  >
                    <option value="all">Tüm Yayınlar</option>
                    {publishers.map((p:string)=> (
                      <option key={p} value={p}>{p}</option>
                    ))}
              </select>
                  <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                    <button
                      onClick={()=> setDenseView(false)}
                      className={`px-2.5 py-1.5 text-xs ${!denseView ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >Standart</button>
                    <button
                      onClick={()=> setDenseView(true)}
                      className={`px-2.5 py-1.5 text-xs ${denseView ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >Sıkı</button>
            </div>
          </div>
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={exportCSV} className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-100">
                    CSV İndir
                  </button>
        </div>
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="p-4">
                <p className="text-sm text-gray-700 font-medium">Kayıt bulunamadı</p>
                <p className="text-[11px] text-gray-500 mt-1">Filtreleri genişletmeyi veya temizlemeyi deneyin.</p>
                <div className="mt-3">
                  <button onClick={()=> setIsOpen(true)} className="px-3 py-1.5 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white">İlk Denemeni Ekle</button>
                </div>
              </div>
            ) : (
              <table className="w-full text-xs text-left text-gray-700">
                <thead className="text-[10px] text-gray-700 uppercase bg-gradient-to-b from-gray-100 to-gray-200 sticky top-[42px] z-10">
                  <tr>
                    <th className="px-2 py-1 cursor-pointer" onClick={()=> onSort('date')}>Tarih {sortIndicator('date')}</th>
                    <th className="px-2 py-1 cursor-pointer" onClick={()=> onSort('name')}>Ad {sortIndicator('name')}</th>
                    <th className="px-2 py-1 cursor-pointer" onClick={()=> onSort('publisher')}>Yayın {sortIndicator('publisher')}</th>
                    <th className="px-2 py-1">T</th>
                    <th className="px-2 py-1">M</th>
                    <th className="px-2 py-1">F</th>
                    <th className="px-2 py-1">İ</th>
                    <th className="px-2 py-1">D</th>
                    <th className="px-2 py-1">E</th>
                    <th className="px-2 py-1 cursor-pointer" onClick={()=> onSort('total')}>Toplam Net {sortIndicator('total')}</th>
                    <th className="px-2 py-1 cursor-pointer" onClick={()=> onSort('score')}>Puan {sortIndicator('score')}</th>
                    <th className="px-2 py-1 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
                  {(() => { const latestId = filtered[0]?.id; return sortedFiltered.map((e:any, idx:number) => {
                    const nT = Math.max(0, net(e.turkce.dogru, e.turkce.yanlis));
                    const nM = Math.max(0, net(e.matematik.dogru, e.matematik.yanlis));
                    const nF = Math.max(0, net(e.fen.dogru, e.fen.yanlis));
                    const nI = Math.max(0, net(e.inkilap.dogru, e.inkilap.yanlis));
                    const nD = Math.max(0, net(e.din.dogru, e.din.yanlis));
                    const nE = Math.max(0, net(e.ingilizce.dogru, e.ingilizce.yanlis));
                    const total = nT+nM+nF+nI+nD+nE;
                    const puan = (scoringMethod==='zt' && lgsStats ? scoreOfZTPuan(e, lgsStats as any) : scoreOf(e));
                    // previous exam in chronological order (filtered is newest->oldest)
                    const idxF = filtered.findIndex((x:any)=> x.id === e.id);
                    const prev = idxF>=0 ? filtered[idxF+1] : null;
                    const prevScore = prev ? (scoringMethod==='zt' && lgsStats ? scoreOfZTPuan(prev, lgsStats as any) : scoreOf(prev)) : null;
                    const prevTotal = prev ? (()=>{ const a = Math.max(0, net(prev.turkce.dogru, prev.turkce.yanlis)); const b = Math.max(0, net(prev.matematik.dogru, prev.matematik.yanlis)); const c = Math.max(0, net(prev.fen.dogru, prev.fen.yanlis)); const d = Math.max(0, net(prev.inkilap.dogru, prev.inkilap.yanlis)); const eN = Math.max(0, net(prev.din.dogru, prev.din.yanlis)); const f = Math.max(0, net(prev.ingilizce.dogru, prev.ingilizce.yanlis)); return a+b+c+d+eN+f; })() : null;
                    const dScore = prevScore==null ? null : (puan - prevScore);
                    const dTotal = prevTotal==null ? null : (total - prevTotal);
                    const t = e.createdAt?.toDate ? e.createdAt.toDate() as Date : null;
                    const tarih = t ? t.toLocaleDateString('tr-TR') : '-';
                return (
                      <tr key={e.id || idx} className={`border-t hover:bg-gray-50 odd:bg-gray-50/40 ${e.id===latestId?'bg-blue-50/40':''}`}>
                        <td className="px-2 py-1 border-r whitespace-nowrap">{tarih}</td>
                        <td className="px-2 py-1 border-r">{e.ad || '-'}</td>
                        <td className="px-2 py-1 border-r">{e.yayin || '-'}</td>
                        <td className="px-2 py-1 border-r">{fmt1(nT)}</td>
                        <td className="px-2 py-1 border-r">{fmt1(nM)}</td>
                        <td className="px-2 py-1 border-r">{fmt1(nF)}</td>
                        <td className="px-2 py-1 border-r">{fmt1(nI)}</td>
                        <td className="px-2 py-1 border-r">{fmt1(nD)}</td>
                        <td className="px-2 py-1 border-r">{fmt1(nE)}</td>
                        <td className="px-2 py-1 border-r">
                          <div className="flex items-center gap-1">
                            <span>{fmt1(total)}</span>
                            {dTotal!=null && (
                              <span className={`text-[10px] px-1 rounded ${dTotal>=0?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>{dTotal>=0?'+':''}{fmt1(dTotal)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1 border-r font-medium text-gray-900">
                          <div className="flex items-center gap-1">
                            <span>{puan}</span>
                            {dScore!=null && (
                              <span className={`text-[10px] px-1 rounded ${dScore>=0?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>{dScore>=0?'+':''}{Math.round(dScore)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={()=> setEditing(e)} className="px-2 py-0.5 text-[10px] rounded border border-gray-300">Düzenle</button>
                            <button onClick={()=> handleAddMistakeExam(e)} className="px-2 py-0.5 text-[10px] rounded border border-amber-300 bg-amber-50 text-amber-700">Hata Defteri</button>
                            <button onClick={()=> handleDelete(e)} className="px-2 py-0.5 text-[10px] rounded border border-gray-300">Sil</button>
                          </div>
                    </td>
                  </tr>
                );
                  })})()}
            </tbody>
          </table>
            )}
        </div>
        )}
        {/* container kapanışı */}
        </div>
      </main>

      <ExamAddModal
        isOpen={isOpen}
        onClose={()=> setIsOpen(false)}
        onSave={handleAdd}
      />
      <ExamAddModal
        isOpen={!!editing}
        onClose={()=> setEditing(null)}
        title="Denemeyi Düzenle"
        initialData={editing ? {
          ad: (editing as any).ad,
          yayin: (editing as any).yayin,
          turkce: (editing as any).turkce,
          matematik: (editing as any).matematik,
          fen: (editing as any).fen,
          inkilap: (editing as any).inkilap,
          din: (editing as any).din,
          ingilizce: (editing as any).ingilizce,
        } : undefined}
        onSave={async (payload)=>{
          if (!editing) return;
          try {
            await updateDoc(doc(db, 'exams', (editing as any).id), payload);
            setToast({ message: 'Güncellendi.', type: 'success' });
          } catch {
            setToast({ message: 'Güncellenemedi.', type: 'error' });
          } finally {
            setEditing(null);
            setTimeout(()=> setToast(null), 1500);
          }
        }}
      />
      {editingMistake && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={()=> setEditingMistake(null)} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Hata Detayı</h3>
              <button className="text-xs text-gray-500" onClick={()=> setEditingMistake(null)}>Kapat</button>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div>
                <div className="text-[11px] text-gray-500">Deneme</div>
                <div className="text-sm text-gray-900">{editingMistake.ad || 'Deneme'} <span className="text-gray-500">• {editingMistake.yayin || '-'}</span></div>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Not</label>
                <textarea value={mistakeNote} onChange={(e)=> setMistakeNote(e.target.value)} className="w-full rounded border border-gray-300 text-sm p-2" rows={4} placeholder="Kısa not yazın..." />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <button onClick={deleteMistake} className="px-2.5 py-1.5 text-xs rounded-md border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100">Sil</button>
              <div className="flex items-center gap-2">
                <button onClick={()=> setEditingMistake(null)} className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-100">İptal</button>
                <button onClick={saveMistake} className="px-2.5 py-1.5 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white">Kaydet</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-3 py-2 rounded text-white text-sm ${toast.type==='success'?'bg-emerald-600':'bg-rose-600'}`}>{toast.message}</div>
      )}
    </div>
  );
};

export default ExamsPage;
