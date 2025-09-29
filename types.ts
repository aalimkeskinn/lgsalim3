// FIX: Defined shared application types to resolve module errors.
export type AuthMode = 'login' | 'register' | 'reset';

export interface TestResult {
  id: string;
  dersAdi: string;
  dogruSayisi: number;
  yanlisSayisi: number;
  bosSayisi: number;
  kullaniciId: string;
  kullaniciEmail: string;
  createdAt: any;
  topics?: string[]; // konu/kazanım etiketleri (opsiyonel, maksimum ~10 önerilir)
}

export type MistakeStatus = 'open' | 'reviewed' | 'archived';

// Hata Defteri temel modeli
export interface MistakeEntry {
  id: string;
  kullaniciId: string; // owner
  testResultId?: string; // referans için opsiyonel bağ
  dersAdi: string;
  topics: string[]; // konu/kazanım etiketleri
  note?: string; // kısa açıklama/not (max 500 önerilir)
  imageUrl?: string; // soru görseli linki (opsiyonel)
  createdAt: any;
  nextReviewAt?: any; // spaced repetition için
  status: MistakeStatus;
}

// LGS Deneme/Exam sonucu modeli
export interface ExamBranch {
  dogru: number; // 0..50
  yanlis: number; // 0..50
  bos: number; // 0..50
}

export interface ExamResult {
  id: string;
  kullaniciId: string;
  createdAt: any;
  ad?: string; // deneme adı
  yayin?: string; // yayın/kurum adı
  turkce: ExamBranch;
  matematik: ExamBranch;
  fen: ExamBranch;
  inkilap: ExamBranch; // T.C. İnkılap Tarihi ve Atatürkçülük
  din: ExamBranch; // Din Kültürü ve Ahlak Bilgisi
  ingilizce: ExamBranch;
}
