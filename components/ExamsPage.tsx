import React, { useState, useMemo } from 'react';
import { User } from '../types';
import ChartBarIcon from './icons/ChartBarIcon';
import CalendarIcon from './icons/CalendarIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import FilterIcon from './icons/FilterIcon';

interface ExamsPageProps {
  user: User;
}

export default function ExamsPage({ user }: ExamsPageProps) {
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | 'all'>('all');

  // Mock exam data for demonstration
  const exams = useMemo(() => [
    {
      id: '1',
      date: '2024-01-15',
      totalQuestions: 100,
      correctAnswers: 75,
      wrongAnswers: 20,
      emptyAnswers: 5,
      subjects: {
        'Türkçe': { correct: 15, wrong: 3, empty: 2 },
        'Matematik': { correct: 18, wrong: 2, empty: 0 },
        'Fen': { correct: 16, wrong: 4, empty: 0 },
        'Sosyal': { correct: 14, wrong: 5, empty: 1 },
        'İngilizce': { correct: 12, wrong: 6, empty: 2 }
      }
    },
    {
      id: '2',
      date: '2024-01-10',
      totalQuestions: 100,
      correctAnswers: 68,
      wrongAnswers: 25,
      emptyAnswers: 7,
      subjects: {
        'Türkçe': { correct: 13, wrong: 5, empty: 2 },
        'Matematik': { correct: 16, wrong: 3, empty: 1 },
        'Fen': { correct: 14, wrong: 5, empty: 1 },
        'Sosyal': { correct: 12, wrong: 6, empty: 2 },
        'İngilizce': { correct: 13, wrong: 6, empty: 1 }
      }
    }
  ], []);

  const stats = useMemo(() => {
    const totalExams = exams.length;
    const avgScore = exams.reduce((sum, exam) => sum + exam.correctAnswers, 0) / totalExams;
    const bestScore = Math.max(...exams.map(exam => exam.correctAnswers));
    const improvement = exams.length > 1 ? exams[0].correctAnswers - exams[exams.length - 1].correctAnswers : 0;

    return {
      totalExams,
      avgScore: Math.round(avgScore),
      bestScore,
      improvement
    };
  }, [exams]);

  const filteredExams = useMemo(() => {
    let filtered = [...exams];
    
    // Apply time filter
    if (timeFilter !== 'all') {
      const days = timeFilter === '7d' ? 7 : 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter(exam => new Date(exam.date) >= cutoffDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return b.correctAnswers - a.correctAnswers;
      }
    });

    return filtered;
  }, [exams, sortBy, timeFilter]);

  const calculateNet = (correct: number, wrong: number) => {
    return Math.max(0, correct - (wrong / 3));
  };

  const calculateSuccessRate = (correct: number, total: number) => {
    return Math.round((correct / total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="w-7 h-7 text-blue-600" />
            Deneme Sınavları
          </h1>
          <p className="text-gray-600 mt-1">Sınav sonuçlarınızı analiz edin ve gelişiminizi takip edin</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Deneme</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalExams}</p>
            </div>
            <BookOpenIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ortalama Net</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgScore}</p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Yüksek Net</p>
              <p className="text-2xl font-bold text-gray-900">{stats.bestScore}</p>
            </div>
            <CalendarIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Gelişim</p>
              <p className={`text-2xl font-bold ${stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.improvement >= 0 ? '+' : ''}{stats.improvement}
              </p>
            </div>
            <FilterIcon className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sıralama:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'score')}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Tarihe Göre</option>
              <option value="score">Net Puana Göre</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Zaman:</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as '7d' | '30d' | 'all')}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Son 7 Gün</option>
              <option value="30d">Son 30 Gün</option>
              <option value="all">Tümü</option>
            </select>
          </div>

          <div className="text-sm text-gray-600 sm:ml-auto">
            {filteredExams.length} sonuç gösteriliyor
          </div>
        </div>
      </div>

      {/* Exam Results */}
      <div className="space-y-4">
        {filteredExams.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
            <BookOpenIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz deneme sınavı yok</h3>
            <p className="text-gray-600 mb-4">İlk deneme sınavınızı ekleyerek başlayın</p>
          </div>
        ) : (
          filteredExams.map((exam) => (
            <div key={exam.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {new Date(exam.date).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Toplam Net: <span className="font-semibold text-gray-900">
                        {calculateNet(exam.correctAnswers, exam.wrongAnswers).toFixed(1)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Başarı: <span className="font-semibold text-green-600">
                        %{calculateSuccessRate(exam.correctAnswers, exam.totalQuestions)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {Object.entries(exam.subjects).map(([subject, scores]) => {
                      const net = calculateNet(scores.correct, scores.wrong);
                      const total = scores.correct + scores.wrong + scores.empty;
                      
                      return (
                        <div key={subject} className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-xs font-medium text-gray-700 mb-1">{subject}</div>
                          <div className="text-sm">
                            <span className="font-semibold text-gray-900">{net.toFixed(1)}</span>
                            <span className="text-gray-500"> net</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {scores.correct}D {scores.wrong}Y {scores.empty}B
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}