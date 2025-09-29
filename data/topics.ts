// 8. sınıf LGS konu/kazanım listeleri (özet, örnek set)
export const LGS_TOPICS: Record<string, string[]> = {
  'Türkçe': [
    'Paragraf Anlama',
    'Cümlede Anlam',
    'Sözcükte Anlam',
    'Dil Bilgisi',
    'Noktalama',
    'Yazım Kuralları',
    'Söz Sanatları',
  ],
  'Matematik': [
    'Sayılar ve İşlemler',
    'Üslü İfadeler',
    'Köklü İfadeler',
    'Oran Orantı',
    'Eşitsizlikler',
    'Doğrusal Denklemler',
    'Olasılık',
    'Veri Analizi',
    'Geometri-Üçgenler',
    'Geometri-Eşlik Benzerlik',
  ],
  'Fen Bilgisi': [
    'Mevsimler ve İklim',
    'DNA ve Genetik Kod',
    'Basit Makineler',
    'Elektrik Yükleri ve Elektriklenme',
    'Asit Bazlar ve Tuzlar',
    'Madde ve Endüstri',
    'Enerji Dönüşümleri',
  ],
  'Sosyal Bilgiler': [
    'İnkılap Tarihi',
    'Kurtuluş Savaşı',
    'Atatürk İlkeleri',
    'Türk Dış Politikası',
    'Harita Bilgisi',
  ],
  'Din Kültürü': [
    'Kader ve Kaza',
    'Hz. Muhammed’in Hayatı',
    'Kur’an ve Yorumu',
    'İslam ve İbadet',
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
  ],
};

export function getCourseTopics(course: string): string[] {
  return LGS_TOPICS[course] || [];
}
