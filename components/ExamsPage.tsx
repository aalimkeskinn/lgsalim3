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
      
      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white shadow-lg">
                  <ChartBarIcon />
                </div>
                LGS Deneme Sınavları
              </h1>
              <p className="mt-2 text-gray-600">Deneme sınavı sonuçlarınızı takip edin ve gelişiminizi analiz edin</p>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href="#dashboard" 
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Ana Panel
              </a>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <PlusIcon />
                Yeni Deneme Ekle
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {exams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Deneme</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalExams}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <BookOpenIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ortalama Net</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.avgNet.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En Yüksek Net</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.bestNet.toFixed(1)}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gelişim</p>
                  <p className={`text-3xl font-bold mt-1 ${stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.improvement >= 0 ? '+' : ''}{stats.improvement.toFixed(1)}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stats.improvement >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <svg className={`h-6 w-6 ${stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stats.improvement >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Controls */}
        {exams.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Sıralama:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'totalNet')}
                    className="rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="date">Tarihe Göre</option>
                    <option value="totalNet">Net Puana Göre</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Dönem:</label>
                  <select
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value as 'all' | '30' | '7')}
                    className="rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">Tüm Zamanlar</option>
                    <option value="30">Son 30 Gün</option>
                    <option value="7">Son 7 Gün</option>
                  </select>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                {filteredAndSortedExams.length} deneme gösteriliyor
              </div>
            </div>
          </div>
        )}

        {/* Exams List */}
        {filteredAndSortedExams.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-gray-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <ChartBarIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz deneme sınavı yok</h3>
              <p className="text-gray-600 mb-6">
                {exams.length === 0 
                  ? "İlk deneme sınavı sonucunuzu ekleyerek başlayın"
                  : "Seçilen filtrelere uygun deneme bulunamadı"
                }
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                <PlusIcon />
                İlk Deneme Sınavını Ekle
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedExams.map((exam) => {
              const totalNet = calculateTotalNet(exam);
              const examDate = exam.createdAt ? (exam.createdAt.toDate ? exam.createdAt.toDate() : new Date(exam.createdAt)) : null;
              
              return (
                <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {exam.ad || 'Deneme Sınavı'}
                          </h3>
                          {exam.yayin && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              {exam.yayin}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {examDate && (
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              {examDate.toLocaleDateString('tr-TR', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <ChartBarIcon className="h-4 w-4" />
                            Toplam Net: <span className="font-semibold text-gray-900">{totalNet.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingExam(exam)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(exam.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    {/* Branch Results Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {[
                        { name: 'Türkçe', data: exam.turkce, color: 'blue' },
                        { name: 'Matematik', data: exam.matematik, color: 'green' },
                        { name: 'Fen Bilimleri', data: exam.fen, color: 'purple' },
                        { name: 'T.C. İnkılap', data: exam.inkilap, color: 'red' },
                        { name: 'Din Kültürü', data: exam.din, color: 'yellow' },
                        { name: 'Yabancı Dil', data: exam.ingilizce, color: 'indigo' },
                      ].map(({ name, data, color }) => {
                        const net = Math.max(0, data.dogru - data.yanlis / 3);
                        const total = data.dogru + data.yanlis + data.bos;
                        const maxQuestions = name === 'Türkçe' || name === 'Matematik' || name === 'Fen Bilimleri' ? 20 : 10;
                        const successRate = maxQuestions > 0 ? (net / maxQuestions) * 100 : 0;
                        
                        return (
                          <div key={name} className={`bg-${color}-50 rounded-lg p-4 border border-${color}-100`}>
                            <div className="text-center">
                              <h4 className={`text-sm font-semibold text-${color}-900 mb-2`}>{name}</h4>
                              <div className={`text-2xl font-bold text-${color}-700 mb-1`}>
                                {net.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div>D: {data.dogru} Y: {data.yanlis} B: {data.bos}</div>
                                <div className={`text-${color}-600 font-medium`}>
                                  %{successRate.toFixed(0)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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