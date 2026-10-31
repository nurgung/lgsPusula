# Veri Modeli Taslağı

Bu taslak nihai şema değildir. Gerçek şema migration dosyalarıyla yönetilmeli ve erişim politikaları her tablo için ayrıca tanımlanmalıdır.

## Uygulanan şema (Faz 3)

Migration: `supabase/migrations/20261012120000_auth_foundation.sql`. Yerel yapılandırmada `auto_expose_new_tables = false` olduğundan hiçbir tablo açık `grant` verilmeden Data API'ye açılmaz. Bulut projelerinde de açıklar aynı migration'daki `revoke` ifadeleriyle kapatılır.

| Tablo / fonksiyon                      | Alanlar                                                                                                                                                                    | Erişim (`authenticated`)                                                                                                                         | Erişim (`service_role`)                     |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `profiles`                             | `id` (→ `auth.users`, silinince silinir), `username` (benzersiz, `^[a-z0-9_]{3,32}$`), `display_name` (1–50), `roles` (`app_role[]`), `must_change_password`, `created_at` | Yalnızca kendi satırını **okur** (RLS). Ekleme, güncelleme, silme yetkisi yok; rol ve geçici parola bayrağı kullanıcı tarafından değiştirilemez. | Okur/yazar (sunucu ve kurulum betiği)       |
| `audit_events`                         | `occurred_at`, `event_type`, `actor_id` (→ `auth.users`, silinince `null`), `outcome` (`success`/`failure`/`blocked`), `metadata` (en fazla 2 KB nesne)                    | Erişim yok                                                                                                                                       | Ekler ve okur; güncelleme/silme yetkisi yok |
| `auth_rate_limits`                     | `bucket_key` (HMAC), `window_started_at`, `attempt_count`                                                                                                                  | Erişim yok                                                                                                                                       | Okur/yazar                                  |
| `consume_rate_limit(key, max, window)` | Bir denemeyi atomik sayar; `allowed`, `retry_after_seconds` döner                                                                                                          | Çalıştıramaz                                                                                                                                     | Çalıştırır                                  |
| `reset_rate_limit(key)`                | Başarılı girişten sonra kullanıcı adı sayacını siler                                                                                                                       | Çalıştıramaz                                                                                                                                     | Çalıştırır                                  |

Rol kısıtları veri tabanında da vardır: öğrenci rolü başka bir rolle birleşemez; `admin` yalnızca `parent` ile birlikte verilir (karar 0.13). Zaman alanları `timestamptz` (UTC) tutulur. Günlük çalışma kaydının günü ayrıca `studied_on date` alanındadır ve Europe/Istanbul sivil günüdür (Faz 6).

`audit_events` içine parola, belirteç, davet kodu, açık kullanıcı adı veya IP yazılmaz. Uygulama tarafında olay tipleri ve `metadata` alanları kapalı bir listeyle sınırlıdır (`src/features/auth/ports.ts`).

## Uygulanan şema (Faz 4)

Migration: `supabase/migrations/20261013120000_family_links.sql`. Yazmalar `service_role` fonksiyonlarından geçer. Kullanıcıya yazma politikası verilmez.

| Tablo / fonksiyon                                                                                                        | Alanlar                                                                                                                                                                                               | Erişim (`authenticated`)                                                                                                    | Erişim (`service_role`)                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `family_invites`                                                                                                         | `student_id`, `code_hash` (HMAC-SHA256, 64 onaltılık), `created_at`, `expires_at` (24 saat), `consumed_at`, `superseded_at`                                                                           | Erişim yok                                                                                                                  | Okur/yazar. Öğrenci başına en fazla bir açık kod. Kullanılmayan satırlar, yeni kod üretilirken 7 günden eskiler silinerek temizlenir.   |
| `family_links`                                                                                                           | `student_id`, `parent_id`, `status` (`pending`, `active`, `declined`, `expired`, `revoked`), `invite_id`, `created_at`, `expires_at` (yalnızca `pending`), `responded_at`, `revoked_at`, `revoked_by` | Yalnızca kendisinin öğrenci veya veli olduğu satırı **okur** (iki ayrı `select` politikası). Ekleme, güncelleme, silme yok. | Okur/yazar. Öğrenci başına en fazla bir `active` ve bir `pending` satır. Kişi kendini bağlayamaz.                                       |
| `visible_family_links()`                                                                                                 | Bağlantı alanları ve iki tarafın `display_name` değeri                                                                                                                                                | Çalıştırır (`security definer`). Yalnızca çağıranın taraf olduğu satırlar; kullanıcı adı, rol ve parola bayrağı dönmez.     | Çalıştırır                                                                                                                              |
| `create_family_invite`, `redeem_family_invite`, `respond_family_link`, `revoke_family_link`, `expire_stale_family_links` | Davet ve bağlantı durum geçişleri                                                                                                                                                                     | Çalıştıramaz                                                                                                                | Çalıştırır. Süresi dolan kod ve bekleyen istek `expired` olur. Onay ve kaldırma, hedef durumdaysa yeniden çağrılırsa aynı sonucu verir. |

