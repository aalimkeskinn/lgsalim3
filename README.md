# LGS Test Takip Platformu

Türkiye'deki 8. sınıf öğrencileri için Liselere Geçiş Sınavı (LGS) hazırlık sürecinde test sonuçlarını takip eden, detaylı analizler sunan ve AI destekli öneriler sağlayan modern bir web platformu.

## 🎯 Özellikler

### ✅ Tamamlanan Geliştirmeler

1. **Supabase Entegrasyonu**
   - Firebase'den Supabase'e tam geçiş
   - Modern PostgreSQL veritabanı
   - Row Level Security (RLS) ile güvenli veri erişimi
   - Gerçek zamanlı senkronizasyon

2. **LGS'ye Özel Yapılandırma**
   - 6 ana branş: Türkçe, Matematik, Fen Bilgisi, Sosyal Bilgiler, Din Kültürü ve Ahlak Bilgisi, İngilizce
   - Her branş için doğru soru sayıları (Türkçe/Mat/Fen: 20, Sosyal/Din/İngilizce: 10)
   - Toplam 90 soruluk LGS formatı
   - Branş bazlı konu/kazanım takibi (100+ konu)

3. **Doğru Net Hesaplama**
   - LGS'ye özel formül: Net = Doğru - (Yanlış/3)
   - Branş ağırlıkları ve puan hesaplama
   - Başarı oranı analizi

4. **Veritabanı Şeması**
   - `test_results`: Bireysel ders bazlı test sonuçları
   - `exam_results`: Tam deneme sınavları (90 soruluk)
   - `mistakes`: Hata defteri ve tekrar sistemi
   - `users_profile`: Kullanıcı profili ve hedefler

5. **Modern Arayüz**
   - Responsive tasarım (mobil, tablet, desktop)
   - Gradient renkler ve modern UI/UX
   - Hızlı test ekleme modal'ı
   - Gerçek zamanlı istatistikler

## 🚀 Kurulum

```bash
npm install
npm run dev
```

## 📊 Veritabanı Yapısı

### Test Results (test_results)
- Bireysel ders testleri
- Konu etiketleme
- Doğru/Yanlış/Boş takibi

### Exam Results (exam_results)
- Tam deneme sınavları
- 6 branşın detaylı sonuçları
- Yayın/kurum bilgisi
- Tarihsel karşılaştırma

### Mistakes (mistakes)
- Yanlış soru defteri
- Konu bazlı gruplama
- Tekrar planlama (spaced repetition)
- Görsel ekleme desteği

### User Profile (users_profile)
- Hedef lise
- Hedef puan
- Günlük/haftalık hedefler
- Profil bilgileri

## 🔐 Güvenlik

- Email/password authentication
- Row Level Security (RLS)
- Her kullanıcı sadece kendi verilerine erişebilir
- ide.k12.tr domain kontrolü (okul email sistemi)

## 📈 Gelecek Geliştirmeler

1. **Gelişmiş Analitik**
   - Branş bazlı zayıf konu tespiti
   - Zamana bağlı gelişim grafikleri
   - Yayın karşılaştırması
   - Sınıf ortalaması ile karşılaştırma

2. **AI Destekli Öneriler**
   - Kişiselleştirilmiş çalışma planı
   - Zayıf konular için hedef belirleme
   - Performans tahminleri
   - Deneme sınavı önerileri

3. **Sosyal Özellikler**
   - Sınıf/okul bazlı liderlik tablosu
   - Grup çalışma odaları
   - Soru paylaşımı
   - Motivasyon rozet sistemi

4. **İleri Seviye**
   - PDF rapor oluşturma
   - Excel export
   - Veli paneli
   - Öğretmen dashboard'u

## 🛠️ Teknoloji Stack

- **Frontend**: React 19, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Charts**: Recharts
- **Build**: Vite
- **Deployment**: Netlify/Vercel ready

## 📝 Notlar

- Proje şu anda Supabase kullanmaktadır
- Firebase versiyonu `App.tsx` içinde mevcuttur (eski sistem)
- Supabase versiyonu `AppSupabase.tsx` içinde aktiftir
- Net hesaplama formülü LGS standardına uygun düzeltilmiştir (yanlış/3)

## 👨‍💻 Geliştirici Notları

### Supabase Migration
- Firebase'den Supabase'e geçiş tamamlandı
- Tüm authentication işlemleri Supabase Auth kullanıyor
- Firestore yerine PostgreSQL tabloları kullanılıyor
- Real-time subscriptions için hazır

### LGS Branşları
- Türkçe: 20 soru
- Matematik: 20 soru
- Fen Bilgisi: 20 soru
- Sosyal Bilgiler: 10 soru
- Din Kültürü ve Ahlak Bilgisi: 10 soru
- İngilizce: 10 soru
- **TOPLAM: 90 soru**

### Net Hesaplama
```typescript
Net = Doğru - (Yanlış / 3)
```

LGS'de her yanlış cevap, doğru cevabın 1/3'ü kadar puan düşürür.
