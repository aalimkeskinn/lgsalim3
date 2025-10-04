import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import type { User, TestResult, ExamResult } from '../types';
import { calculateNet, getColorByPerformance, getBgColorByPerformance } from '../utils/lgsCalculations';
import { LGS_COURSES, getCourseTopics } from '../data/topics';
import Header from './Header';
import Spinner from './Spinner';
import Toast from './Toast';
import BookOpenIcon from './icons/BookOpenIcon';
import PlusIcon from './icons/PlusIcon';

interface DashboardSupabaseProps {
  user: User;
}

const DashboardSupabase: React.FC<DashboardSupabaseProps> = ({ user }) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAddingTest, setIsAddingTest] = useState(false);

  const [newTest, setNewTest] = useState({
    course: LGS_COURSES[0],
    correct: 0,
    wrong: 0,
    empty: 0,
  });

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    try {
      const { data: tests, error: testsError } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;

      const { data: exams, error: examsError } = await supabase
        .from('exam_results')
        .select('*')
        .eq('user_id', user.id)
        .order('exam_date', { ascending: false });

      if (examsError) throw examsError;

      setTestResults(tests || []);
      setExamResults(exams || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setToast({ message: 'Veriler yüklenirken hata oluştu', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setToast({ message: 'Başarıyla çıkış yapıldı', type: 'success' });
    } catch (error) {
      console.error('Error signing out:', error);
      setToast({ message: 'Çıkış yapılırken hata oluştu', type: 'error' });
    }
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('test_results').insert({
        user_id: user.id,
        course_name: newTest.course,
        correct_count: newTest.correct,
        wrong_count: newTest.wrong,
        empty_count: newTest.empty,
        topics: [],
      });

      if (error) throw error;

      setToast({ message: 'Test başarıyla eklendi', type: 'success' });
      setIsAddingTest(false);
      setNewTest({ course: LGS_COURSES[0], correct: 0, wrong: 0, empty: 0 });
      loadData();
    } catch (error: any) {
      console.error('Error adding test:', error);
      setToast({ message: 'Test eklenirken hata oluştu', type: 'error' });
    }
  };

  const stats = useMemo(() => {
    const totalTests = testResults.length;
    const totalCorrect = testResults.reduce((sum, r) => sum + r.correct_count, 0);
    const totalWrong = testResults.reduce((sum, r) => sum + r.wrong_count, 0);
    const totalEmpty = testResults.reduce((sum, r) => sum + r.empty_count, 0);
    const totalQuestions = totalCorrect + totalWrong + totalEmpty;
    const totalNet = testResults.reduce((sum, r) => sum + calculateNet(r.correct_count, r.wrong_count), 0);
    const avgNet = totalTests > 0 ? (totalNet / totalTests).toFixed(1) : '0';
    const successRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return { totalTests, totalQuestions, avgNet, successRate, totalNet: totalNet.toFixed(1) };
  }, [testResults]);

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

      <main className="container mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">LGS Test Takip Platformu</h1>
            <p className="text-gray-600 text-sm">Detaylı performans analizi ve kişiselleştirilmiş öneriler</p>
          </div>
          <button
            onClick={() => setIsAddingTest(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-lg"
          >
            <PlusIcon />
            <span className="text-sm">Hızlı Ekle</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Toplam Test</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTests}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Ortalama Net</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avgNet}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Toplam Soru</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Başarı Oranı</p>
            <p className={`text-2xl font-bold ${getColorByPerformance(stats.successRate)}`}>
              %{stats.successRate}
            </p>
          </div>
        </div>

        {testResults.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Test Sonuçlarım</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ders</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Doğru</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Yanlış</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Boş</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Net</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {testResults.map((test) => {
                    const net = calculateNet(test.correct_count, test.wrong_count);
                    return (
                      <tr key={test.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{test.course_name}</td>
                        <td className="px-4 py-3 text-sm text-center text-emerald-600">{test.correct_count}</td>
                        <td className="px-4 py-3 text-sm text-center text-rose-600">{test.wrong_count}</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">{test.empty_count}</td>
                        <td className="px-4 py-3 text-sm text-center font-semibold text-blue-600">{net.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(test.created_at).toLocaleDateString('tr-TR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {testResults.length === 0 && !isAddingTest && (
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 shadow-sm p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <BookOpenIcon className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Öğrenme Yolculuğunuz Başlasın!</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              İlk test sonucunuzu ekleyerek detaylı analiz ve kişiselleştirilmiş önerilerden yararlanmaya başlayın.
            </p>
            <button
              onClick={() => setIsAddingTest(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-lg"
            >
              <PlusIcon />
              İlk Test Sonucunu Ekle
            </button>
          </div>
        )}

        {isAddingTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Test Ekle</h3>
              <form onSubmit={handleAddTest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ders</label>
                  <select
                    value={newTest.course}
                    onChange={(e) => setNewTest({ ...newTest, course: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {LGS_COURSES.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doğru</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={newTest.correct}
                      onChange={(e) => setNewTest({ ...newTest, correct: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yanlış</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={newTest.wrong}
                      onChange={(e) => setNewTest({ ...newTest, wrong: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Boş</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={newTest.empty}
                      onChange={(e) => setNewTest({ ...newTest, empty: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsAddingTest(false)}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default DashboardSupabase;
