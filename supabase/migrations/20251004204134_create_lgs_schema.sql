/*
  # LGS Test Takip Platformu - Veritabanı Şeması

  ## Yeni Tablolar
  
  ### `users_profile`
  Kullanıcı profil bilgileri ve hedefler
  - `id` (uuid, primary key, references auth.users)
  - `display_name` (text) - Kullanıcı adı
  - `target_school` (text) - Hedef lise
  - `target_score` (numeric) - Hedef LGS puanı
  - `daily_goal` (integer) - Günlük test hedefi (varsayılan: 1)
  - `weekly_goal` (integer) - Haftalık test hedefi (varsayılan: 3)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `test_results`
  Bireysel ders bazlı test sonuçları
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `course_name` (text) - Ders adı (Türkçe, Matematik, Fen Bilgisi, Sosyal Bilgiler, Din Kültürü, İngilizce)
  - `correct_count` (integer) - Doğru sayısı
  - `wrong_count` (integer) - Yanlış sayısı
  - `empty_count` (integer) - Boş sayısı
  - `topics` (text[]) - Konu etiketleri
  - `created_at` (timestamptz)

  ### `exam_results`
  Tam deneme sınavı sonuçları (90 soruluk LGS denemeleri)
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `exam_name` (text) - Deneme adı
  - `publisher` (text) - Yayın/kurum adı
  - `exam_date` (date) - Deneme tarihi
  - `turkce_correct` (integer)
  - `turkce_wrong` (integer)
  - `turkce_empty` (integer)
  - `matematik_correct` (integer)
  - `matematik_wrong` (integer)
  - `matematik_empty` (integer)
  - `fen_correct` (integer)
  - `fen_wrong` (integer)
  - `fen_empty` (integer)
  - `sosyal_correct` (integer)
  - `sosyal_wrong` (integer)
  - `sosyal_empty` (integer)
  - `din_correct` (integer)
  - `din_wrong` (integer)
  - `din_empty` (integer)
  - `ingilizce_correct` (integer)
  - `ingilizce_wrong` (integer)
  - `ingilizce_empty` (integer)
  - `created_at` (timestamptz)

  ### `mistakes`
  Hata defteri - yanlış yapılan sorular
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `test_result_id` (uuid, nullable, references test_results)
  - `course_name` (text) - Ders adı
  - `topics` (text[]) - Konu etiketleri
  - `note` (text) - Açıklama/not
  - `image_url` (text) - Soru görseli URL
  - `status` (text) - open, reviewed, archived
  - `next_review_at` (timestamptz) - Tekrar tarihi
  - `created_at` (timestamptz)

  ## Güvenlik
  - Tüm tablolarda RLS etkin
  - Kullanıcılar sadece kendi verilerine erişebilir
  - Öğretmen/admin rolü için ek politikalar eklenebilir
*/

-- users_profile tablosu
CREATE TABLE IF NOT EXISTS users_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  target_school text,
  target_score numeric,
  daily_goal integer DEFAULT 1,
  weekly_goal integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users_profile FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- test_results tablosu
CREATE TABLE IF NOT EXISTS test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name text NOT NULL,
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  empty_count integer NOT NULL DEFAULT 0,
  topics text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own test results"
  ON test_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results"
  ON test_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test results"
  ON test_results FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own test results"
  ON test_results FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_course ON test_results(course_name);

-- exam_results tablosu
CREATE TABLE IF NOT EXISTS exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_name text,
  publisher text,
  exam_date date DEFAULT CURRENT_DATE,
  turkce_correct integer DEFAULT 0,
  turkce_wrong integer DEFAULT 0,
  turkce_empty integer DEFAULT 0,
  matematik_correct integer DEFAULT 0,
  matematik_wrong integer DEFAULT 0,
  matematik_empty integer DEFAULT 0,
  fen_correct integer DEFAULT 0,
  fen_wrong integer DEFAULT 0,
  fen_empty integer DEFAULT 0,
  sosyal_correct integer DEFAULT 0,
  sosyal_wrong integer DEFAULT 0,
  sosyal_empty integer DEFAULT 0,
  din_correct integer DEFAULT 0,
  din_wrong integer DEFAULT 0,
  din_empty integer DEFAULT 0,
  ingilizce_correct integer DEFAULT 0,
  ingilizce_wrong integer DEFAULT 0,
  ingilizce_empty integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exam results"
  ON exam_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exam results"
  ON exam_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exam results"
  ON exam_results FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exam results"
  ON exam_results FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_date ON exam_results(exam_date DESC);

-- mistakes tablosu
CREATE TABLE IF NOT EXISTS mistakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_result_id uuid REFERENCES test_results(id) ON DELETE SET NULL,
  course_name text NOT NULL,
  topics text[] DEFAULT '{}',
  note text,
  image_url text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'archived')),
  next_review_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mistakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mistakes"
  ON mistakes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mistakes"
  ON mistakes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mistakes"
  ON mistakes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mistakes"
  ON mistakes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mistakes_user_id ON mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_status ON mistakes(status);
CREATE INDEX IF NOT EXISTS idx_mistakes_course ON mistakes(course_name);
