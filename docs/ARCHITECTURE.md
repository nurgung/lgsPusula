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

| Konu                | Karar                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Çatı                | Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript 5.9 (strict + `noUncheckedIndexedAccess`)                                                                     |
| Önbellek modeli     | `cacheComponents` ve `partialPrefetching` açık. Oturum/çerez okuyan bileşenler `<Suspense>` arkasında olmalı; oturuma bağlı veri paylaşılan önbelleğe alınmamalı.          |
| Stil                | Tailwind CSS 4; renk/gölge/köşe token'ları yalnızca `src/app/globals.css` içindeki `@theme` bloğunda                                                                       |
| Doğrulama           | Zod 4. Sunucu ortam değişkenleri `src/lib/env/server.ts` içinde doğrulanır; hata mesajı yalnızca değişken adını içerir, değeri içermez.                                    |
| Sunucu sınırı       | Sunucuya özel modüller `import "server-only"` ile işaretlenir; istemci paketine girerse build hata verir.                                                                  |
| Güvenlik başlıkları | `src/lib/security-headers.ts`: nosniff, çerçeveleme yasağı, referrer ve izin politikaları, HSTS, nonce gerektirmeyen CSP yönergeleri. Betik/stil CSP'si (nonce) henüz yok. |
| Testler             | Vitest + Testing Library (birim/bileşen, test dosyaları kaynağın yanında `*.test.ts(x)`), Playwright (`tests/e2e`, 320 px mobil ve masaüstü).                              |
| Biçim               | Prettier; ESLint `eslint-config-next` + `any`/`@ts-ignore` yasağı + `NEXT_PUBLIC_` gizli ad yasağı                                                                         |

### Klasör yapısı

```text
src/app/                 sayfalar ve route dosyaları (Türkçe URL'ler)
src/components/ui/       ortak arayüz bileşenleri (Button, Card, StateMessage, ProgressMeter, TableScroll,
                         form alanları, ConfirmDialog, Toast)
src/components/layout/   ortak yerleşim parçaları (SkipLink, AppShell, AppNav)
src/features/<feature>/  özellik modülleri: `auth` (Faz 3), `access` ve `family` (Faz 4), `preview`, `navigation` (rol bazlı menü)
src/lib/                 framework'ten bağımsız yardımcılar (env, güvenlik başlıkları, menü eşleşmesi)
src/services/supabase/   Supabase adaptörü (sunucu istemcileri, çerez ayarları, oturum yenileme)
src/proxy.ts             her istekte oturum yenileme (yetki kontrolü değildir)
supabase/                yerel Supabase yapılandırması ve migration'lar
scripts/                 hesap kurulum ve parola sıfırlama betiği (yalnızca yerelde çalışır)
src/types/               ortak tipler (roller)
tests/unit, tests/e2e    kaynağa bağlı olmayan birim testleri ve uçtan uca testler
```

### Bileşen önizlemesi (`/onizleme`)

- `/onizleme/bilesenler` ve `/onizleme/durumlar` ortak bileşenleri kurgusal örneklerle gösterir. Gerçek öğrenci kaydı okumaz.
- Rol taslakları (`/onizleme/ogrenci`, `/onizleme/veli`, `/onizleme/yonetici`) kaldırıldı. Gerçek sayfalar `/ogrenci`, `/veli` ve `/yonetici` altındadır.
- `UI_PREVIEW_ENABLED=true` olmadıkça veya `APP_ENV=production` ise 404 döner. Bu bir **özellik bayrağıdır, erişim kontrolü değildir.** Bayrak derleme zamanında okunur.

## Tasarım sistemi ve CI (Faz 2)

### Ortak bileşenler

