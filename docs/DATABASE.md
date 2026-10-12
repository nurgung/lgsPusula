# Veri Modeli Taslağı

Bu taslak nihai şema değildir. Gerçek şema migration dosyalarıyla yönetilmeli ve erişim politikaları her tablo için ayrıca tanımlanmalıdır.

## Önerilen tablolar

- `profiles`: kimlik sağlayıcı kullanıcı kimliği, görünen ad, rol/profil durumu; rol ataması kullanıcı tarafından değiştirilemez.
- `family_links`: veli kimliği, öğrenci kimliği, durum, davet zamanı, onay zamanı, iptal zamanı.
- `subjects`: ders kataloğu.
- `topics`: dersle ilişkili konu kataloğu.
- `learning_outcomes`: kazanım kodu, açıklama, ders/konu ilişkisi, kaynak sürümü.
- `study_logs`: öğrenci kimliği, tarih, ders, konu/kazanım opsiyonu, soru sayıları, süre, oluşturma/güncelleme zamanı.
- `study_goals`: öğrenci, dönem, ders veya genel hedef, hedef değeri.
- `exams`: öğrenci, deneme adı, tarih, tür ve net kuralı referansı.
- `exam_subject_results`: deneme, ders, doğru/yanlış/boş, hesaplanan net.
- `exam_mistakes`: deneme sonucu, kazanım, yanlış/boş türü; veri kaynağı ve güven düzeyi.
- `mascot_profiles`: öğrenci, seçilen karakter ve aşama.
- `reward_events`: öğrenci, olay türü, puan ve idempotency anahtarı.
- `notification_preferences`: kanal, sıklık, sessiz saatler ve izinler.
- `import_jobs`: dosya kimliği, durum, satır sayıları, hata özeti ve başlatan kullanıcı.
- `report_jobs`: rapor türü, dönem, talep sahibi, durum ve geçici dosya konumu.
- `audit_events`: gerekli güvenlik olayları; parola, token veya gereksiz kişisel veri içermez.

## Veri modelleme ilkeleri

- Birincil anahtarlar tahmin edilmesi zor olabilir; ancak kimliklerin tahmin edilemez olması yetkilendirme yerine geçmez.
- Yabancı anahtarlar ve uygun bütünlük kısıtları tanımlanmalıdır.
- Tarih/saat alanları için saat dilimi yaklaşımı belgelenmelidir.
- Net değeri gerektiğinde tekrar hesaplanabilir olmalı; kullanılan kural sürümü kaydedilmelidir.
- Kayıt sahibi/öğrenci ilişkisi her sorguda kontrol edilmelidir.
- İlişki iptali ve hesap silme için veri yaşam döngüsü tanımlanmalıdır.
- İçe aktarma ve ödül olayları tekrar çalıştırmaya karşı idempotent tasarlanmalıdır.
- RLS politikaları varsa her tablo için okuma/yazma senaryoları ayrı test edilmelidir.