Bitmiş bağlantı satırları 1 yıl, kullanılmayan davetler 7 gün saklanır (karar 0.5). `purge_retained_rows()` bunu uygular (Faz 12, `20261021160000_retention.sql`). Production'a 21 Ekim 2026'da gönderildi. Zamanlanmış görev yoktur; temizlik `npm run data -- retain` ile çalışır.

## Uygulanan şema (Faz 5)

Migration: `supabase/migrations/20261013130000_curriculum_catalog.sql`. Her satırda kaynak adı, kaynak sürümü ve giriş tarihi (`created_at`) vardır (karar 0.6). `updated_at` tetikleyiciyle güncellenir. Satırlar silinmez; eskiyen satır `archived_at` ile işaretlenir.

| Tablo / fonksiyon     | Alanlar                                                                                                                                                         | Erişim (`authenticated`)                                                                                                                                                       | Erişim (`service_role`)                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `subjects`            | `code` (benzersiz, `^[a-z][a-z0-9_]{1,31}$`), `name` (1–80), `sort_order` (0–9999), `source_name`, `source_version`, `created_at`, `updated_at`, `archived_at` | Herkes **okur**. Ekleme ve güncelleme yalnızca `is_catalog_admin()` doğruysa. `code` güncellenemez.                                                                            | Okur/yazar/siler (betik ve test temizliği)               |
| `topics`              | `subject_id` (silmeye karşı korumalı), `name` (1–160), `sort_order`, kaynak alanları, zaman alanları; (ders, ad, kaynak sürümü) benzersiz                      | Herkes **okur**. Ekleme ve güncelleme yalnızca `is_catalog_admin()` doğruysa. `subject_id` güncellenemez (konu taşınamaz).                                                     | Okur/yazar/siler                                         |
| `learning_outcomes`   | `topic_id` (silmeye karşı korumalı), `code` (`^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$`), `description` (1–500), `sort_order`, kaynak ve zaman alanları; (kod, kaynak sürümü) benzersiz | Herkes **okur**. Ekleme ve güncelleme yalnızca `is_catalog_admin()` doğruysa. `topic_id` güncellenemez (kazanım taşınamaz).                                                    | Okur/yazar/siler                                         |
| `is_catalog_admin()`  | JWT'deki `aal` değeri `aal2` **ve** profilde `admin` rolü                                                                                                       | Çalıştırır                                                                                                                                                                     | Çalıştırır                                               |

Kullanıcılara silme yetkisi verilmez. `anon` rolünün katalogda hiçbir yetkisi yoktur. Okuma ve yazma politikaları ayrıdır; sütun düzeyindeki `grant` ifadeleri `id`, üst kayıt kimliği ve zaman alanlarının kullanıcı tarafından yazılmasını engeller.

## Uygulanan şema (Faz 6)

Migration: `supabase/migrations/20261019150000_study_records.sql`. `studied_on` bir `date` alanıdır ve Europe/Istanbul sivil gününü tutar. Diğer zaman alanları `timestamptz` (UTC) kalır. Hafta pazartesi başlar, pazar biter. Hedef birimi soru sayısıdır.

| Tablo | Alanlar | Erişim (`authenticated`) | Erişim (`service_role`) |
| --- | --- | --- | --- |
| `study_logs` | `student_id`, `studied_on`, `subject_id`, isteğe bağlı `topic_id` / `learning_outcome_id`, soru sayıları, `duration_minutes` (0–1440), `request_id`, zamanlar | Öğrenci kendi satırını ekler, okur, günceller ve siler. Aktif bağlantısı olan veli yalnızca okur. `student_id` ve `request_id` güncellenemez. | Okur/yazar/siler |
| `study_goals` | `student_id`, `period` (`day`/`week`), isteğe bağlı `subject_id` (boş = tüm dersler), `target_questions` (1–2000) | Aynı okuma/yazma kuralı. Öğrenci başına bir dönem ve ders için tek satır (`unique nulls not distinct`). | Okur/yazar/siler |

