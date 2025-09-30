import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, where, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import Header from './Header';
import type { ExamResult } from '../types';
import ExamAddModal from './ExamAddModal';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';
import Spinner from './Spinner';
import PlusIcon from './icons/PlusIcon';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import CalendarIcon from './icons/CalendarIcon';
import ExpandIcon from './icons/ExpandIcon';
import ChartModal from './ChartModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

interface ExamsPageProps {
  user: User;
}

const ExamsPage: React.FC<ExamsPageProps> = ({ user }) => {
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamResult | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'totalNet'>('date');
  const [filterPeriod, setFilterPeriod] = useState<'all' | '30' | '7'>('all');
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [modalChart, setModalChart] = useState<React.ReactNode>(null);

  // Subscribe to user's exams
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'exams'),
      where('kullaniciId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: ExamResult[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        items.push({
          id: d.id,
          kullaniciId: data.kullaniciId,
          createdAt: data.createdAt,
          ad: data.ad,
          yayin: data.yayin,
          turkce: data.turkce,
          matematik: data.matematik,
          fen: data.fen,
          inkilap: data.inkilap,
          din: data.din,
          ingilizce: data.ingilizce,
        });
      });
      // Sort by date desc by default
      items.sort((a, b) => {
        const ta = (a.createdAt && (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime())) || 0;
        const tb = (b.createdAt && (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime())) || 0;
        return tb - ta;
      });
      setExams(items);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleAddExam = async (payload: any) => {
    try {
      await addDoc(collection(db, 'exams'), {
        ...payload,
        kullaniciId: user.uid,
        createdAt: serverTimestamp(),
      });
      setToast({ message: 'Deneme başarıyla eklendi.', type: 'success' });
    } catch (e) {
      console.error('add exam', e);
      setToast({ message: 'Deneme eklenemedi.', type: 'error' });
    }
  };

  const handleUpdateExam = async (payload: any) => {
    if (!editingExam) return;
    try {
      await updateDoc(doc(db, 'exams', editingExam.id), payload);
      setToast({ message: 'Deneme güncellendi.', type: 'success' });
      setEditingExam(null);
    } catch (e) {
      console.error('update exam', e);
      setToast({ message: 'Deneme güncellenemedi.', type: 'error' });
    }
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteDoc(doc(db, 'exams', confirmDeleteId));
      setToast({ message: 'Deneme silindi.', type: 'success' });
    } catch (e) {
      console.error('delete exam', e);
      setToast({ message: 'Deneme silinemedi.', type: 'error' });
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Calculate total net for an exam
  const calculateTotalNet = (exam: ExamResult): number => {
    const branches = [exam.turkce, exam.matematik, exam.fen, exam.inkilap, exam.din, exam.ingilizce];
    return branches.reduce((total, branch) => {
      const net = branch.dogru - branch.yanlis / 3; // LGS'de yanlış cevap 1/3 düşer
      return total + Math.max(0, net);
    }, 0);
  };

  // Filter and sort exams
  const filteredAndSortedExams = useMemo(() => {
    let filtered = [...exams];

    // Filter by period
    if (filterPeriod !== 'all') {
      const days = filterPeriod === '7' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter(exam => {
        if (!exam.createdAt) return false;
        const examDate = exam.createdAt.toDate ? exam.createdAt.toDate() : new Date(exam.createdAt);
        return examDate >= cutoff;
      });
    }

    // Sort
    if (sortBy === 'totalNet') {
      filtered.sort((a, b) => calculateTotalNet(b) - calculateTotalNet(a));
    } else {
      filtered.sort((a, b) => {
        const ta = (a.createdAt && (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime())) || 0;
        const tb = (b.createdAt && (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime())) || 0;
        return tb - ta;
      });
    }

    return filtered;
  }, [exams, sortBy, filterPeriod]);

  // Statistics
  const stats = useMemo(() => {
    if (exams.length === 0) return { totalExams: 0, avgNet: 0, bestNet: 0, improvement: 0 };
    
    const totalExams = exams.length;
    const nets = exams.map(calculateTotalNet);
    const avgNet = nets.reduce((a, b) => a + b, 0) / nets.length;
    const bestNet = Math.max(...nets);
    
    // Calculate improvement (last 3 vs previous 3)
    let improvement = 0;
    if (exams.length >= 6) {
      const recent = nets.slice(0, 3);
      const previous = nets.slice(3, 6);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
      improvement = recentAvg - previousAvg;
    }

    return { totalExams, avgNet, bestNet, improvement };
  }, [exams]);

  // Chart data preparation
  const progressChartData = useMemo(() => {
    return filteredAndSortedExams.slice().reverse().map((exam, index) => {
      const examDate = exam.createdAt ? (exam.createdAt.toDate ? exam.createdAt.toDate() : new Date(exam.createdAt)) : null;
      return {
        name: examDate ? examDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) : `Deneme ${index + 1}`,
        'Toplam Net': calculateTotalNet(exam),
        'Türkçe': Math.max(0, exam.turkce.dogru - exam.turkce.yanlis / 3),
        'Matematik': Math.max(0, exam.matematik.dogru - exam.matematik.yanlis / 3),
        'Fen': Math.max(0, exam.fen.dogru - exam.fen.yanlis / 3),
      };
    });
  }, [filteredAndSortedExams]);

  const branchComparisonData = useMemo(() => {
    if (exams.length === 0) return [];
    
    const branches = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'T.C. İnkılap', 'Din Kültürü', 'Yabancı Dil'];
    return branches.map(branch => {
      const branchKey = branch === 'Türkçe' ? 'turkce' : 
                       branch === 'Matematik' ? 'matematik' :
                       branch === 'Fen Bilimleri' ? 'fen' :
                       branch === 'T.C. İnkılap' ? 'inkilap' :
                       branch === 'Din Kültürü' ? 'din' : 'ingilizce';
      
      const avgNet = exams.reduce((sum, exam) => {
        const branchData = exam[branchKey as keyof ExamResult] as any;
        return sum + Math.max(0, branchData.dogru - branchData.yanlis / 3);
      }, 0) / exams.length;

      const maxPossible = branch === 'Türkçe' || branch === 'Matematik' || branch === 'Fen Bilimleri' ? 20 : 10;
      
      return {
        branch,
        'Ortalama Net': avgNet,
        'Başarı %': (avgNet / maxPossible) * 100,
      };
    });
  }, [exams]);

  const radarChartData = useMemo(() => {
    if (exams.length === 0) return [];
    
    const latest = exams[0];
    if (!latest) return [];

    return [
      {
        subject: 'Türkçe',
        net: Math.max(0, latest.turkce.dogru - latest.turkce.yanlis / 3),
        fullMark: 20,
      },
      {
        subject: 'Matematik',
        net: Math.max(0, latest.matematik.dogru - latest.matematik.yanlis / 3),
        fullMark: 20,
      },
      {
        subject: 'Fen',
        net: Math.max(0, latest.fen.dogru - latest.fen.yanlis / 3),
        fullMark: 20,
      },
      {
        subject: 'İnkılap',
        net: Math.max(0, latest.inkilap.dogru - latest.inkilap.yanlis / 3),
        fullMark: 10,
      },
      {
        subject: 'Din',
        net: Math.max(0, latest.din.dogru - latest.din.yanlis / 3),
        fullMark: 10,
      },
      {
        subject: 'İngilizce',
        net: Math.max(0, latest.ingilizce.dogru - latest.ingilizce.yanlis / 3),
        fullMark: 10,
      },
    ];
  }, [exams]);

  const openChartModal = (chart: React.ReactNode) => {
    setModalChart(chart);
    setIsChartModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} onLogout={() => signOut(auth)} />
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={() => signOut(auth)} />
      
      <main className="container mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-3">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">LGS Deneme Sınavları</h1>
            <p className="text-xs text-gray-500">Deneme sonuçlarınızı takip edin</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="#dashboard" className="text-xs text-emerald-700 hover:underline">← Panel</a>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-2.5 rounded-md text-xs"
            >
              <PlusIcon />
              Yeni Deneme
            </button>
          </div>
        </div>

        {/* Compact Statistics */}
        {exams.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm">
              <p className="text-[10px] text-gray-500 uppercase">Toplam</p>
              <p className="text-lg font-bold text-gray-900">{stats.totalExams}</p>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm">
              <p className="text-[10px] text-gray-500 uppercase">Ortalama</p>
              <p className="text-lg font-bold text-emerald-600">{stats.avgNet.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm">
              <p className="text-[10px] text-gray-500 uppercase">En Yüksek</p>
              <p className="text-lg font-bold text-blue-600">{stats.bestNet.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm">
              <p className="text-[10px] text-gray-500 uppercase">Gelişim</p>
              <p className={`text-lg font-bold ${stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.improvement >= 0 ? '+' : ''}{stats.improvement.toFixed(1)}
              </p>
            </div>
          </div>
        )}

        {/* Charts Section */}
        {exams.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
            {/* Progress Chart */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-900">Net Gelişimi</h3>
                <button
                  onClick={() => openChartModal(
                    <div className="p-4">
                      <h3 className="text-lg font-semibold mb-4">Net Gelişimi</h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={progressChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="Toplam Net" stroke="#10b981" strokeWidth={2} />
                          <Line type="monotone" dataKey="Türkçe" stroke="#3b82f6" strokeWidth={1} />
                          <Line type="monotone" dataKey="Matematik" stroke="#f59e0b" strokeWidth={1} />
                          <Line type="monotone" dataKey="Fen" stroke="#8b5cf6" strokeWidth={1} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ExpandIcon className="h-3 w-3" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={progressChartData}>
                  <XAxis dataKey="name" fontSize={8} />
                  <YAxis fontSize={8} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Toplam Net" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Branch Comparison */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-900">Branş Karşılaştırma</h3>
                <button
                  onClick={() => openChartModal(
                    <div className="p-4">
                      <h3 className="text-lg font-semibold mb-4">Branş Karşılaştırma</h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={branchComparisonData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="branch" fontSize={12} angle={-45} textAnchor="end" height={80} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Ortalama Net" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ExpandIcon className="h-3 w-3" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={branchComparisonData}>
                  <XAxis dataKey="branch" fontSize={8} angle={-45} textAnchor="end" height={40} />
                  <YAxis fontSize={8} />
                  <Tooltip />
                  <Bar dataKey="Ortalama Net" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar Chart */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-900">Son Deneme Analizi</h3>
                <button
                  onClick={() => openChartModal(
                    <div className="p-4">
                      <h3 className="text-lg font-semibold mb-4">Son Deneme Analizi</h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <RadarChart data={radarChartData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" fontSize={12} />
                          <PolarRadiusAxis fontSize={10} />
                          <Radar name="Net" dataKey="net" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ExpandIcon className="h-3 w-3" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <RadarChart data={radarChartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" fontSize={8} />
                  <Radar name="Net" dataKey="net" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Filters */}
        {exams.length > 0 && (
          <div className="bg-white rounded-lg p-2.5 border border-gray-200 shadow-sm mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'totalNet')}
                  className="rounded border-gray-300 bg-white text-xs py-1 px-2"
                >
                  <option value="date">Tarihe Göre</option>
                  <option value="totalNet">Net Puana Göre</option>
                </select>
                
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value as 'all' | '30' | '7')}
                  className="rounded border-gray-300 bg-white text-xs py-1 px-2"
                >
                  <option value="all">Tüm Zamanlar</option>
                  <option value="30">Son 30 Gün</option>
                  <option value="7">Son 7 Gün</option>
                </select>
              </div>
              
              <span className="text-xs text-gray-500">
                {filteredAndSortedExams.length} deneme
              </span>
            </div>
          </div>
        )}

        {/* Compact Exams List */}
        {filteredAndSortedExams.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz deneme sınavı yok</h3>
            <p className="text-gray-600 mb-4">İlk deneme sınavı sonucunuzu ekleyerek başlayın</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
            >
              <PlusIcon />
              İlk Deneme Sınavını Ekle
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAndSortedExams.map((exam) => {
              const totalNet = calculateTotalNet(exam);
              const examDate = exam.createdAt ? (exam.createdAt.toDate ? exam.createdAt.toDate() : new Date(exam.createdAt)) : null;
              
              return (
                <div key={exam.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-3">
                  {/* Compact Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {exam.ad || 'Deneme Sınavı'}
                        </h3>
                        {exam.yayin && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {exam.yayin}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        {examDate && (
                          <span>{examDate.toLocaleDateString('tr-TR')}</span>
                        )}
                        <span className="font-semibold text-emerald-600">
                          Toplam Net: {totalNet.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingExam(exam)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(exam.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {/* Compact Branch Results */}
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                    {[
                      { name: 'TÜR', data: exam.turkce, color: 'blue' },
                      { name: 'MAT', data: exam.matematik, color: 'green' },
                      { name: 'FEN', data: exam.fen, color: 'purple' },
                      { name: 'İNK', data: exam.inkilap, color: 'red' },
                      { name: 'DİN', data: exam.din, color: 'yellow' },
                      { name: 'İNG', data: exam.ingilizce, color: 'indigo' },
                    ].map(({ name, data, color }) => {
                      const net = Math.max(0, data.dogru - data.yanlis / 3);
                      const maxQuestions = name === 'TÜR' || name === 'MAT' || name === 'FEN' ? 20 : 10;
                      const successRate = maxQuestions > 0 ? (net / maxQuestions) * 100 : 0;
                      
                      return (
                        <div key={name} className={`bg-${color}-50 rounded p-2 border border-${color}-100 text-center`}>
                          <div className={`text-xs font-semibold text-${color}-900 mb-1`}>{name}</div>
                          <div className={`text-lg font-bold text-${color}-700`}>
                            {net.toFixed(1)}
                          </div>
                          <div className="text-[10px] text-gray-600">
                            {data.dogru}-{data.yanlis}-{data.bos}
                          </div>
                          <div className={`text-[10px] text-${color}-600 font-medium`}>
                            %{successRate.toFixed(0)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modals */}
      <ExamAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddExam}
        title="Yeni Deneme Ekle"
      />

      {editingExam && (
        <ExamAddModal
          isOpen={!!editingExam}
          onClose={() => setEditingExam(null)}
          onSave={handleUpdateExam}
          title="Deneme Düzenle"
          initialData={editingExam}
        />
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Deneme Sil"
        message="Bu deneme sınavını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ChartModal isOpen={isChartModalOpen} onClose={() => setIsChartModalOpen(false)}>
        {modalChart}
      </ChartModal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ExamsPage;