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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
      improvement = ((recentAvg - previousAvg) / previousAvg) * 100;
    }

    return { totalExams, avgNet, bestNet, improvement };
  }, [exams]);

  // Chart data preparation
  const progressChartData = useMemo(() => {
    return filteredAndSortedExams.slice().reverse().map((exam, index) => {
      const examDate = exam.createdAt ? (exam.createdAt.toDate ? exam.createdAt.toDate() : new Date(exam.createdAt)) : null;
      return {
        name: examDate ? examDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) : `D${index + 1}`,
        'Toplam Net': Math.round(calculateTotalNet(exam) * 100) / 100,
      };
    });
  }, [filteredAndSortedExams]);

  // Publication performance data
  const publicationData = useMemo(() => {
    const pubStats: Record<string, { total: number; count: number }> = {};
    
    exams.forEach(exam => {
      const pub = exam.yayin || 'Diğer';
      const net = calculateTotalNet(exam);
      if (!pubStats[pub]) pubStats[pub] = { total: 0, count: 0 };
      pubStats[pub].total += net;
      pubStats[pub].count += 1;
    });

    return Object.entries(pubStats).map(([pub, stats]) => ({
      name: pub,
      average: Math.round((stats.total / stats.count) * 100) / 100,
      maxPossible: 110, // Total possible net score
    }));
  }, [exams]);

  // Heat map data for subject performance across exams
  const heatMapData = useMemo(() => {
    const subjects = ['Türkçe', 'Matematik', 'Fen', 'İnkılap', 'Din', 'İngilizce'];
    const recentExams = filteredAndSortedExams.slice(0, 10); // Last 10 exams
    
    return subjects.map(subject => {
      const subjectKey = subject === 'Türkçe' ? 'turkce' : 
                        subject === 'Matematik' ? 'matematik' :
                        subject === 'Fen' ? 'fen' :
                        subject === 'İnkılap' ? 'inkilap' :
                        subject === 'Din' ? 'din' : 'ingilizce';
      
      const examScores = recentExams.map((exam, index) => {
        const branchData = exam[subjectKey as keyof ExamResult] as any;
        const net = Math.max(0, branchData.dogru - branchData.yanlis / 3);
        const maxPossible = subject === 'Türkçe' || subject === 'Matematik' || subject === 'Fen' ? 20 : 10;
        const percentage = (net / maxPossible) * 100;
        
        return {
          exam: `D${recentExams.length - index}`,
          score: Math.round(percentage),
          net: Math.round(net * 100) / 100,
        };
      });

      return {
        subject,
        scores: examScores,
      };
    });
  }, [filteredAndSortedExams]);

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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">LGS Deneme Performans Takibi</h1>
            <p className="text-gray-600 mt-1">Akademik ilerlemenizi branşlar ve sınavlar boyunca takip edin.</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="#dashboard" className="text-sm text-blue-600 hover:underline">← Panel</a>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <PlusIcon />
              Yeni Deneme
            </button>
          </div>
        </div>

        {exams.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz deneme sınavı yok</h3>
            <p className="text-gray-600 mb-6">İlk deneme sınavı sonucunuzu ekleyerek başlayın</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon />
              İlk Deneme Sınavını Ekle
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Main Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Branş Trendleri */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Branş Trendleri (Son 20)</h3>
                  <p className="text-sm text-gray-600">Branş Performans Trendi</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-600">
                      {stats.improvement >= 0 ? '+' : ''}{stats.improvement.toFixed(0)}%
                    </span>
                    <span className="text-sm text-green-600">
                      {stats.improvement >= 0 ? '+' : ''}{stats.improvement.toFixed(0)}% vs Son 20 Deneme
                    </span>
                  </div>
                </div>
                
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressChartData}>
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Toplam Net" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fill="url(#colorGradient)"
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Yayın Bazlı Ortalama Puan */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Yayın Bazlı Ortalama Puan</h3>
                  <p className="text-sm text-gray-600">Anahtar yayın performansı</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-600">{stats.avgNet.toFixed(0)}</span>
                    <span className="text-sm text-green-600">+2% vs Tüm Denemeler</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {publicationData.slice(0, 5).map((pub, index) => {
                    const percentage = (pub.average / pub.maxPossible) * 100;
                    return (
                      <div key={pub.name} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{pub.name}</span>
                            <span className="text-sm text-gray-600">{pub.average.toFixed(0)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Deneme Sonuçları */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Deneme Sonuçları</h3>
                  <p className="text-sm text-gray-600">Sınav Sonuçları</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'totalNet')}
                    className="rounded-lg border border-gray-300 bg-white text-sm py-2 px-3"
                  >
                    <option value="date">Tarihe Göre</option>
                    <option value="totalNet">Net Puana Göre</option>
                  </select>
                  
                  <select
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value as 'all' | '30' | '7')}
                    className="rounded-lg border border-gray-300 bg-white text-sm py-2 px-3"
                  >
                    <option value="all">Tüm Zamanlar</option>
                    <option value="30">Son 30 Gün</option>
                    <option value="7">Son 7 Gün</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">DENEME ADI</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">TARİH</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">BRANŞ</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">TOPLAM PUAN</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">NET PUAN</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">İŞLEMLER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedExams.map((exam) => {
                      const totalNet = calculateTotalNet(exam);
                      const examDate = exam.createdAt ? (exam.createdAt.toDate ? exam.createdAt.toDate() : new Date(exam.createdAt)) : null;
                      
                      return (
                        <tr key={exam.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium text-gray-900">
                                {exam.ad || 'Deneme Sınavı'}
                              </div>
                              {exam.yayin && (
                                <div className="text-sm text-gray-600">{exam.yayin}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            {examDate ? examDate.toLocaleDateString('tr-TR') : '-'}
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-gray-600">Genel</div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="font-medium text-gray-900">
                              {(totalNet * 4.5).toFixed(2)} {/* Approximate total score */}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="font-semibold text-blue-600">
                              {totalNet.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setEditingExam(exam)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <EditIcon />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(exam.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Isı Haritası */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Isı Haritası (Branş x Son 10)</h3>
                <p className="text-sm text-gray-600">Branş Performans Isı Haritası</p>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Header */}
                  <div className="grid grid-cols-11 gap-1 mb-2">
                    <div className="text-xs font-medium text-gray-600 p-2"></div>
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} className="text-xs font-medium text-gray-600 text-center p-2">
                        D{i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Heat map rows */}
                  {heatMapData.map((subject) => (
                    <div key={subject.subject} className="grid grid-cols-11 gap-1 mb-1">
                      <div className="text-sm font-medium text-gray-900 p-2 flex items-center">
                        {subject.subject}
                      </div>
                      {subject.scores.map((score, index) => {
                        const intensity = Math.min(100, Math.max(0, score.score));
                        const bgColor = intensity >= 80 ? 'bg-blue-600' :
                                       intensity >= 60 ? 'bg-blue-500' :
                                       intensity >= 40 ? 'bg-blue-400' :
                                       intensity >= 20 ? 'bg-blue-300' : 'bg-blue-200';
                        
                        return (
                          <div
                            key={index}
                            className={`${bgColor} rounded p-2 text-center text-white text-xs font-medium transition-all duration-200 hover:scale-105 cursor-pointer`}
                            title={`${subject.subject} - ${score.exam}: ${score.net} net (${intensity}%)`}
                          >
                            {score.net}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Legend */}
                  <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-600">
                    <span>Az Doğru</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 bg-blue-200 rounded"></div>
                      <div className="w-4 h-4 bg-blue-300 rounded"></div>
                      <div className="w-4 h-4 bg-blue-400 rounded"></div>
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <div className="w-4 h-4 bg-blue-600 rounded"></div>
                    </div>
                    <span>Çok Doğru</span>
                  </div>
                </div>
              </div>
            </div>
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