Soru sayıları eksi olamaz; doğru + yanlış + boş, soru sayısına eşittir ve en az 1'dir. İleri tarih ve 1 Eylül 2024'ten eski tarih tetikleyiciyle reddedilir. Konu seçilen derse, kazanım o konuya ait olmalıdır. Aynı `(student_id, request_id)` ikinci satır açmaz. Katalog satırı silinemez (`on delete restrict`); hesap silinince öğrencinin kayıtları silinir (`on delete cascade`). Yönetici rolü bu tablolara ek erişim vermez.

## Uygulanan şema (Faz 7)

Migration: `supabase/migrations/20261019160000_exams.sql`. `taken_on` Europe/Istanbul sivil günüdür. Net değerleri uygulamada hesaplanır ve satıra yazılır; `rule_version` hangi kuralın kullanıldığını tutar.

| Tablo | Alanlar | Erişim (`authenticated`) | Erişim (`service_role`) |
| --- | --- | --- | --- |
| `exams` | `student_id`, `title` (1–80), `taken_on`, `exam_type` (`lgs_full`/`branch`), `rule_version`, `total_net` (≥ 0), `score` (0–500, isteğe bağlı), `request_id`, zamanlar | Öğrenci kendi satırını ekler, okur, günceller ve siler. Aktif bağlantısı olan veli yalnızca okur. `student_id` ve `request_id` güncellenemez. | Okur/yazar/siler |
| `exam_subject_results` | `exam_id`, `subject_id`, soru sayıları (1–100 / 0–100), `net` (eksi olabilir) | Aynı sahiplik kuralı; satırlar üst denemeye bağlıdır. Ders başına bir satır. | Okur/yazar/siler |

Doğru + yanlış + boş = soru sayısı. Aynı `(student_id, request_id)` ikinci deneme açmaz. Katalog satırı silinemez (`on delete restrict`); deneme silinince ders satırları silinir (`on delete cascade`).

`score` sütunu `20261029120000_exam_score.sql` ile eklendi; hassasiyet `20261030210000_exam_score_3dp.sql` ile `numeric(8, 3)` oldu. Öğrencinin sonuç kağıdından yazdığı isteğe bağlı puandır (0–500, en fazla 3 ondalık); netten üretilmez. Boş bırakılırsa `null` kalır; raporda "Kayıt yok" yazılır. İlk sütun yerelde ve production'da 29 Ekim 2026'da uygulandı. 3 ondalık migration yerelde ve production'da 30 Ekim 2026'da uygulandı (`npx supabase migration up --local`; `npx supabase db push`, önce `--dry-run`).

## Uygulanan şema (Faz 8)

Migration: `supabase/migrations/20261020120000_exam_mistakes.sql`. Her satır bir yanlış veya boş cevabın kazanıma bağlanmasıdır. Kaynak ve güven düzeyi kayda yazılır; Faz 8 yalnızca `source=manual` ve `confidence=high` yazar.

| Tablo | Alanlar | Erişim (`authenticated`) | Erişim (`service_role`) |
| --- | --- | --- | --- |
| `exam_mistakes` | `exam_subject_result_id`, `learning_outcome_id`, `mistake_kind` (`wrong`/`blank`), `source` (`manual`), `confidence` (`high`/`medium`/`low`), `sort_order` | Öğrenci kendi denemesine ekler, okur, günceller, siler. Aktif bağlantılı veli yalnızca okur. | Okur/yazar/siler |

Kazanım, ders satırının dersiyle aynı olmalıdır. Aynı türde eşleştirme sayısı, o dersin `wrong_count` / `blank_count` değerini aşamaz. Manuel kaynakta güven her zaman `high` olmalıdır. Ders satırı silinince eşleştirmeler silinir (`on delete cascade`); kazanım silinemez (`on delete restrict`). Deneme düzenlemede ders satırları `subject_id` ile yerinde güncellenir; böylece eşleştirmeler korunur. Yanlış/boş sayısı düşerse fazla eşleştirmeler budanır.

## Türetilen koçluk (Faz 9)

Öneri cümlesi tabloda durmaz. `coaching-v1` her istekte `study_logs`, `study_goals`, `exams`, `exam_mistakes` ve `coaching_practice_completions` satırlarından hesaplanır. Neden, kural sürümü ve kanıt yalnızca o yanıtın nesnesinde durur.

Migration: `supabase/migrations/20261024120000_coaching_practice_completions.sql`. Yerelde uygulandı (24 Ekim 2026). Production'a 29 Ekim 2026'da uygulandı (`npx supabase db push`).

| Tablo | Alanlar | Erişim (`authenticated`) | Erişim (`service_role`) |
| --- | --- | --- | --- |
| `coaching_practice_completions` | `student_id`, `learning_outcome_id`, `question_count` (1–2000), `completed_at` | Öğrenci kendi satırını ekler ve soru sayısı ile tarihi günceller. Aktif bağlantılı veli yalnızca okur. Silme yok. | Okur/yazar/siler |

