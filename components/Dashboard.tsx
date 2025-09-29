// FIX: Implemented the Dashboard component which was previously a placeholder.
// This component now fetches and manages test results from Firestore,
// displays statistics, and provides functionality for adding, updating, and deleting results.
import React, { useState, useEffect, useMemo } from 'react';
import { User, signOut } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { TestResult, MistakeEntry } from '../types';
import Header from './Header';
import StatCard from './StatCard';
import TestResultsTable from './TestResultsTable';
import Toast from './Toast';
import Spinner from './Spinner';
import BookOpenIcon from './icons/BookOpenIcon';
import UserGroupIcon from './icons/UserGroupIcon';
import PlusIcon from './icons/PlusIcon';
import CourseSuccessChart from './CourseSuccessChart';
import TimeSeriesChart from './TimeSeriesChart';
import PerformanceCards from './PerformanceCards';
import ChartModal from './ChartModal';
import RankingSummary from './RankingSummary';
import ScopeBadge from './ScopeBadge';
import CogIcon from './icons/CogIcon';
import GlobeIcon from './icons/GlobeIcon';
import UserIcon from './icons/UserIcon';
import CourseSelect from './CourseSelect';
import InsightsCards from './InsightsCards';
import LevelBadge from './LevelBadge';
import QuickAddModal from './QuickAddModal';
import BadgesBar, { type BadgeKey } from './BadgesBar';
import ConfirmModal from './ConfirmModal';
import MistakeModal from './MistakeModal';
import { getCourseTopics } from '../data/topics';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number | 'all'>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof TestResult; direction: 'ascending' | 'descending' } | null>(null);
  const [isCompact, setIsCompact] = useState<boolean>(true);
  const [showOnlyMyResults, setShowOnlyMyResults] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null);
  const [scope, setScope] = useState<'self' | 'school'>('school');
  // Hata Defteri modal state
  const [isMistakeOpen, setIsMistakeOpen] = useState(false);
  const [mistakeResult, setMistakeResult] = useState<TestResult | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<BadgeKey[]>(() => {
    try {
      const raw = localStorage.getItem('earned_badges');
      return raw ? (JSON.parse(raw) as BadgeKey[]) : [];
    } catch { return []; }
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Mistakes (Hata Defteri)
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const [mistakeFilterCourse, setMistakeFilterCourse] = useState<string>('all');
  const [mistakeFilterTopic, setMistakeFilterTopic] = useState<string>('all');
  const [mistakeFilterStatus, setMistakeFilterStatus] = useState<'all' | 'open' | 'reviewed' | 'archived'>('all');

  // Goals (personalized): daily/weekly targets with localStorage persistence
  const [dailyTarget, setDailyTarget] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('goals_v1');
      if (!raw) return 1;
      const parsed = JSON.parse(raw);
      return typeof parsed.daily === 'number' ? parsed.daily : 1;
    } catch { return 1; }
  });
  const [weeklyTarget, setWeeklyTarget] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('goals_v1');
      if (!raw) return 3;
      const parsed = JSON.parse(raw);
      return typeof parsed.weekly === 'number' ? parsed.weekly : 3;
    } catch { return 3; }
  });
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [tmpDaily, setTmpDaily] = useState<string>('');
  const [tmpWeekly, setTmpWeekly] = useState<string>('');

  const toDateSafe = (v: any): Date | null => {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate();
    if (typeof v === 'number') return new Date(v);
    if (typeof v === 'string') {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const userDailyWeekly = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let daily = 0;
    let weekly = 0;
    for (const r of testResults) {
      if (r.kullaniciId !== user.uid) continue;
      const d = toDateSafe((r as any).createdAt);
      if (!d) continue;
      if (d >= startOfDay) daily += 1;
      if (d >= sevenDaysAgo) weekly += 1;
    }
    return { daily, weekly };
  }, [testResults, user.uid]);

  // Simple points and level progress
  const userTestCount = useMemo(() => testResults.filter(r => r.kullaniciId === user.uid).length, [testResults, user.uid]);
  const userPoints = useMemo(() => userTestCount * 10, [userTestCount]);
  type LevelInfo = { name: 'Giriş' | 'Orta' | 'İleri'; min: number; max: number | null };
  const levelInfo: LevelInfo = useMemo(() => {
    if (userPoints >= 200) return { name: 'İleri', min: 200, max: null };
    if (userPoints >= 100) return { name: 'Orta', min: 100, max: 200 };
    return { name: 'Giriş', min: 0, max: 100 };
  }, [userPoints]);
  const levelProgressPct = useMemo(() => {
    if (levelInfo.max == null) return 100;
    const span = levelInfo.max - levelInfo.min;
    const within = Math.max(0, Math.min(span, userPoints - levelInfo.min));
    return Math.round((within / span) * 100);
  }, [levelInfo, userPoints]);

  // Subscribe to user's mistakes (hata defteri)
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'mistakes'),
      // Security rules require owner-only; filter by current user
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      where('kullaniciId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: MistakeEntry[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        // Already filtered by query
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
      setMistakes(items);
    });
    return () => unsub();
  }, [user?.uid]);

  const mistakeCourses = useMemo(() => {
    const s = new Set<string>();
    mistakes.forEach(m => s.add(m.dersAdi));
    return ['all', ...Array.from(s)];
  }, [mistakes]);

  const mistakeTopics = useMemo(() => {
    if (mistakeFilterCourse === 'all') return ['all'];
    const s = new Set<string>();
    mistakes.filter(m => m.dersAdi === mistakeFilterCourse).forEach(m => (m.topics || []).forEach(t => s.add(t)));
    return ['all', ...Array.from(s)];
  }, [mistakes, mistakeFilterCourse]);

  const filteredMistakes = useMemo(() => {
    return mistakes.filter(m => {
      if (mistakeFilterCourse !== 'all' && m.dersAdi !== mistakeFilterCourse) return false;
      if (mistakeFilterTopic !== 'all' && !(m.topics || []).includes(mistakeFilterTopic)) return false;
      if (mistakeFilterStatus !== 'all' && m.status !== mistakeFilterStatus) return false;
      return true;
    });
  }, [mistakes, mistakeFilterCourse, mistakeFilterTopic, mistakeFilterStatus]);

  const updateMistakeStatus = async (id: string, status: 'open' | 'reviewed' | 'archived') => {
    try {
      await updateDoc(doc(db, 'mistakes', id), { status });
      setToast({ message: 'Durum güncellendi.', type: 'success' });
    } catch (e) {
      console.error('update mistake status', e);
      setToast({ message: 'Durum güncellenemedi.', type: 'error' });
    }
  };

  // (moved below) userResults and scopeResults defined later alongside stats

  // Badges: first_test, five_tests, seven_day_streak
  const computedBadges = useMemo<BadgeKey[]>(() => {
    const out: BadgeKey[] = [];
    const userCount = testResults.filter(r => r.kullaniciId === user.uid).length;
    if (userCount >= 1) out.push('first_test');
    if (userCount >= 5) out.push('five_tests');
    if (userDailyWeekly.weekly >= 7) out.push('seven_day_streak');
    return out;
  }, [testResults, user.uid, userDailyWeekly]);

  useEffect(() => {
    // detect newly earned badges
    const newly = computedBadges.filter(b => !earnedBadges.includes(b));
    if (newly.length > 0) {
      setEarnedBadges(prev => {
        const next = Array.from(new Set([...prev, ...newly]));
        try { localStorage.setItem('earned_badges', JSON.stringify(next)); } catch {}
        return next;
      });
      // simple toast for the first new badge in this batch
      const first = newly[0];
      setToast({ message: `Tebrikler! Yeni rozet kazandın (${first}).`, type: 'success' });
    }
  }, [computedBadges]);

  useEffect(() => {
    if (earnedBadges.length === 0) return;
    try {
      localStorage.setItem('earned_badges', JSON.stringify(earnedBadges));
    } catch {}
  }, [earnedBadges]);

  // Points & Level (simple model): each test +10, daily goal met +20, weekly goal met +50
  const userLevel: 'giris' | 'orta' | 'ileri' = useMemo(() => {
    if (userPoints >= 300) return 'ileri';
    if (userPoints >= 100) return 'orta';
    return 'giris';
  }, [userPoints]);

  const openModal = (chart: React.ReactNode) => {
    setModalContent(chart);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    const q = query(collection(db, 'testSonuclari'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const results: TestResult[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: doc.id,
          dersAdi: data.dersAdi,
          dogruSayisi: data.dogruSayisi,
          yanlisSayisi: data.yanlisSayisi,
          bosSayisi: data.bosSayisi || 0,
          topics: data.topics || [],
          kullaniciId: data.kullaniciId,
          kullaniciEmail: data.kullaniciEmail,
          createdAt: data.createdAt
        });
      });
      setTestResults(results);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching test results: ", error);
      setLoading(false);
      setToast({ message: 'Sonuçlar yüklenirken bir hata oluştu.', type: 'error' });
    });

    return () => unsubscribe();
  }, []);

  // Load persisted toolbar settings
  useEffect(() => {
    try {
      const savedScope = localStorage.getItem('dashboard_scope');
      if (savedScope === 'self' || savedScope === 'school') {
        setScope(savedScope);
      }
      const savedCourse = localStorage.getItem('dashboard_course');
      if (savedCourse) {
        setSelectedCourse(savedCourse);
      }
    } catch {}
  }, []);

  // Persist scope & course changes
  useEffect(() => {
    try { localStorage.setItem('dashboard_scope', scope); } catch {}
  }, [scope]);
  useEffect(() => {
    try { localStorage.setItem('dashboard_course', selectedCourse); } catch {}
  }, [selectedCourse]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setToast({ message: 'Başarıyla çıkış yapıldı.', type: 'success' });
    } catch (error) {
      console.error('Error signing out: ', error);
      setToast({ message: 'Çıkış yapılırken bir hata oluştu.', type: 'error' });
    }
  };

  const handleAddResult = async (dersAdi: string, dogruSayisi: number, yanlisSayisi: number, bosSayisi: number, topics: string[] = []) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'testSonuclari'), {
        dersAdi,
        dogruSayisi,
        yanlisSayisi,
        bosSayisi,
        topics,
        kullaniciId: user.uid,
        kullaniciEmail: user.email,
        createdAt: serverTimestamp()
      });
      setToast({ message: 'Test sonucu başarıyla eklendi.', type: 'success' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding test result: ', error);
      setToast({ message: 'Test sonucu eklenirken bir hata oluştu.', type: 'error' });
    }
  };

  const handleUpdateResult = async (id: string, dersAdi: string, dogruSayisi: number, yanlisSayisi: number, bosSayisi: number, topics: string[] = []) => {
    const docRef = doc(db, 'testSonuclari', id);
    try {
      await updateDoc(docRef, {
        dersAdi,
        dogruSayisi,
        yanlisSayisi,
        bosSayisi,
        topics
      });
      setToast({ message: 'Sonuç başarıyla güncellendi.', type: 'success' });
    } catch (error) {
      console.error('Error updating document: ', error);
      setToast({ message: 'Sonuç güncellenirken bir hata oluştu.', type: 'error' });
    }
  };

  const handleDeleteResult = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleAddMistake = (result: TestResult) => {
    setMistakeResult(result);
    setIsMistakeOpen(true);
  };

  const handleSaveMistake = async ({ topic, note, imageUrl }: { topic: string | null; note: string; imageUrl?: string }) => {
    if (!user || !mistakeResult) return;
    try {
      await addDoc(collection(db, 'mistakes'), {
        kullaniciId: user.uid,
        dersAdi: mistakeResult.dersAdi,
        topics: topic ? [topic] : [],
        note: note || '',
        imageUrl: imageUrl || null,
        testResultId: mistakeResult.id,
        status: 'open',
        createdAt: serverTimestamp(),
        nextReviewAt: null,
      });
      setToast({ message: 'Hata defterine eklendi.', type: 'success' });
    } catch (e) {
      console.error('Error adding mistake:', e);
      setToast({ message: 'Hata defterine eklenemedi.', type: 'error' });
    } finally {
      setIsMistakeOpen(false);
      setMistakeResult(null);
    }
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteDoc(doc(db, 'testSonuclari', confirmDeleteId));
        setToast({ message: 'Sonuç başarıyla silindi.', type: 'success' });
    } catch (err) {
      console.error('Error deleting document:', err);
      setToast({ message: 'Silme işlemi başarısız.', type: 'error' });
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Filter results for table display (controlled by checkbox)
  const displayResults = useMemo(() => {
    if (showOnlyMyResults) {
      return testResults.filter((r) => r.kullaniciId === user.uid);
    }
    return testResults;
  }, [testResults, user.uid, showOnlyMyResults]);

  const courseOptions = useMemo(() => {
    const courses = new Set(displayResults.map(r => r.dersAdi));
    return ['all', ...Array.from(courses)];
  }, [displayResults]);

  // Always show user's own data for stats and charts (personalized dashboard)
  const userResults = useMemo(() => {
    return testResults.filter((r) => r.kullaniciId === user.uid);
  }, [testResults, user.uid]);

  // Scope-based dataset for charts (self vs school-wide)
  const scopeResults = useMemo(() => {
    return scope === 'self' ? userResults : testResults;
  }, [scope, userResults, testResults]);

  const filteredForStats = useMemo(() => {
    if (selectedCourse === 'all') {
      return scopeResults;
    }
    return scopeResults.filter(r => r.dersAdi === selectedCourse);
  }, [scopeResults, selectedCourse]);

  const stats = useMemo(() => {
    const totalTests = filteredForStats.length;
    const totalCorrect = filteredForStats.reduce((sum, r) => sum + (r.dogruSayisi || 0), 0);
    const totalWrong = filteredForStats.reduce((sum, r) => sum + (r.yanlisSayisi || 0), 0);
    const totalEmpty = filteredForStats.reduce((sum, r) => sum + (r.bosSayisi || 0), 0);
    const totalQuestions = totalCorrect + totalWrong + totalEmpty;
    const netCorrect = totalCorrect - (totalWrong / 4);
    const overallSuccessRate = totalQuestions > 0 ? Math.round((Math.max(0, netCorrect) / totalQuestions) * 100) : 0;
    
    return { totalTests, overallSuccessRate, totalQuestions };
  }, [filteredForStats]);

  // KPI helpers for Dashboard (user scope)
  const userChrono = useMemo(() => userResults.slice().sort((a,b)=>{
    const ta = (a as any).createdAt?.toMillis ? (a as any).createdAt.toMillis() : 0;
    const tb = (b as any).createdAt?.toMillis ? (b as any).createdAt.toMillis() : 0;
    return ta - tb;
  }), [userResults]);
  const lastFive = useMemo(() => userChrono.slice(-5), [userChrono]);
  const avgLast5Net = useMemo(() => {
    if (lastFive.length === 0) return 0;
    const nets = lastFive.map(r => Math.max(0, (r.dogruSayisi||0) - (r.yanlisSayisi||0)/4));
    return Math.round((nets.reduce((a,b)=>a+b,0) / nets.length) * 100) / 100;
  }, [lastFive]);
  const lastNet = useMemo(() => {
    const r = userChrono[userChrono.length - 1];
    if (!r) return 0;
    return Math.round((Math.max(0, (r.dogruSayisi||0) - (r.yanlisSayisi||0)/4)) * 100) / 100;
  }, [userChrono]);

  // Weak branches (average net per course) and quick task creation
  const branchAverages = useMemo(() => {
    if (userResults.length === 0) return {} as Record<string, number>;
    const sum: Record<string, { total: number; count: number; max: number }> = {};
    userResults.forEach((r) => {
      const totalQuestions = (r.dogruSayisi||0) + (r.yanlisSayisi||0) + (r.bosSayisi||0);
      const max = r.dersAdi === 'Türkçe' || r.dersAdi === 'Matematik' || r.dersAdi === 'Fen Bilgisi' ? 20 : 10;
      const net = Math.max(0, (r.dogruSayisi||0) - (r.yanlisSayisi||0)/4);
      if (!sum[r.dersAdi]) sum[r.dersAdi] = { total: 0, count: 0, max };
      sum[r.dersAdi].total += net;
      sum[r.dersAdi].count += 1;
    });
    const out: Record<string, number> = {};
    Object.keys(sum).forEach(k => {
      out[k] = sum[k].count ? (sum[k].total / sum[k].count) : 0;
    });
    return out;
  }, [userResults]);
  const weakestThree = useMemo(() => {
    return Object.entries(branchAverages).sort((a,b)=> a[1]-b[1]).slice(0,3);
  }, [branchAverages]);

  const handleCreateQuickTask = async (branch: string) => {
    if (!user?.uid) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'tasks'), {
        title: `${branch}: 15 soru (hızlı pratik)`,
        branch,
        type: 'practice',
        target: 15,
        progress: 0,
        status: 'open',
        createdAt: serverTimestamp(),
      });
      setToast({ message: 'Görev oluşturuldu.', type: 'success' });
    } catch (e) {
      console.error('create task', e);
      setToast({ message: 'Görev oluşturulamadı.', type: 'error' });
    }
  };

  // Use display data for all components
  const tableResults = useMemo(() => {
    return displayResults;
  }, [displayResults]);

  const requestSort = (key: keyof TestResult) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedResults = useMemo(() => {
    let sortableItems = [...tableResults];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [tableResults, sortConfig]);

  // Pagination logic
  const totalResults = sortedResults.length;
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalResults / pageSize);
  
  const paginatedResults = useMemo(() => {
    if (pageSize === 'all') {
      return sortedResults;
    }
    const startIndex = (currentPage - 1) * pageSize;
    return sortedResults.slice(startIndex, startIndex + pageSize);
  }, [sortedResults, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, sortConfig]);

  // Sync table user-only filter with scope selection
  useEffect(() => {
    if (scope === 'school') {
      setShowOnlyMyResults(false);
    } else {
      setShowOnlyMyResults(true);
    }
  }, [scope]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Header user={user} onLogout={handleLogout} />
      
      <main className="container mx-auto max-w-6xl px-3 sm:px-4 lg:px-6 py-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
            <div>
                <h1 className="text-lg font-bold text-gray-900">Test Takibi</h1>
                <p className="text-gray-500 text-xs">Test sonuçlarınızı yönetin ve analiz edin</p>
            </div>

        {/* Compact Goals + Badges Strip (sticky) */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-3 sticky top-2 z-20">
          <div className="flex items-center gap-2 p-1.5 overflow-x-auto">
            <div className="hidden sm:block shrink-0">
              <LevelBadge level={userLevel} compact />
            </div>
            {/* Level progress bar */}
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-600">
              <span>{levelInfo.name}</span>
              <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-1 bg-emerald-500" style={{ width: `${levelProgressPct}%` }} />
              </div>
              <span>{userPoints}p</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-600">Günlük</span>
                <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-1 ${userDailyWeekly.daily >= dailyTarget ? 'bg-emerald-500' : 'bg-emerald-300'}`} style={{ width: `${Math.min(100, userDailyWeekly.daily / dailyTarget * 100)}%` }} />
                </div>
                <span className="text-[10px] text-gray-700">{Math.min(userDailyWeekly.daily, dailyTarget)}/{dailyTarget}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-600">Haftalık</span>
                <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-1 ${userDailyWeekly.weekly >= weeklyTarget ? 'bg-sky-500' : 'bg-sky-300'}`} style={{ width: `${Math.min(100, userDailyWeekly.weekly / weeklyTarget * 100)}%` }} />
                </div>
                <span className="text-[10px] text-gray-700">{Math.min(userDailyWeekly.weekly, weeklyTarget)}/{weeklyTarget}</span>
              </div>
        </div>
            <div className="w-px h-4 bg-gray-200" />
            <BadgesBar earned={earnedBadges} showLocked={false} />
            <div className="w-px h-4 bg-gray-200" />
            {/* Scope toggle - always visible */}
            <div className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 p-0.5">
              <button
                type="button"
                title="Kendim"
                aria-label="Kendim"
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full ${scope === 'self' ? 'bg-white text-emerald-700 border border-emerald-200 shadow-sm' : 'text-gray-700'}`}
                onClick={() => setScope('self')}
              >
                <UserIcon className="h-3 w-3" />
                <span>Kendim</span>
              </button>
              <button
                type="button"
                title="Okul geneli"
                aria-label="Okul geneli"
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full ${scope === 'school' ? 'bg-white text-sky-700 border border-sky-200 shadow-sm' : 'text-gray-700'}`}
                onClick={() => setScope('school')}
              >
                <GlobeIcon className="h-3 w-3" />
                <span>Okul geneli</span>
              </button>
            </div>
            {/* Goals settings */}
            <button
              type="button"
              className="ml-auto inline-flex items-center justify-center p-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
              title="Hedefleri düzenle"
              onClick={() => { setTmpDaily(String(dailyTarget)); setTmpWeekly(String(weeklyTarget)); setIsGoalsOpen(true); }}
            >
              <CogIcon />
            </button>
          </div>
        </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAdding(true)}
                disabled={isAdding}
                className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-2.5 rounded-md transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs"
              >
                <PlusIcon />
                Yeni Test
              </button>
            </div>
        </div>

        {/* Course Filter */}
        {displayResults.length > 0 && courseOptions.length > 1 && (
          <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="text-gray-500 w-4 h-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <label className="text-xs font-medium text-gray-700">Ders</label>
                <CourseSelect
                  options={courseOptions}
                  value={selectedCourse}
                  onChange={(v) => setSelectedCourse(v)}
                />

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Silme Onayı"
        message="Bu test sonucunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, sil"
        cancelText="Vazgeç"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
              </div>
              <div className="hidden sm:block h-6 w-px bg-gray-200 ml-1" />
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-gray-600 hidden sm:inline">Kapsam</span>
                <div className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 p-0.5">
                  <button
                    type="button"
                    title="Kendim"
                    aria-label="Kendim"
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${scope === 'self' ? 'bg-white text-emerald-700 border border-emerald-200 shadow-sm' : 'text-gray-700'}`}
                    onClick={() => setScope('self')}
                  >
                    <UserIcon className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Kendim</span>
                  </button>
                  <button
                    type="button"
                    title="Okul geneli"
                    aria-label="Okul geneli"
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${scope === 'school' ? 'bg-white text-sky-700 border border-sky-200 shadow-sm' : 'text-gray-700'}`}
                    onClick={() => setScope('school')}
                  >
                    <GlobeIcon className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Okul geneli</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI Row */}
        {scopeResults.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Toplam Test</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalTests}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Toplam Soru</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalQuestions}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Başarı (%)</p>
              <p className="text-lg font-semibold {stats.overallSuccessRate>=70? 'text-emerald-700' : stats.overallSuccessRate>=60 ? 'text-amber-700' : 'text-rose-700'}">{stats.overallSuccessRate}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Son Net</p>
              <p className="text-lg font-semibold text-gray-900">{lastNet}</p>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          {/* Left Column - Stats */}
          <div className="lg:col-span-1">
            {scopeResults.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                title="Toplam Test"
                value={stats.totalTests}
                icon={<BookOpenIcon />}
                badgeLabel={<ScopeBadge scope={scope} />}
                infoTitle="Seçilen kapsam ve derse göre toplam test sayısı"
              />
              <StatCard
                title="Toplam Soru"
                value={stats.totalQuestions}
                icon={<UserGroupIcon />}
                badgeLabel={<ScopeBadge scope={scope} />}
                infoTitle="Seçilen kapsam ve derse göre toplam soru sayısı"
              />
            </div>
            )}
            {userResults.length > 0 && (
            <div className="mt-3">
              <PerformanceCards data={userResults} scopeBadge={<ScopeBadge scope={scope} />} />
            </div>
            )}
            {/* Weak-topic quick tasks */}
            {weakestThree.length > 0 && (
              <div className="mt-3 bg-white rounded-lg border border-gray-200 shadow-sm p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-900">Zayıf Branşlar – Hızlı Görev</h3>
                  <span className="text-[10px] text-gray-500">Tek tıkla görev oluştur</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {weakestThree.map(([name, val]) => {
                    const max = (name==='Türkçe' || name==='Matematik' || name==='Fen Bilgisi') ? 20 : 10;
                    const pct = Math.min(100, Math.max(0, (Number(val) / max) * 100));
                    return (
                      <div key={String(name)} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-800 font-medium truncate">{String(name)}</span>
                            <span className="text-[10px] text-gray-600">{val.toFixed(2)} / {max} net</span>
                          </div>
                          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-1.5 bg-amber-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCreateQuickTask(String(name))}
                          className="shrink-0 px-2 py-1 text-[10px] rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                        >Görev Ekle</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Removed LevelBadge + InsightsCards block as requested */}
                    </div>

          {/* Right Column - Charts + Row below charts */}
          {scopeResults.length > 0 && (
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                <div className="transition-shadow duration-200">
                  <CourseSuccessChart
                    data={scopeResults}
                    scopeBadge={<ScopeBadge scope={scope} />}
                    onEnlarge={() => openModal(
                      <CourseSuccessChart data={scopeResults} height={260} showEnlarge={false} scopeBadge={<ScopeBadge scope={scope} />} />
                    )}
                  />
                </div>
                <div className="transition-shadow duration-200">
                  <TimeSeriesChart
                    data={scopeResults}
                    selectedCourse={selectedCourse}
                    showFilter
                    scopeBadge={<ScopeBadge scope={scope} />}
                    onEnlarge={() => openModal(
                      <TimeSeriesChart data={scopeResults} selectedCourse={selectedCourse} showFilter showEnlarge={false} scopeBadge={<ScopeBadge scope={scope} />} height={260} />
                    )}
                  />
                </div>
              </div>
              {/* RankingSummary moved below the main grid to span full width */}
            </div>
          )}
        </div>
        {/* Full-width Ranking Summary below main grid */}
        {scopeResults.length > 0 && (
          <div className="mt-3 sm:mt-4">
            <RankingSummary data={scopeResults} currentUserId={user.uid} />
          </div>
        )}
        {(displayResults.length > 0 || isAdding) && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-2.5 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                <h2 className="text-xs font-semibold text-gray-900">
                  {showOnlyMyResults ? 'Test Sonuçlarım' : 'Tüm Test Sonuçları'}
                </h2>
                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                    id="user-filter"
                    checked={showOnlyMyResults}
                    onChange={(e) => setShowOnlyMyResults(e.target.checked)}
                    disabled={scope === 'school'}
                    className="h-3 w-3 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="user-filter" className="text-xs text-gray-600 select-none">
                    Kendi Test Sonuçlarım{scope === 'school' ? ' (okul genelinde devre dışı)' : ''}
                  </label>
                </div>
                </div>
            </div>
           <TestResultsTable
              results={paginatedResults}
              currentUserId={user.uid}
              currentUserEmail={user.email || 'N/A'}
              onDelete={handleDeleteResult}
              onAddResult={(a,b,c,d,topics) => handleAddResult(a,b,c,d,topics)}
              onUpdateResult={(id,a,b,c,d,topics) => handleUpdateResult(id,a,b,c,d,topics)}
              onAddMistake={handleAddMistake}
              isAdding={isAdding}
              onCancelAdd={() => setIsAdding(false)}
              sortConfig={sortConfig}
              requestSort={requestSort}
              isCompact={isCompact}
            />
            {totalResults > 0 && (
              <div className="p-2.5 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600">Göster:</span>
                    <select 
                        value={pageSize} 
                        onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      className="rounded border-gray-300 shadow-sm bg-white focus:ring-1 focus:ring-green-500 focus:border-green-500 py-0.5 px-1.5 text-[10px]"
                    >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value="all">Tümü</option>
                    </select>
                </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-600">
                      {currentPage} / {totalPages}
                    </span>
                    <div className="flex gap-1">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        className="px-1.5 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-[10px]"
                        >
                        ←
                        </button>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        className="px-1.5 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-[10px]"
                        >
                        →
                        </button>
                    </div>
                    </div>
                </div>
              </div>
            )}
        </div>
        )}

        

        {/* Empty State */}
        {displayResults.length === 0 && !isAdding && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz test sonucu yok</h3>
            <p className="text-gray-500 mb-6">Henüz test sonucunuz yok</p>
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <PlusIcon />
              İlk Test Sonucunu Ekle
            </button>
          </div>
        )}
      </main>

      <ChartModal isOpen={isModalOpen} onClose={closeModal}>
        {modalContent}
      </ChartModal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSave={(ders, dogru, yanlis, bos, topics) => handleAddResult(ders, dogru, yanlis, bos, topics)}
        courseOptions={courseOptions}
        defaultCourse={selectedCourse}
      />

      {/* Goals Settings Modal */}
      {isGoalsOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Hedefleri Düzenle</h3>
              <button onClick={()=>setIsGoalsOpen(false)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-gray-600">Günlük hedef</label>
                <input type="number" min={1} max={20} value={tmpDaily} onChange={(e)=> setTmpDaily(e.target.value.replace(/\D/g,''))} className="w-full rounded border-gray-300 bg-white text-xs px-2 py-1" />
              </div>
              <div>
                <label className="text-[11px] text-gray-600">Haftalık hedef</label>
                <input type="number" min={1} max={50} value={tmpWeekly} onChange={(e)=> setTmpWeekly(e.target.value.replace(/\D/g,''))} className="w-full rounded border-gray-300 bg-white text-xs px-2 py-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={()=>setIsGoalsOpen(false)} className="px-2 py-1 text-xs rounded border border-gray-300">Vazgeç</button>
              <button onClick={()=>{
                const d = Math.max(1, Math.min(20, parseInt(tmpDaily || '1', 10)));
                const w = Math.max(1, Math.min(50, parseInt(tmpWeekly || '3', 10)));
                setDailyTarget(d);
                setWeeklyTarget(w);
                try { localStorage.setItem('goals_v1', JSON.stringify({ daily: d, weekly: w })); } catch {}
                setIsGoalsOpen(false);
                setToast({ message: 'Hedefler güncellendi.', type: 'success' });
              }} className="px-2 py-1 text-xs rounded bg-emerald-600 text-white">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      <MistakeModal
        isOpen={isMistakeOpen}
        dersAdi={mistakeResult?.dersAdi || ''}
        topicOptions={getCourseTopics(mistakeResult?.dersAdi || '')}
        defaultTopic={(mistakeResult?.topics && mistakeResult.topics[0]) || undefined}
        onClose={() => { setIsMistakeOpen(false); setMistakeResult(null); }}
        onSave={handleSaveMistake}
      />
    </div>
  );
};

export default Dashboard;