| Bileşen                                                       | Dosya                                  | Notlar                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TextField`, `NumberField`, `SelectField`, `FormErrorSummary` | `src/components/ui/form-field.tsx`     | Görünür etiket, yardım metni ve alan hatası `aria-describedby` ile bağlanır; hatalı alan `aria-invalid` alır. `NumberField`, `type="text"` + `inputMode="numeric"` kullanır (mobil rakam klavyesi, fare tekerleğiyle değişme yok). Sayı doğrulaması yine sunucudaki ortak şemada yapılmalıdır. |
| `ConfirmDialog`                                               | `src/components/ui/confirm-dialog.tsx` | Yerleşik `<dialog>` + `showModal()`: sayfanın geri kalanı etkisizleşir, Esc kapatır, odak açan öğeye döner, Tab içeride döner. İlk odak güvenli "Vazgeç" düğmesindedir. `pending` iken düğmeler kilitlenir (çift gönderim yok).                                                                |
| `ToastProvider`, `useToast`                                   | `src/components/ui/toast.tsx`          | Kök yerleşimde. Canlı bölgeler ilk çizimden itibaren sayfadadır. Hatalar `role="alert"`, diğerleri `role="status"` ile duyurulur. Başarı/bilgi 6 sn sonra kapanır (üzerine gelince/odaklanınca durur); hata kullanıcı kapatana kadar kalır. En fazla 3 bildirim görünür.                       |
| `AppShell`, `AppNav`                                          | `src/components/layout/`               | Üst başlık; `sm` ve üstünde başlıkta menü, küçük ekranda sabit alt menü. Aynı anda yalnızca bir "Ana menü" görünür. Etkin sayfa `aria-current="page"` ve alt çizgiyle (yalnızca renkle değil) gösterilir.                                                                                      |
| `getNavItems(roles)`                                          | `src/features/navigation/nav-items.ts` | Rol bazlı menü yapısı. Veli + yönetici hesabı iki menünün birleşimini görür. Menü yalnızca neyin **gösterileceğini** belirler; erişim kontrolü değildir. En fazla 5 öğe (320 px'te 64 px hedef).                                                                                               |

Bileşenler `/onizleme/bilesenler` sayfasında örnek olarak görülebilir. Satır içi `style` kullanılmaz; ileride eklenecek katı CSP (Faz 12.3) ile uyumlu kalmak için sabit sınıflar tercih edilir.

### CI hattı

`.github/workflows/ci.yml` her push ve PR'da, haftalık olarak (pazartesi 05:00 UTC) ve elle başlatıldığında üç iş çalıştırır:

1. **Lint, tip, test ve build:** `lint`, `format:check`, `typecheck`, `test`, `build`.
2. **Uçtan uca testler:** Playwright (Chromium, 320 px ve masaüstü). İş, yerel Supabase'i başlatır (`supabase start`) ve `supabase/migrations` dosyalarını uygular; teste yalnızca veri tabanı, Auth, API ağ geçidi ve PostgREST gerekir. Başarısızlıkta izler 7 gün saklanır.
3. **Bağımlılık ve gizli anahtar denetimi:** production bağımlılıkları için engelleyici `npm audit`, tüm bağımlılıklar için rapor amaçlı `npm audit`, Gitleaks ile gizli anahtar taraması (push/PR'da yeni commit'ler, haftalık ve elle çalıştırmada tüm geçmiş). Kabul edilen riskler `SECURITY.md` içindedir.

Dependabot (`.github/dependabot.yml`) npm ve GitHub Actions güncellemelerini haftalık önerir.

### Dağıtım (Vercel) — kurulum adımları

`vercel.json` sunucu fonksiyonlarını Frankfurt'ta (`fra1`) çalıştırır (karar 0.2). Vercel projesinin bağlanması proje sahibinin hesabıyla yapılır:

1. Vercel'de **Add New → Project** ile `nurgung/lgsPusula` deposunu içe aktar. Çatı: Next.js; ayarlar varsayılan kalabilir.
2. **Settings → Environment Variables** içinde ortam bazında ayrı değer gir:

   | Değişken                                                                        | Preview (staging)                                                                | Production                                                    |
   | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
   | `APP_ENV`                                                                       | `staging`                                                                        | `production`                                                  |
   | `UI_PREVIEW_ENABLED`                                                            | `false` (örnek veri sayfalarını görmek istersen `true`; bu sayfalarda giriş yok) | `false` (production'da zaten reddedilir)                      |
   | `NEXT_PUBLIC_APP_URL`                                                           | staging alan adı (ör. `https://lgs-pusula-git-staging-<hesap>.vercel.app`)       | production alan adı                                           |
   | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` | staging Supabase projesinin değerleri; ayrı üretilmiş `AUTH_SECRET`              | production projesinin değerleri; ayrı üretilmiş `AUTH_SECRET` |

   Gizli değerler yalnızca Vercel'de tutulur; depoya veya `NEXT_PUBLIC_` değişkenlerine konmaz. Preview ortamına production anahtarı verilmez.

3. **Settings → Deployment Protection** içinde preview dağıtımları için **Vercel Authentication** açık kalmalı. Böylece staging adresini yalnızca Vercel hesabıyla giriş yapan kişi görür.
4. Kalıcı bir staging adresi için `staging` dalını oluştur. Vercel bu dal için `...-git-staging-...vercel.app` adresini verir. İstersen **Settings → Domains** içinden bu dala ayrı bir alan adı bağlayabilirsin.
5. Adresin HTTPS ile açıldığını ve güvenlik başlıklarının (`x-content-type-options`, `x-frame-options`, `strict-transport-security`) geldiğini kontrol et.

## Veri tabanı ve kimlik doğrulama (Faz 3)

### Katmanlar

| Katman                    | Dosyalar                                                                                                                     | Görev                                                                                                                                                                                                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alan (çatıdan bağımsız)   | `src/features/auth/username.ts`, `schemas.ts`, `ports.ts`, `rate-limit.ts`, `login.ts`, `change-password.ts`, `client-ip.ts` | Kullanıcı adı kuralı, Zod şemaları (istemci ve sunucu aynı şemayı kullanır), oran sınırı politikaları, giriş ve parola değiştirme kullanım senaryoları. Supabase'i bilmez; testlerde sahte bağımlılık kullanılır.                                                                                                                         |
| Veri erişim katmanı (DAL) | `src/features/auth/session.ts` (`server-only`)                                                                               | `getCurrentUser()` her istekte oturumu Auth sunucusuna sorar (`getUser`), profili RLS altında kullanıcının kendi yetkisiyle okur. `requireUser()` oturum yoksa `/giris`'e, geçici parola varsa `/parola-degistir`'e yönlendirir. İstek içinde `React.cache` ile tekrar kullanılır; istekler veya kullanıcılar arasında önbelleğe alınmaz. |
| Server Actions            | `src/features/auth/actions.ts`                                                                                               | Giriş, çıkış, tüm cihazlarda çıkış, parola değiştirme. Her işlem oturumu sunucuda yeniden okur; istemciden kullanıcı kimliği, rol veya yönlendirme adresi alınmaz (açık yönlendirme yok). CSRF'e karşı Next.js Server Action'larının Origin denetimine dayanır.                                                                           |
| Sağlayıcı adaptörü        | `src/services/supabase/` (`server-only`)                                                                                     | `createSessionClient` (çerezli, RLS altında), `createServiceClient` (`service_role`, yalnızca sunucu), `createEphemeralAuthClient` (mevcut parolayı oturuma dokunmadan doğrulamak için). `auth-adapters.ts` port'ların Supabase karşılıkları.                                                                                             |
| Proxy                     | `src/proxy.ts` → `refresh-session.ts`                                                                                        | Süresi dolmak üzere olan oturumu Server Component'ler çizilmeden yeniler ve iptal edilmiş oturumun çerezlerini temizler. **Yetki kontrolü değildir.**                                                                                                                                                                                     |
| Sayfalar                  | `/giris`, `/parola-degistir`, `/hesap`                                                                                       | Oturum okuyan kısımlar `<Suspense>` içinde ve `connection()` ile her zaman istek anında çalışır (build anındaki ortam değişkenlerine bağlı kalmaz).                                                                                                                                                                                       |
| Betik                     | `scripts/accounts.ts`, `scripts/lib/account-admin.ts`                                                                        | `npm run accounts -- setup` iki aile hesabını oluşturur; `npm run accounts -- reset-password <ad>` geçici parola verir, ilk girişte değiştirmeyi zorunlu kılar ve hesabın tüm oturumlarını kapatır. Geçici parola yalnızca terminalde bir kez gösterilir.                                                                                 |

### Oturum ve çerezler

- Tarayıcıda Supabase istemcisi **yoktur**; oturum çerezleri yalnızca sunucuda okunur. Bu yüzden tüm `sb-*` çerezleri `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` ile yazılır (`cookie-options.ts`). `Secure` geliştirmede de açıktır: tarayıcılar bunu `http://localhost` için kabul eder, ama yerel ağ IP'siyle (telefondan) denemek için HTTPS gerekir.
- Server Component'ler çerez yazamaz; oturum yenileme `proxy` içinde yapılır. Server Action'lar çerez yazabilen istemciyi kullanır.
- Giriş kullanıcı adıyla yapılır. Supabase Auth e-posta istediği için her kullanıcı adı `<ad>@users.lgs-pusula.invalid` adresine eşlenir. `.invalid` alan adı ayrılmıştır ve hiçbir zaman e-posta teslim edilmez; gerçek e-posta tutulmaz (karar 0.8).
- Parola kuralı: en az 10 karakter, en az bir harf ve bir rakam, en fazla 72 bayt (bcrypt sınırı). Aynı kural Supabase Auth ayarlarında da vardır.
- Parola değiştirilince kullanıcının diğer oturumları kapatılır (`signOut({ scope: "others" })`). "Tüm cihazlarda çıkış" bütün oturumları kapatır (`scope: "global"`). Kapatılan oturumun erişim belirteci süresi dolmasa bile bir sonraki istekte reddedilir, çünkü DAL ve proxy oturumu Auth sunucusuna sorar.

