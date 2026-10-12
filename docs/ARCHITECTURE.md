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
src/components/ui/       ortak arayüz bileşenleri (Button, Card, StateMessage, ProgressMeter, TableScroll,
                         form alanları, ConfirmDialog, Toast)
src/components/layout/   ortak yerleşim parçaları (SkipLink, AppShell, AppNav)
src/features/<feature>/  özellik modülleri; şu an `preview` ve `navigation` (rol bazlı menü)
src/lib/                 framework'ten bağımsız yardımcılar (env, güvenlik başlıkları, menü eşleşmesi)
src/services/            sunucu servisleri (henüz boş)
src/types/               ortak tipler (roller)
tests/unit, tests/e2e    kaynağa bağlı olmayan birim testleri ve uçtan uca testler
```

### Rol sayfası taslakları (`/onizleme`)

- `/onizleme/ogrenci`, `/onizleme/veli`, `/onizleme/yonetici`, `/onizleme/durumlar` yalnızca kurgusal örnek veri (`src/features/preview/demo-data.ts`) gösterir.
- `UI_PREVIEW_ENABLED=true` olmadıkça veya `APP_ENV=production` ise 404 döner. Bu bir **özellik bayrağıdır, erişim kontrolü değildir.** Bayrak derleme zamanında okunur.
- Gerçek rol sayfaları (ör. `/ogrenci`) kimlik doğrulama ve sunucu tarafı yetkilendirme (Faz 3 ve 4) tamamlanmadan oluşturulmamalıdır. Önizleme sayfaları hiçbir zaman gerçek kayıt okumamalıdır.

## Tasarım sistemi ve CI (Faz 2)

### Ortak bileşenler

| Bileşen | Dosya | Notlar |
|---|---|---|
| `TextField`, `NumberField`, `SelectField`, `FormErrorSummary` | `src/components/ui/form-field.tsx` | Görünür etiket, yardım metni ve alan hatası `aria-describedby` ile bağlanır; hatalı alan `aria-invalid` alır. `NumberField`, `type="text"` + `inputMode="numeric"` kullanır (mobil rakam klavyesi, fare tekerleğiyle değişme yok). Sayı doğrulaması yine sunucudaki ortak şemada yapılmalıdır. |
| `ConfirmDialog` | `src/components/ui/confirm-dialog.tsx` | Yerleşik `<dialog>` + `showModal()`: sayfanın geri kalanı etkisizleşir, Esc kapatır, odak açan öğeye döner, Tab içeride döner. İlk odak güvenli "Vazgeç" düğmesindedir. `pending` iken düğmeler kilitlenir (çift gönderim yok). |
| `ToastProvider`, `useToast` | `src/components/ui/toast.tsx` | Kök yerleşimde. Canlı bölgeler ilk çizimden itibaren sayfadadır. Hatalar `role="alert"`, diğerleri `role="status"` ile duyurulur. Başarı/bilgi 6 sn sonra kapanır (üzerine gelince/odaklanınca durur); hata kullanıcı kapatana kadar kalır. En fazla 3 bildirim görünür. |
| `AppShell`, `AppNav` | `src/components/layout/` | Üst başlık; `sm` ve üstünde başlıkta menü, küçük ekranda sabit alt menü. Aynı anda yalnızca bir "Ana menü" görünür. Etkin sayfa `aria-current="page"` ve alt çizgiyle (yalnızca renkle değil) gösterilir. |
| `getNavItems(roles)` | `src/features/navigation/nav-items.ts` | Rol bazlı menü yapısı. Veli + yönetici hesabı iki menünün birleşimini görür. Menü yalnızca neyin **gösterileceğini** belirler; erişim kontrolü değildir. En fazla 5 öğe (320 px'te 64 px hedef). |

Bileşenler `/onizleme/bilesenler` sayfasında örnek olarak görülebilir. Satır içi `style` kullanılmaz; ileride eklenecek katı CSP (Faz 12.3) ile uyumlu kalmak için sabit sınıflar tercih edilir.

### CI hattı

`.github/workflows/ci.yml` her push ve PR'da, haftalık olarak (pazartesi 05:00 UTC) ve elle başlatıldığında üç iş çalıştırır:

1. **Lint, tip, test ve build:** `lint`, `format:check`, `typecheck`, `test`, `build`.
2. **Uçtan uca testler:** Playwright (Chromium, 320 px ve masaüstü). Başarısızlıkta izler 7 gün saklanır.
3. **Bağımlılık ve gizli anahtar denetimi:** production bağımlılıkları için engelleyici `npm audit`, tüm bağımlılıklar için rapor amaçlı `npm audit`, Gitleaks ile gizli anahtar taraması (push/PR'da yeni commit'ler, haftalık ve elle çalıştırmada tüm geçmiş). Kabul edilen riskler `SECURITY.md` içindedir.

Dependabot (`.github/dependabot.yml`) npm ve GitHub Actions güncellemelerini haftalık önerir.

### Dağıtım (Vercel) — kurulum adımları

`vercel.json` sunucu fonksiyonlarını Frankfurt'ta (`fra1`) çalıştırır (karar 0.2). Vercel projesinin bağlanması proje sahibinin hesabıyla yapılır:

1. Vercel'de **Add New → Project** ile `nurgung/lgsPusula` deposunu içe aktar. Çatı: Next.js; ayarlar varsayılan kalabilir.
2. **Settings → Environment Variables** içinde ortam bazında ayrı değer gir:

   | Değişken | Preview (staging) | Production |
   |---|---|---|
   | `APP_ENV` | `staging` | `production` |
   | `UI_PREVIEW_ENABLED` | `false` (örnek veri sayfalarını görmek istersen `true`; bu sayfalarda giriş yok) | `false` (production'da zaten reddedilir) |
   | `NEXT_PUBLIC_APP_URL` | staging alan adı (ör. `https://lgs-pusula-git-staging-<hesap>.vercel.app`) | production alan adı |
   | Supabase ve diğer gizli değerler | Faz 3'te, staging Supabase projesinin değerleri | Faz 3'te, production projesinin değerleri |

   Gizli değerler yalnızca Vercel'de tutulur; depoya veya `NEXT_PUBLIC_` değişkenlerine konmaz. Preview ortamına production anahtarı verilmez.
