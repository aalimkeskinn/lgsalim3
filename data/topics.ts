export const LGS_COURSES = [
  'Türkçe',
  'Matematik',
  'Fen Bilgisi',
  'Sosyal Bilgiler',
  'Din Kültürü ve Ahlak Bilgisi',
  'İngilizce'
] as const;

export const LGS_COURSE_INFO: Record<string, { maxQuestions: number; weight: number }> = {
  'Türkçe': { maxQuestions: 20, weight: 5 },
  'Matematik': { maxQuestions: 20, weight: 5 },
  'Fen Bilgisi': { maxQuestions: 20, weight: 5 },
  'Sosyal Bilgiler': { maxQuestions: 10, weight: 5 },
  'Din Kültürü ve Ahlak Bilgisi': { maxQuestions: 10, weight: 5 },
  'İngilizce': { maxQuestions: 10, weight: 5 }
};

export const LGS_TOPICS: Record<string, string[]> = {
  'Türkçe': [
    'Okuma-Anlama',
    'Sözcük-Anlam İlişkisi',
    'Cümle-Anlam İlişkisi',
    'Paragraf-Anlam İlişkisi',
    'Yazım Kuralları',
    'Noktalama İşaretleri',
    'Dil Bilgisi',
    'Söz Sanatları',
    'Anlatım Biçimleri',
    'Metin Türleri'
  ],
  'Matematik': [
    'Çarpanlar ve Katlar',
    'Üslü İfadeler',
    'Kareköklü İfadeler',
    'Veri Analizi',
    'Merkezi Eğilim ve Yayılım Ölçüleri',
    'Olasılık',
    'Cebirsel İfadeler ve Özdeşlikler',
    'Doğrusal Denklemler',
    'Eşitsizlikler',
    'Üçgenler',
    'Dönüşüm Geometrisi',
    'Eşlik ve Benzerlik',
    'Geometrik Cisimler'
  ],
  'Fen Bilgisi': [
    'Mevsimler ve İklim',
    'DNA ve Genetik Kod',
    'Kalıtım',
    'Bağışıklık Sistemi',
    'Basınç',
    'Basit Makineler',
    'Enerji Dönüşümleri',
    'İş-Güç-Enerji',
    'Kimyasal Tepkimeler',
    'Asitler-Bazlar-Tuzlar',
    'Madde ve Endüstri',
    'Elektrik Yükleri',
    'Aydınlanma ve Ses',
    'Yenilenebilir Enerji'
  ],
  'Sosyal Bilgiler': [
    'İletişim ve İnsan İlişkileri',
    'Bilim ve Teknoloji',
    'Ekonomi ve Sosyal Hayat',
    'Küresel Bağlantılar',
    'Ülkeler Arası Köprüler',
    'Yaşayan Demokrasi',
    'Üretim-Dağıtım-Tüketim',
    'Harita Bilgisi',
    'Coğrafi Konum',
    'İklim ve Yerşekilleri'
  ],
  'Din Kültürü ve Ahlak Bilgisi': [
    'Kader ve Kaza',
    'Hz. Muhammed\'in Hayatı',
    'Peygamberimizin Örnekliği',
    'Kur\'an-ı Kerim',
    'İslam ve İbadet',
    'Namaz',
    'Oruç',
    'Zekat ve Sadaka',
    'Ahlak ve Güzel Davranışlar',
    'Dinler ve Evrensel Değerler'
  ],
  'İngilizce': [
    'Friendship',
    'Teen Life',
    'In the Kitchen',
    'On the Phone',
    'The Internet',
    'Adventures',
    'Tourism',
    'Chores',
    'Science',
    'Saving the Planet'
  ],
};

export function getCourseTopics(course: string): string[] {
  return LGS_TOPICS[course] || [];
}