### Oran sınırlaması

`public.consume_rate_limit` (sabit pencere, atomik `insert … on conflict`). Kova anahtarı `kapsam:HMAC-SHA256(AUTH_SECRET, kapsam + konu)` biçimindedir; kullanıcı adı ve IP açık hâliyle saklanmaz.

| Kapsam                              | Sınır                 | Not                                                                                                                                                          |
| ----------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Giriş, IP başına                    | 15 dakikada 20 deneme | IP, Vercel'in üzerine yazdığı `x-real-ip` / `x-forwarded-for` başlığından okunur. Yerelde bu başlık taklit edilebilir; kullanıcı adı sınırı yine geçerlidir. |
| Giriş, kullanıcı adı başına         | 15 dakikada 5 deneme  | Doğru parola da bu süre içinde reddedilir. Başarılı girişte sayaç sıfırlanır.                                                                                |
| Parola değiştirme, kullanıcı başına | 15 dakikada 5 deneme  | Mevcut parolanın tahmin edilmesini sınırlar.                                                                                                                 |
| Davet kodu üretme, kullanıcı başına | 15 dakikada 10        |                                                                                                                                                              |
| Davet kodu girme, IP başına         | 15 dakikada 20        |                                                                                                                                                              |
| Davet kodu girme, kullanıcı başına  | 15 dakikada 5         | Sayaç, biçim hatasından önce düşer.                                                                                                                          |
| MFA doğrulama, kullanıcı başına     | 15 dakikada 5         |                                                                                                                                                              |

