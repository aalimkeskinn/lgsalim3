export type AuthMode = 'login' | 'register' | 'reset';

export interface TestResult {
  id: string;
  user_id: string;
  course_name: string;
  correct_count: number;
  wrong_count: number;
  empty_count: number;
  topics: string[];
  created_at: string;
}

export type MistakeStatus = 'open' | 'reviewed' | 'archived';

export interface MistakeEntry {
  id: string;
  user_id: string;
  test_result_id?: string;
  course_name: string;
  topics: string[];
  note?: string;
  image_url?: string;
  status: MistakeStatus;
  next_review_at?: string;
  created_at: string;
}

export interface ExamResult {
  id: string;
  user_id: string;
  exam_name?: string;
  publisher?: string;
  exam_date: string;
  turkce_correct: number;
  turkce_wrong: number;
  turkce_empty: number;
  matematik_correct: number;
  matematik_wrong: number;
  matematik_empty: number;
  fen_correct: number;
  fen_wrong: number;
  fen_empty: number;
  sosyal_correct: number;
  sosyal_wrong: number;
  sosyal_empty: number;
  din_correct: number;
  din_wrong: number;
  din_empty: number;
  ingilizce_correct: number;
  ingilizce_wrong: number;
  ingilizce_empty: number;
  created_at: string;
}

export interface UserProfile {
  id: string;
  display_name?: string;
  target_school?: string;
  target_score?: number;
  daily_goal: number;
  weekly_goal: number;
  created_at: string;
  updated_at: string;
}

export type User = {
  id: string;
  email?: string;
  emailVerified?: boolean;
}