3. **Settings → Deployment Protection** içinde preview dağıtımları için **Vercel Authentication** açık kalmalı. Böylece staging adresini yalnızca Vercel hesabıyla giriş yapan kişi görür.
4. Kalıcı bir staging adresi için `staging` dalını oluştur. Vercel bu dal için `...-git-staging-...vercel.app` adresini verir. İstersen **Settings → Domains** içinden bu dala ayrı bir alan adı bağlayabilirsin.
5. Adresin HTTPS ile açıldığını ve güvenlik başlıklarının (`x-content-type-options`, `x-frame-options`, `strict-transport-security`) geldiğini kontrol et.

### Henüz uygulanmayanlar

- Kimlik doğrulama, oturum, roller, veli-öğrenci ilişkisi ve tüm yetkilendirme kontrolleri (Faz 3 ve 4).
- Veri tabanı, migration'lar ve RLS politikaları. Sağlayıcı olarak Supabase seçildi ([DECISIONS.md](DECISIONS.md)) ama henüz bağlanmadı.
- Net hesaplama kuralları, hedefler, günlük kayıt ve deneme formları, kazanım kataloğu.
- Koçluk motoru, yapay zekâ adaptörü, karakter puanları, bildirimler, içe aktarma, PDF/DOCX raporlar.
- PWA manifesti ve simgeler, nonce tabanlı CSP, oran sınırlama, hata izleme.
- Vercel projesinin bağlanması ve staging ortamı (adımlar yukarıda; proje sahibinin hesabıyla yapılacak).