Sınırlayıcıya ulaşılamazsa istek reddedilir (fail closed). Parola sıfırlama uygulamada bir uç değildir; yalnızca kurulum betiğiyle yapılır (karar 0.8).

### Yerel geliştirme ortamı

- `npm run db:start` yerel Supabase'i Docker'da başlatır ve `supabase/migrations` içindeki migration'ları uygular. `npm run db:reset` veri tabanını sıfırlayıp migration'ları yeniden uygular. `npm run db:stop` durdurur.
- Yerel portlar 553xx aralığındadır (API `55321`, veri tabanı `55322`, Studio `55323`); aynı bilgisayardaki başka bir Supabase projesinin varsayılan 543xx portlarıyla çakışmaz.
- `supabase/config.toml` yalnızca yerel ortamı yönetir. Bulut projelerindeki Auth ayarları panelden ayrıca yapılır (aşağıda).
- Uçtan uca testler her test için kurgusal `e2e_…` hesabı oluşturur. Test yardımcıları yalnızca `127.0.0.1`/`localhost` adresindeki Supabase'e bağlanır; staging veya production'a bağlanmayı reddeder.

### Staging ve production Supabase projeleri — kurulum adımları (proje sahibi)

1. Supabase'de iki ayrı proje oluştur: `lgs-pusula-staging` ve `lgs-pusula-prod`. Bölge: **Central EU (Frankfurt)**. Production verisi hiçbir zaman staging'e kopyalanmaz.
2. Her projede **Authentication → Sign In / Providers**: "Allow new users to sign up" **kapalı**, Email sağlayıcısı **açık**, "Confirm email" **kapalı**. **Authentication → Policies (Passwords)**: en az 10 karakter, harf + rakam.
3. Migration'ları uygula: `npx supabase link --project-ref <ref>` ve ardından `npx supabase db push`. Bu işlemi önce staging'de yap.
4. Vercel ortam değişkenleri: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (projenin **Settings → API** sayfasından) ve her ortam için ayrı üretilmiş `AUTH_SECRET`. Preview'a staging, Production'a production değerleri girilir.
5. Aile hesaplarını oluştur: production değerlerini geçici olarak yerel bir dosyaya koyup `node --env-file=<dosya> scripts/accounts.ts setup` komutunu çalıştır, ardından dosyayı sil. Betik hedef adresi gösterir ve "evet" yazılmadan bir şey yapmaz.