Aynı öğrenci ve kazanım çifti tek satırdır. Satır, o sayıdaki bağlı yanlış ve boş için işaretin bittiğini tutar. Çalışma kaydı veya puan değildir. Hesap silinince öğrenciyle birlikte silinir. Kazanım satırı silinemez (`on delete restrict`).

## Uygulanan şema (Faz 10)

Migration: `supabase/migrations/20261020140000_mascot.sql`. Ornitorenk ve kapibara `20261024160000_mascot_species_platypus_capybara.sql` ile izinli tür listesine eklendi. Puan `mascot-v1` kuralıyla yalnızca `sync_mascot_rewards_for` içinde yazılır: çalışma kaydı 5, tüm dersler günlük hedefi (bugün, bir kez) 10, deneme kaydı 5, kazanım eşleştirmesi 8. Aynı `(student_id, idempotency_key)` ikinci satır açmaz. Satırlar güncellenemez. Kaynak silinse de puan satırı durur; bir gün ara puanı düşürmez. Görünür aşama saklanmaz; `growth-v1` puan eşiği, seri ve soruyla hesaplanır.

| Tablo | Alanlar | Erişim (`authenticated`) | Erişim (`service_role`) |
| --- | --- | --- | --- |
| `mascot_profiles` | `student_id`, `species` (`cat`/`turtle`/`sparrow`/`platypus`/`capybara`/`daisy`/`sapling`) | Öğrenci kendi satırını ekler, okur ve türünü günceller. Aktif bağlantılı veli yalnızca okur. | Okur/yazar/siler |
| `reward_events` | `event_type`, `points` (1–20), `idempotency_key`, `source_date`, `rule_version` (`mascot-v1`) | Öğrenci ve aktif veli okur. Ekleme, güncelleme ve silme yok. | Okur/ekler/siler; güncelleme tetikleyiciyle de kapalı |
| `notification_preferences` | `enabled`, `quiet_start`, `quiet_end` (İstanbul duvar saati; eşitse sessiz saat kapalı), `max_per_day` (1–3) | Yalnızca öğrenci kendi satırını okur ve yazar. Veli okuyamaz. | Okur/yazar/siler |
| `in_app_notices` | `kind` (`study_reminder`, `streak_broken`, `mascot_sick`, `mascot_recovering`, `stage_earned`), `notice_date`, `sequence` (1–3), `dismissed_at` | Öğrenci kendi satırını okur ve yalnızca `dismissed_at` günceller. Metin sütunu yoktur. Doğrudan ekleme yoktur. | Okur/yazar/siler |

`sync_mascot_rewards()` ve `open_study_reminder()` oturumdaki öğrenciyi ister. Veli çalıştıramaz. Hatırlatma cümlesi kodda sabittir; sınav sonucu, net veya puan içermez. Sessiz saatte ve günlük sınır dolunca yeni satır açılmaz.

`open_growth_notice(kind, notice_date)` de oturumdaki öğrenciyi ister. Tür yalnızca seri, dinlenme, toparlanma veya aşama olabilir. Aynı `(student_id, kind, notice_date, sequence)` ikinci satır açmaz. Gizlenmiş satırın kimliği geri verilmez. Bu bir telefon bildirimi değildir. Migration `20261024190000_mascot_growth_notices.sql` yeni tablo açmaz. Production'a 29 Ekim 2026'da uygulandı (`npx supabase db push`).

Görünür aşama sütunu yoktur. `mascot-v1` puanları durur. `growth-v1` bu puan eşiğini, çalışma serisini, farklı günleri ve soru toplamını `study_logs` satırlarından hesaplar. Sağlık da aynı satırlardan hesaplanır. Ayrı bir sağlık veya seri tablosu yoktur.

## Uygulanan şema (Faz 11)

Migration: `supabase/migrations/20261021120000_report_jobs.sql`. Yerelde ve production'da uygulandı (21 Ekim 2026). Haftalık ve aylık PDF baytları bu tablodadır; herkese açık bir dosya yolu yoktur. Süresi en fazla 24 saat sonradır. Geçmiş bir `expires_at` yazılabilir; indirme yine de reddeder. Silme `purge_expired_report_jobs()` ile olur ve yalnızca `service_role` çalıştırır. Zamanlanmış görev yoktur.

