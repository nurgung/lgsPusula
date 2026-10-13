# Veri Modeli Taslağı

Bu taslak nihai şema değildir. Gerçek şema migration dosyalarıyla yönetilmeli ve erişim politikaları her tablo için ayrıca tanımlanmalıdır.

## Uygulanan şema (Faz 3)

Migration: `supabase/migrations/20261012120000_auth_foundation.sql`. Yerel yapılandırmada `auto_expose_new_tables = false` olduğundan hiçbir tablo açık `grant` verilmeden Data API'ye açılmaz. Bulut projelerinde de açıklar aynı migration'daki `revoke` ifadeleriyle kapatılır.

| Tablo / fonksiyon | Alanlar | Erişim (`authenticated`) | Erişim (`service_role`) |
|---|---|---|---|
| `profiles` | `id` (→ `auth.users`, silinince silinir), `username` (benzersiz, `^[a-z0-9_]{3,32}$`), `display_name` (1–50), `roles` (`app_role[]`), `must_change_password`, `created_at` | Yalnızca kendi satırını **okur** (RLS). Ekleme, güncelleme, silme yetkisi yok; rol ve geçici parola bayrağı kullanıcı tarafından değiştirilemez. | Okur/yazar (sunucu ve kurulum betiği) |
| `audit_events` | `occurred_at`, `event_type`, `actor_id` (→ `auth.users`, silinince `null`), `outcome` (`success`/`failure`/`blocked`), `metadata` (en fazla 2 KB nesne) | Erişim yok | Ekler ve okur; güncelleme/silme yetkisi yok |
| `auth_rate_limits` | `bucket_key` (HMAC), `window_started_at`, `attempt_count` | Erişim yok | Okur/yazar |
| `consume_rate_limit(key, max, window)` | Bir denemeyi atomik sayar; `allowed`, `retry_after_seconds` döner | Çalıştıramaz | Çalıştırır |
| `reset_rate_limit(key)` | Başarılı girişten sonra kullanıcı adı sayacını siler | Çalıştıramaz | Çalıştırır |

Rol kısıtları veri tabanında da vardır: öğrenci rolü başka bir rolle birleşemez; `admin` yalnızca `parent` ile birlikte verilir (karar 0.13). Zaman alanları `timestamptz` (UTC) tutulur; gün sınırı hesapları Faz 6'da Europe/Istanbul'a göre yapılacak.

`audit_events` içine parola, belirteç, davet kodu, açık kullanıcı adı veya IP yazılmaz. Uygulama tarafında olay tipleri ve `metadata` alanları kapalı bir listeyle sınırlıdır (`src/features/auth/ports.ts`).

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