**Uyarı:** `supabase/config.toml` bulut projesine olduğu gibi `supabase config push` ile gönderilmemelidir. Dosyada yalnızca yerel ortam için olan değerler var (giriş oran sınırı 1000). TOTP yerel ortamda da açıktır; barındırılan projelerde TOTP varsayılan olarak açık ve ücretsizdir, bu yüzden MFA için ayrıca `config push` gerekmez. Telefon MFA kapalı kalır. Auth ayarları için yalnızca gereken anahtarları içeren geçici bir yapılandırma ile önce `supabase config diff`, sonra `supabase config push` kullanılır.

### Bulut ortamlarının durumu (13 Ekim 2026)

| Ortam      | Supabase                      | Vercel                                                                                       | Durum                                                                                                                                                                                      |
| ---------- | ----------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Production | `lgs-pusula-prod` (Frankfurt) | Production değişkenleri girildi; adres `https://lgs-pusula.vercel.app` (fonksiyonlar `fra1`) | Migration uygulandı; dışarıdan kayıt kapalı (doğrulandı: `signup_disabled`); parola kuralı 10 karakter, harf + rakam; HTTPS ve güvenlik başlıkları doğrulandı; giriş Supabase'e bağlanıyor |
| Staging    | Açılmadı                      | Preview için değişken yok                                                                    | Ücretsiz planın 2 proje sınırı nedeniyle proje sahibi kararıyla ertelendi. Preview dağıtımlarında giriş "şu an kullanılamıyor" mesajı verir; production anahtarı Preview'a verilmez        |

