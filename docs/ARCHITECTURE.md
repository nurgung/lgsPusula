# Mimari Taslak

## Katmanlar

1. **Sunum katmanı:** Next.js sayfaları, erişilebilir bileşenler, formlar ve grafikler.
2. **Uygulama katmanı:** Kullanım senaryoları, şema doğrulama, iş akışları ve servis orkestrasyonu.
3. **Domain katmanı:** Hedef hesapları, deneme net kuralları, kazanım önceliklendirme, karakter deneyimi ve koçluk politikaları.
4. **Altyapı katmanı:** PostgreSQL, kimlik doğrulama, dosya depolama, bildirim sağlayıcısı ve yapay zekâ adaptörü.

## Önerilen domain alanları

- Identity & Profiles
- Family Relationships
- Curriculum
- Study Logs & Goals
- Exams & Learning Outcomes
- Coaching Rules & AI Explanations
- Mascot & Rewards
- Notifications
- Imports & Reports
- Administration & Audit

## Veri akışı

1. Kullanıcı oturum açar.
2. İstek sunucuya gelir; kimlik doğrulama ve kaynak erişimi kontrol edilir.
3. Girdi şema doğrulamasından geçer.
4. Domain kuralı uygulanır.
5. Veriler yetkili kapsamda saklanır.
6. Koçluk için önce deterministik analiz oluşturulur.
7. Gerekliyse asgari veri yapay zekâ sağlayıcısına gönderilir.
8. Yanıt doğrulanır, güvenli biçimde kullanıcıya gösterilir.
9. Kritik olaylar hassas veri içermeden kaydedilir.

## Hata davranışı

- Veritabanı kullanılamıyorsa sahte başarı mesajı gösterilmez.
- Yapay zekâ servisi başarısızsa kural tabanlı öneri sunulur ve AI yanıtının üretilemediği açıklanır.
- Rapor üretimi başarısızsa geçersiz veya boş dosya indirilmez.
- Dosya içe aktarma kısmi sonuç verdiyse başarı ve hata sayıları ayrı gösterilir.

## Uygulanan altyapı kararları (Faz 1)

| Konu | Karar |
|---|---|
| Çatı | Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript 5.9 (strict + `noUncheckedIndexedAccess`) |
| Önbellek modeli | `cacheComponents` ve `partialPrefetching` açık. Oturum/çerez okuyan bileşenler `<Suspense>` arkasında olmalı; oturuma bağlı veri paylaşılan önbelleğe alınmamalı. |
| Stil | Tailwind CSS 4; renk/gölge/köşe token'ları yalnızca `src/app/globals.css` içindeki `@theme` bloğunda |
| Doğrulama | Zod 4. Sunucu ortam değişkenleri `src/lib/env/server.ts` içinde doğrulanır; hata mesajı yalnızca değişken adını içerir, değeri içermez. |
| Sunucu sınırı | Sunucuya özel modüller `import "server-only"` ile işaretlenir; istemci paketine girerse build hata verir. |
| Güvenlik başlıkları | `src/lib/security-headers.ts`: nosniff, çerçeveleme yasağı, referrer ve izin politikaları, HSTS, nonce gerektirmeyen CSP yönergeleri. Betik/stil CSP'si (nonce) henüz yok. |
| Testler | Vitest + Testing Library (birim/bileşen, test dosyaları kaynağın yanında `*.test.ts(x)`), Playwright (`tests/e2e`, 320 px mobil ve masaüstü). |
| Biçim | Prettier; ESLint `eslint-config-next` + `any`/`@ts-ignore` yasağı + `NEXT_PUBLIC_` gizli ad yasağı |

### Klasör yapısı

```text
src/app/                 sayfalar ve route dosyaları (Türkçe URL'ler)
src/components/ui/       ortak arayüz bileşenleri (Button, Card, StateMessage, ProgressMeter, TableScroll)
src/components/layout/   ortak yerleşim parçaları (SkipLink)
src/features/<feature>/  özellik modülleri; şu an yalnızca `preview`
src/lib/                 framework'ten bağımsız yardımcılar (env, güvenlik başlıkları)
src/services/            sunucu servisleri (henüz boş)
src/types/               ortak tipler (roller)
tests/unit, tests/e2e    kaynağa bağlı olmayan birim testleri ve uçtan uca testler
```

### Rol sayfası taslakları (`/onizleme`)

- `/onizleme/ogrenci`, `/onizleme/veli`, `/onizleme/yonetici`, `/onizleme/durumlar` yalnızca kurgusal örnek veri (`src/features/preview/demo-data.ts`) gösterir.
- `UI_PREVIEW_ENABLED=true` olmadıkça veya `APP_ENV=production` ise 404 döner. Bu bir **özellik bayrağıdır, erişim kontrolü değildir.** Bayrak derleme zamanında okunur.
- Gerçek rol sayfaları (ör. `/ogrenci`) kimlik doğrulama ve sunucu tarafı yetkilendirme (Faz 3 ve 4) tamamlanmadan oluşturulmamalıdır. Önizleme sayfaları hiçbir zaman gerçek kayıt okumamalıdır.

### Henüz uygulanmayanlar

- Kimlik doğrulama, oturum, roller, veli-öğrenci ilişkisi ve tüm yetkilendirme kontrolleri (Faz 3 ve 4).
- Veri tabanı, migration'lar ve RLS politikaları. Sağlayıcı olarak Supabase seçildi ([DECISIONS.md](DECISIONS.md)) ama henüz bağlanmadı.
- Net hesaplama kuralları, hedefler, günlük kayıt ve deneme formları, kazanım kataloğu.
- Koçluk motoru, yapay zekâ adaptörü, karakter puanları, bildirimler, içe aktarma, PDF/DOCX raporlar.
- PWA manifesti ve simgeler, nonce tabanlı CSP, oran sınırlama, hata izleme, CI hattı, gizli anahtar taraması.