Aylık PDF genişletmesi: `supabase/migrations/20261031120000_monthly_report_jobs.sql` (`weekly_pdf` | `monthly_pdf`; haftalık dönem ≤ 7 gün, aylık ≤ 31 gün). Yerel/production uygulaması bu turda doğrulanmalıdır.

| Tablo | Alanlar | Erişim (`authenticated`) | Erişim (`service_role`) |
| --- | --- | --- | --- |
| `report_jobs` | `student_id`, `requested_by`, `report_type` (`weekly_pdf` \| `monthly_pdf`), `period_from`, `period_to`, `status` (`ready`/`failed`), `pdf_bytes`, `byte_size`, `failure_code`, `storage_kind` (`database`), `expires_at` | Talep sahibi, aktif bağlantısı duruyorsa ve satır hazırsa ve süresi dolmamışsa meta veriyi okur. `pdf_bytes` sütunu verilmez. Ekleme, güncelleme ve silme yok. Öğrenci okuyamaz. | Okur/yazar/siler. Uygulama, aktif bağlantıyı kontrol ettikten sonra yazar |

Hazır satır `%PDF-` ile başlar ve 400–1.500.000 bayttır. Başarısız satırda bayt yoktur. Aynı veli, öğrenci, tür ve dönem tek satırdır. Talep sahibi veli rolünde olmalıdır; konu yalnızca öğrenci rolünde olmalıdır. İkisi aynı kişi olamaz. Haftalık dönem en fazla 7, aylık dönem en fazla 31 gündür.

## Önerilen tablolar

- `study_logs`, `study_goals`, `exams`, `exam_subject_results`, `exam_mistakes`: uygulandı (yukarıya bakın).
- `mascot_profiles`: öğrenci, seçilen karakter ve aşama. Uygulandı (Faz 10); aşama sütunu yoktur. Puan `mascot-v1` satırlarındadır. Görünür aşama `growth-v1` ile seri, gün, soru ve puan eşiğinden hesaplanır.
- `reward_events`: öğrenci, olay türü, puan ve idempotency anahtarı. Uygulandı (Faz 10).
- `notification_preferences`: kanal, sıklık, sessiz saatler ve izinler. Uygulandı (Faz 10); kanal yalnızca uygulama içidir.
- `import_jobs`: ayrı tablo açılmadı. İçe aktarma istek içinde biter. Tekrar, `study_logs.request_id` ile engellenir (Faz 13).
- `report_jobs`: uygulandı (Faz 11, yerel ve production). Baytlar tablodadır; geçici dosya yolu yoktur.
- `audit_events`: gerekli güvenlik olayları; parola, token veya gereksiz kişisel veri içermez. `report.generate` bu tabloya yazar.

## Uygulanan şema (Faz 13)

Migration: `supabase/migrations/20261022100000_ai_preferences.sql`. Yerelde 22 Ekim 2026'da uygulandı. Production'a 29 Ekim 2026'da uygulandı (`npx supabase db push`).

| Tablo / fonksiyon | Alanlar | Erişim (`authenticated`) | Erişim (`service_role`) |
| --- | --- | --- | --- |
| `ai_preferences` | `student_id`, `enabled` (varsayılan kapalı), `used_on`, `request_count` (0–100) | Yalnızca kendi satırını **okur**. Doğrudan ekleme ve güncelleme yok. | Okur/yazar. Sayaç `consume_ai_request` ile artar. |
| `set_ai_enabled(boolean)` | Öğrencinin kendi anahtarını açar veya kapatır. Sayaca dokunmaz. | Yalnızca rolü tek başına `student` olan oturum çalıştırır. | Çalıştırır |
| `consume_ai_request(uuid, date, integer)` | İstanbul günü değişince sayacı 1 yapar; aynı günde tavana gelince `false` döner. | Çalıştıramaz | Çalıştırır |

## Veri modelleme ilkeleri

- Birincil anahtarlar tahmin edilmesi zor olabilir; ancak kimliklerin tahmin edilemez olması yetkilendirme yerine geçmez.
- Yabancı anahtarlar ve uygun bütünlük kısıtları tanımlanmalıdır.
- Tarih/saat alanları için saat dilimi yaklaşımı belgelenmelidir.
- Net değeri gerektiğinde tekrar hesaplanabilir olmalı; kullanılan kural sürümü kaydedilmelidir.
- Kayıt sahibi/öğrenci ilişkisi her sorguda kontrol edilmelidir.
- İlişki iptali ve hesap silme için veri yaşam döngüsü tanımlanmalıdır.
- İçe aktarma ve ödül olayları tekrar çalıştırmaya karşı idempotent tasarlanmalıdır.
- RLS politikaları varsa her tablo için okuma/yazma senaryoları ayrı test edilmelidir.