- Önizleme dağıtım adresleri Vercel Authentication ile korunuyor (oturumsuz istek Vercel girişine yönlenir).
- Vercel projesi GitHub deposuna henüz bağlanamadı (`vercel git connect` hata veriyor). Bu yüzden push sonrası otomatik dağıtım yok; dağıtım `npx vercel deploy --prod` ile elle yapılır. Bağlantı için Vercel hesabında GitHub bağlantısı ve Vercel GitHub uygulamasının depoya erişimi gerekir.
- Aile hesapları production'da henüz oluşturulmadı (adım 5). Geçici parolalar yalnızca ekranda gösterildiği için bu adımı proje sahibi kendi bilgisayarında çalıştırır.

## Roller ve veli-öğrenci ilişkisi (Faz 4)

Yetki kuralları [AUTHORIZATION.md](../AUTHORIZATION.md) içindedir. Menüde bir bağlantıyı göstermek erişim kontrolü değildir.

| Katman   | Dosyalar                                             | Görev                                                                                                                                                                                                                                           |
| -------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Yetki    | `src/features/access/guards.ts`, `student-access.ts` | Sayfa koruması ve "bu öğrenci kaydını okuyabilir mi?" kuralı. Supabase'i bilmez.                                                                                                                                                                |
| Davet    | `src/features/family/`                               | Kod üretme (12 karakter, 4'lü gruplar, karışan harfler yok), HMAC-SHA256 özeti, kodu kullanma, onay/ret ve kaldırma. Kod ve özeti loglanmaz.                                                                                                    |
| Adaptör  | `src/services/supabase/family-store.ts`              | SQL fonksiyon çağrıları. Liste, oturum istemcisiyle RLS altında okunur; yazmalar `service_role` ile yapılır.                                                                                                                                    |
| MFA      | `src/features/auth/mfa-actions.ts`                   | Supabase Auth TOTP. Kurulum gizli anahtarı ekranda gösterilir; karekod üretilmez. Doğrulama sonrası oturum `aal2` olur ve `/yonetici`'ye gider.                                                                                                 |
| Sayfalar | `src/app/(panel)/`                                   | `/ogrenci`, `/veli`, `/veli/ogrenci/[studentId]`, `/yonetici`, `/mfa`, `/hesap`. Ortak yerleşim oturumu `<Suspense>` içinde okur ve `instant = false` ile anlık önizleme doğrulamasının dışındadır; oturum istekler arasında önbelleğe alınmaz. |

- Girişten sonra öğrenci `/ogrenci`'ye, veli (yönetici olsa da) `/veli`'ye gider. Geçici parola hâlâ `/parola-degistir`'e gider.
- Yönetici sayfası öğrenci kaydı göstermez. Yönetici rolü, veli bağlantısının verdiğinden fazla öğrenci verisi açmaz.
- Bekleyen istek 24 saat içinde yanıtlanmazsa `expired` olur (karar 0.4). Süresi dolan satırlar bir sonraki davet veya liste okumasında `expire_stale_family_links` ile güncellenir.
- Bu migration production veri tabanına proje sahibinin onayıyla 13 Ekim 2026'da uygulandı (`npx supabase db push`). Staging ertelendiği için orada henüz yok.

## Müfredat kataloğu (Faz 5)

Karar 0.6: kaynak MEB 8. sınıf programları ve LGS kapsamıdır; veriyi proje sahibi girer. Depoda gerçek kazanım verisi yoktur.

| Katman   | Dosyalar                                                            | Görev                                                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Şemalar  | `src/features/curriculum/schemas.ts`                                | Form, sunucu işlemi ve yükleme dosyası için tek doğrulama kaynağı. Yol takma adı ve `server-only` içermez; betik de doğrudan yükler.                                                                             |
| Kurallar | `catalog.ts`, `catalog-change.ts`                                   | Ağaç kurma (öğrenciye eski sürüm gösterilmez), Türkçe karaktere duyarsız arama, "kim değiştirebilir" kuralı ve denetim kaydı. Supabase'i bilmez.                                                                 |
| Adaptör  | `src/services/supabase/catalog-store.ts`                            | Okuma ve yazma **oturumdaki kullanıcı** olarak yapılır (`service_role` değil), böylece RLS ikinci savunma katmanı olur. Okuma 1000 satırlık sayfalarla yapılır (PostgREST `max_rows`).                           |
| Sayfalar | `/yonetici/mufredat`, `/yonetici/mufredat/[subjectId]`, `/ogrenci/konular` | Yönetici: ekleme, düzenleme, eski sürüm işaretleme. Öğrenci: `CurriculumPicker` ile arama (yalnızca okuma).                                                                                                     |
| Betik    | `scripts/catalog.ts`, `scripts/lib/catalog-import.ts`               | JSON dosyasından yükleme; önce plan gösterir, "evet" ister, `--dry-run` ile yazmaz.                                                                                                                              |

- **Silme yok.** Eskiyen ders, konu veya kazanım `archived_at` ile "eski sürüm" olur; geçmiş kayıtlar ona bağlı kalır. Konu başka derse, kazanım başka konuya taşınamaz (sütun yetkisi verilmedi). Ders kodu sonradan değişmez.
- **Seçici bileşeni** (`CurriculumPicker`): ders seçimi + arama + yerleşik radyo düğmeleri; klavye ve ekran okuyucu için ek kod gerekmez. Seçim gizli alanda `topic:<id>` veya `outcome:<id>` olarak tutulur. Faz 6'daki günlük kayıt formu bunu kullanacak; sunucu, seçilen kaydın var olduğunu ve eski sürüm olmadığını ayrıca doğrulamalıdır.

### Katalog dosyası biçimi

```json
{
  "example": false,
  "source": { "name": "MEB 8. sınıf öğretim programları", "version": "2025-2026" },
  "subjects": [
    {
      "code": "matematik",
      "name": "Matematik",
      "sortOrder": 2,
      "topics": [
        {
          "name": "Konu adı",
          "outcomes": [{ "code": "M.8.1.1.1", "description": "Kazanım metni" }]
        }
      ]
    }
  ]
}
```

- Bir dosyadaki her satır aynı kaynak adı ve sürümünü alır. `sortOrder` verilmezse dosyadaki sıra kullanılır.
- Eşleştirme anahtarları: ders `code`; konu (ders, ad, kaynak sürümü); kazanım (`code`, kaynak sürümü). Aynı dosyayı tekrar yüklemek yeni satır eklemez. Yeni kaynak sürümü yeni konu/kazanım satırları ekler; eskileri yöneticide "eski sürüm" yapılır.
- Var olan bir kazanım dosyada başka bir konunun altındaysa yükleme hiçbir şey yazmadan durur.
- Bilinmeyen alanlar, tekrar eden kodlar ve 2 MB'tan büyük dosyalar reddedilir. `"example": true` dosyalar yalnızca yerel Supabase'e yüklenir.
- Satırlar tek tek yazılır; ağ hatasında yükleme yarıda kalabilir. Aynı dosyayı yeniden çalıştırmak tamamlar.

### Henüz uygulanmayanlar

- Bitmiş bağlantı, `audit_events` ve süresi dolan oran sınırı kayıtlarının saklama süresine göre otomatik silinmesi (karar 0.5: 1 yıl). Silme işi Faz 12'deki yedekleme betikleriyle birlikte planlanacak.
- Gerçek müfredat verisi (proje sahibi yükleyecek), net hesaplama kuralları, hedefler, günlük kayıt ve deneme formları.
- Koçluk motoru, yapay zekâ adaptörü, karakter puanları, bildirimler, içe aktarma, PDF/DOCX raporlar.
- PWA manifesti ve simgeler, nonce tabanlı CSP, hata izleme.
- Staging Supabase projesi, Preview ortam değişkenleri ve Vercel–GitHub bağlantısı (durum yukarıda).
