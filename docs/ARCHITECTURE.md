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
| Güvenlik başlıkları | `src/lib/security-headers.ts` her yanıtta nosniff, çerçeveleme yasağı, referrer, izin politikası ve HSTS gönderir. Betik/stil CSP'si istek başına nonce ile `src/proxy.ts` içindedir (Faz 12). |
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

### Bulut ortamlarının durumu

| Ortam      | Supabase                      | Vercel                                                                                       | Durum                                                                                                                                                                                      |
| ---------- | ----------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Production | `lgs-pusula-prod` (Frankfurt) | Production değişkenleri girildi; adres `https://lgs-pusula.vercel.app` (fonksiyonlar `fra1`) | Bu uygulamanın tek bulut veri tabanı. 22 Ekim 2026: dokuz migration yerel listeyle aynı. Kayıt kapalı; parola kuralı 10 karakter, harf + rakam. Yerel `config.toml` basılmadı |
| Staging    | Ayrı proje yok. Önizleme `lgs-pusula-prod` kullanır | Preview değişkenleri girildi (`APP_ENV=staging`). `AUTH_SECRET` production'dan ayrı. GitHub bağlı | Proje sahibi kararı, 22 Ekim 2026. İkinci ücretsiz yer `velitakipnew` ve duraklatılmaz. Önizleme, production ile aynı veritabanına yazar. Kalıcı staging dalı henüz yok |

- Önizleme dağıtım adresleri Vercel Authentication ile korunuyor (oturumsuz istek Vercel girişine yönlenir).
- Vercel projesi 22 Ekim 2026'da `nurgung/lgsPusula` deposuna bağlandı (`vercel git connect` → Connected). Bağlama komutu yeni bir dağıtım başlatmadı. Sıradaki GitHub push'u dağıtımı dener.
- Aile hesapları production'da 23 Ekim 2026'da oluşturuldu. Geçici parolalar belgede tutulmaz. İlk girişte parola değişimi zorunludur.

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

Karar 0.6: kaynak MEB 8. sınıf programları ve LGS kapsamıdır; veriyi proje sahibi girer. Gerçek katalog `data/catalog/meb-8-sinif-2026-2027.json`, kurgusal örnek `data/catalog/ornek-katalog.json` dosyasındadır.

| Katman   | Dosyalar                                                                   | Görev                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Şemalar  | `src/features/curriculum/schemas.ts`                                       | Form, sunucu işlemi ve yükleme dosyası için tek doğrulama kaynağı. Yol takma adı ve `server-only` içermez; betik de doğrudan yükler.                                                   |
| Kurallar | `catalog.ts`, `catalog-change.ts`                                          | Ağaç kurma (öğrenciye eski sürüm gösterilmez), Türkçe karaktere duyarsız arama, "kim değiştirebilir" kuralı ve denetim kaydı. Supabase'i bilmez.                                       |
| Adaptör  | `src/services/supabase/catalog-store.ts`                                   | Okuma ve yazma **oturumdaki kullanıcı** olarak yapılır (`service_role` değil), böylece RLS ikinci savunma katmanı olur. Okuma 1000 satırlık sayfalarla yapılır (PostgREST `max_rows`). |
| Sayfalar | `/yonetici/mufredat`, `/yonetici/mufredat/[subjectId]`, `/ogrenci/konular` | Yönetici: ekleme, düzenleme, eski sürüm işaretleme. Öğrenci: `CurriculumPicker` ile arama (yalnızca okuma).                                                                            |
| Betik    | `scripts/catalog.ts`, `scripts/lib/catalog-import.ts`                      | JSON dosyasından yükleme; önce plan gösterir, "evet" ister, `--dry-run` ile yazmaz.                                                                                                    |

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

### 2026-2027 katalog dosyası (`meb-8-sinif-2026-2027.json`)

2026-2027'de 8. sınıfta Türkiye Yüzyılı Maarif Modeli değil, önceki programlar uygulanır (MEB TEGM, Eylül 2026); 2027 LGS bu programların kazanımlarını esas alır. Kazanım metinleri `mufredat.meb.gov.tr` üzerindeki resmî PDF'lerden alındı (14 Ekim 2026):

| Ders                                | Program (PID)                      | Konu düzeyi                    | Kazanım |
| ----------------------------------- | ---------------------------------- | ------------------------------ | ------- |
| Türkçe                              | Türkçe 1-8, 2019 (663)             | Dil becerisi (dinleme … yazma) | 76      |
| Matematik                           | Matematik 1-8, 2018 (329)          | Alt öğrenme alanı (M.8.x.y)    | 52      |
| Fen Bilimleri                       | Fen Bilimleri 3-8, 2018 (325)      | Ünite (F.8.x)                  | 61      |
| T.C. İnkılap Tarihi ve Atatürkçülük | İnkılap Tarihi 8, 2018 (355)       | Ünite                          | 39      |
| Din Kültürü ve Ahlak Bilgisi        | DKAB 4-8, 2018, 2022 baskısı (318) | Ünite                          | 28      |
| Yabancı Dil (İngilizce)             | İngilizce 2-8, 2018 (327)          | Ünite (Unit 1–10)              | 70      |

- Sayılar programların ünite/kazanım tablolarıyla aynıdır ve birim testle korunur. Matematik konuları programdaki ders sırasıyla dizildi.
- Kod uyarlamaları (kod alanı yalnızca ASCII kabul eder): `İTA.8.1.1` → `ITA.8.1.1`; Din Kültürü kodları ders öneki almadığı için `8.1.1` → `DKAB.8.1.1`. Diğer kodlar programdaki gibidir.
- Metin düzeltmeleri yalnızca PDF'ten çıkarma hatalarıdır (kaybolan √ işareti, bölünmüş kelimeler) ve `F.8.7.3.2`'deki "Elektirik" yazım hatası. İngilizce kazanımlar programdaki gibi İngilizcedir. Açıklama satırları (a, b, c…) alınmadı.
- MEB yeni bir 8. sınıf programı veya LGS kapsam değişikliği yayımlarsa yeni sürümlü bir dosya hazırlanır; eski kazanımlar yöneticide "eski sürüm" yapılır.

## Günlük çalışma ve hedefler (Faz 6)

Öğrenci kendi çalışmasını kaydeder ve hedefini seçer. Veli, aktif bağlantısı varsa bunları okur; yazamaz. Yönetici rolü ek erişim vermez.

| Katman | Dosyalar | Görev |
| --- | --- | --- |
| Takvim | `src/features/study/calendar.ts` | Europe/Istanbul sivil günü, pazartesi başlangıçlı hafta, karşılaştırma aralıkları. |
| Kurallar | `schemas.ts`, `placement.ts`, `summary.ts`, `commit-log.ts`, `access.ts` | Soru sayısı kuralları, katalog yerleşimi, özet, tek gönderim, kim yazabilir. Supabase'i bilmez. |
| Adaptör | `src/services/supabase/study-store.ts` | Okuma ve yazma oturumdaki kullanıcı olarak yapılır, böylece RLS ikinci savunma katmanı olur. |
| Sayfalar | `/ogrenci`, `/ogrenci/calisma`, `/ogrenci/calisma/yeni`, `/ogrenci/calisma/[logId]`, `/ogrenci/hedefler`, `/veli/ogrenci/[studentId]` | Hızlı kayıt, ayrıntılı form, düzenleme/silme, hedef, iki aralığın karşılaştırması. Veli ekranı salt okunur. |

- **Gün.** `studied_on` öğrencinin seçtiği İstanbul takvim günüdür. Varsayılan bugündür. İleri tarih ve 1 Eylül 2024'ten eski tarih hem şemada hem tetikleyicide reddedilir. Hesap `Europe/Istanbul` kuşağıyla yapılır; bugün bu kuşak UTC+3 olduğu için gece yarısı 21:00 UTC'dir.
- **Sayılar.** Doğru, yanlış ve boş eksi olamaz; toplamları soru sayısına eşittir. Bir kayıtta en az 1, en fazla 500 soru vardır. Süre 0–1440 dakikadır. Ölçülmemiş süre 0 yazılabilir.
- **Konu.** İsteğe bağlıdır. Seçilen konu veya kazanım dersle eşleşmeli ve yeni seçimde eski sürüm olmamalıdır. Kayıt zaten eski bir sürüme bağlıysa, sayılar değişirken o bağ kalabilir.
- **Tek gönderim.** Form, sayfa açılınca bir `request_id` üretir. Aynı kimlik ve aynı içerik ikinci kez gelirse yeni satır açılmaz. İçerik farklıysa kayıt reddedilir; sessizce üzerine yazılmaz.
- **Hedef.** Birimi soru sayısıdır, dakika değil. Günlük hedef o İstanbul gününü, haftalık hedef pazartesiden pazara kadar olan günleri sayar. `subject_id` boşsa tüm dersler birlikte sayılır. Aynı dönem ve ders yeniden kaydedilince satır güncellenir. İlerleme çubuğunun yanında tarih aralığı ve "soru" birimi yazılır.
- **Karşılaştırma.** Varsayılan, bu haftanın bugüne kadarki günleri ile bir önceki tam haftadır. Aralıklar ve birim (soru ve dakika) ekranda yazılıdır. Özel aralık en fazla 370 gündür ve bugünden ileri gidemez.
- **Veli.** Bağlı öğrencinin bu haftaki kayıtlarını ve hedeflerini görür. Değiştiremez. Haftalık ve aylık özet ile PDF, aşağıdaki Faz 11 bölümündedir.
- Bu migration yerelde uygulandı. Production'a proje sahibinin onayıyla 19 Ekim 2026'da uygulandı (`npx supabase db push`; önce `--dry-run`). Yeni tablolardır; mevcut satırlar değişmedi. Staging ertelendiği için orada henüz yoktur.

## Deneme sınavları ve net hesabı (Faz 7)

Öğrenci deneme sonucunu girer; net tek fonksiyonda hesaplanır (karar 0.7). Veli aktif bağlantıyla okur; yazamaz. Yönetici rolü ek erişim vermez.

| Katman | Dosyalar | Görev |
| --- | --- | --- |
| Kural | `src/features/exams/net-rules.ts` | `lgs-v1` dağılımı ve net = doğru − (yanlış ÷ 3); ders neti eksi olabilir, toplam net eksiyse 0. |
| Kurallar | `schemas.ts`, `commit-exam.ts`, `access.ts` | Form doğrulama, tek gönderim, kim yazabilir. Supabase'i bilmez. |
| Adaptör | `src/services/supabase/exam-store.ts` | Okuma/yazma oturumdaki kullanıcıyla; düzenlemede ders satırları silinip yeniden yazılır ve net yeniden hesaplanır. |
| Sayfalar | `/ogrenci/denemeler`, `/yeni`, `/[examId]`, `/veli/ogrenci/[studentId]` | Liste (mobil kart), oluşturma, detay tablosu + düzenleme. Veli salt okunur. |

- **Türler.** `lgs_full` (6 ders, toplam 90 soru) ve `branch` (tek ders, 1–100 soru). Soru sayıları yalnızca `net-rules.ts` içindedir.
- **Kural sürümü.** Her denemede `rule_version` saklanır (şimdilik `lgs-v1`). Düzenleme eski sürümü korur.
- **Tarih.** `taken_on` İstanbul sivil günüdür; ileri tarih ve 1 Eylül 2024'ten eski tarih reddedilir.
- **Tek gönderim.** Form bir `request_id` üretir; aynı kimlik + aynı içerik ikinci satır açmaz.
- **Menü.** Öğrenci alt gezinmesinde Denemeler, Konular'ın yerini alır (5 öğe sınırı). `/ogrenci/konular` adresi durur.
- Migration: `20261019160000_exams.sql`. Yerelde ve production'da uygulandı (20 Ekim 2026). Staging ertelendiği için orada henüz yoktur.

## Kazanım analizi ve grafikler (Faz 8)

Öğrenci yanlış/boş soruları kazanıma elle bağlar. Öncelik yalnızca bağlanan satırlardan hesaplanır. Denemeler arası net grafiği her zaman tablo alternatifiyle birlikte gösterilir.

| Katman | Dosyalar | Görev |
| --- | --- | --- |
| Kural | `src/features/outcomes/prioritize.ts` | `outcome-priority-v1`: yanlış 2, boş 1; bağlanmamış satırdan sıralama üretilmez. |
| Kurallar | `schemas.ts`, `access.ts` | Eşleştirme doğrulama, yetki. Supabase'i bilmez. |
| Adaptör | `src/services/supabase/mistake-store.ts` | Okuma/yazma oturumdaki kullanıcıyla; deneme düzenlemede ders satırları yerinde güncellenir (`exam-store`). |
| Grafik | `components/net-trend-chart.tsx` | Yerleşik SVG çubuk grafik + aynı verinin tablosu. Üçüncü taraf grafik paketi yok (tek seri; tablo zaten zorunlu). |
| Sayfalar | `/ogrenci/denemeler/[examId]/kazanimlar`, `/ogrenci/kazanimlar`, `/ogrenci/denemeler/gelisim` | Eşleştirme, öncelik listesi, net değişimi. |

- **Kaynak / güven.** Faz 8 yalnızca `manual` / `high` yazar. İleride içe aktarma veya yapay zekâ ayrı kaynak ve güven düzeyleri ekleyebilir.
- **Boş durum.** Eşleştirme yoksa öncelik listesi “tespit yapılmış” gibi davranmaz. Net grafiği için en az iki deneme gerekir.
- **Pencere.** Kazanım önceliği 90 gün (Europe/Istanbul, bugün dahil). Net grafiği, deneme girilebilen en erken günden (`STUDY_DATE_MIN`, 1 Eylül 2024) bugüne bakar; böylece 90 günden eski bir deneme grafikten düşmez.
- Migration: `20261020120000_exam_mistakes.sql`. Yerelde ve production'da uygulandı (20 Ekim 2026). Staging ertelendiği için orada henüz yoktur.

## Kural tabanlı koçluk (Faz 9)

Öğrenci ana sayfası her istekte tek bir öneri üretir. Öneri cümlesi yazılmaz; neden ve kanıt, sonuç nesnesinde durur. Böylece eski bir cümle yeni kaydın önüne geçmez. Öğrenci karttaki soru sayısını bitirince yalnızca o kazanım için bir tamamlanma satırı yazılır.

| Katman | Dosyalar | Görev |
| --- | --- | --- |
| Metrik | `src/features/coaching/metrics.ts` | Hedef tamamlama, ders doğruluğu, tam LGS net farkı, tekrar kazanımları. |
| Kural | `src/features/coaching/rules.ts` | `coaching-v1`. İlk uyan kural tek kart olur. Supabase'i bilmez. |
| Metin | `messages.ts` | Gözden geçirilmiş cümleler. Utandırma, korkutma ve kıyas yok. |
| Adaptör | `load-coaching.ts`, `actions.ts`, `coaching-store.ts` | Oturum istemcisiyle kayıtları ve tamamlanma satırlarını okur. Yazma yalnızca öğrencinin gördüğü kazanımı işaretler. |
| Sayfa | `/ogrenci` | `RecommendationCard`: kısa öneri, gerekçe, sıradaki işlem. Kanıt "Neden bu öneri?" içindedir. Varsa sade anlatım ayrıdır. |

- **Sıra.** Bağlı kazanım, sonra düşük doğru sayısı, sonra son iki tam LGS netinin azalması, sonra bugünkü hedefin kalanı, sonra hedef daveti. Hiçbiri uymazsa kart sonuç çıkarmaz.
- **Örneklem.** Bir derste 14 günde 10 sorudan az kayıt varsa doğru oranı saklanmaz ve söylenmez. Oran, doğru ÷ soru yarının altındaysa o ders önerilir. Tam yarı sorun sayılmaz.
- **Deneme.** Yalnızca son iki `lgs_full` karşılaştırılır. Branş denemeleri karışmaz. Hangi dersin neti değiştiği bu kartta söylenmez. Pencere 90 gündür.
- **Kazanım.** `outcome-priority-v1` ile aynı 90 gün. Bağlanmamış yanlıştan kazanım adı üretilmez. Soru sayısı, o kazanıma bağlı yanlış ve boşların toplamıdır. Tamamlandı, sunucunun o anda seçtiği kazanımı ve sayıyı yazar; formdaki başka bir kazanım kimliği kabul edilmez. Kayıtlı sayı, güncel bağlı soru sayısından azsa aynı kazanım yeniden açılır. Puan yazılmaz. Veli aynı sıradaki kazanımı okur; düğmeyi görmez ve yazamaz.
- **Hedef.** Kart yalnızca günlük hedefi kullanır. Haftalık hedef ana sayfadaki hedef kartında kalır. Birim soru. Gün sınırı Europe/Istanbul.
- **Yetki.** Öğrenci kimliği oturumdan gelir. Aynı kart, öğrencinin işlem bağlantısı olmadan veli sayfasında da gösterilir (Faz 11). Yönetici rolü ek erişim vermez. Tamamlanma tablosu `coaching_practice_completions`; veli yalnızca aktif bağlantıyla okur.
- **Durumlar.** Sayfa yüklenirken mevcut `Suspense` metni görünür. Kural uymazsa gerekçe ilk görünümde durur. Okuma hatası sayfa hata durumuna düşer.

## Karakter, görev ve bildirimler (Faz 10)

Öğrenci bir hayvan veya bitki seçer. Puan sunucuda, `mascot-v1` ile ve yalnızca bir kez yazılır. Hatırlatma e-posta değildir; sınav sonucu içermez.

| Katman | Dosyalar | Görev |
| --- | --- | --- |
| Kural | `constants.ts`, `rules.ts`, `notices.ts`, `messages.ts` | Aşama, rozet, görev, sessiz saat ve yasak ifade. Supabase'i bilmez. |
| Adaptör | `src/services/supabase/mascot-store.ts` | Okuma ve tür/ayar yazması oturumdaki kullanıcıyla. Puan ve hatırlatma satırı SQL fonksiyonundan gelir. |
| Sayfalar | `/ogrenci`, `/ogrenci/karakter`, `/ogrenci/bildirimler`, `/veli/ogrenci/[studentId]` | Seçim, puan, görev, hatırlatma ayarı. Veli karakteri salt okur; hatırlatmayı görmez. |

- **Puan.** Çalışma kaydı 5, bugünkü tüm dersler hedefi 10, deneme kaydı 5, kazanım eşleştirmesi 8. Anahtar `study_log:{id}`, `daily_goal:{tarih}`, `exam:{id}`, `outcome_review:{id}`. İkinci çağrı 0 yeni satır döner.
- **Aşama.** 0 Yeni arkadaş, 10 Alışıyor, 30 Birlikte büyüyor, 60 Yol arkadaşı. Toplam düşmediği için aşama geri gitmez. Bir gün boş kalmak satır silmez.
- **Görev.** Bugün kayıt, varsa tüm dersler günlük hedefi, varsa bağlanmamış bir deneme. Görev ayrı puan yazmaz; puan kaynak olaydadır.
- **Rozet.** İlk kayıt, hedef, üç farklı gün, kazanım, deneme kaydı. Üç gün sayacı aradaki boş günde silinmez. Rozet metni sonuç sayısını söylemez.
- **Hatırlatma.** Varsayılan açık, sessiz saat 21:00–08:00 (İstanbul), günde en fazla 1. Eşit saat sessiz saati kapatır. Cümle sabittir: bugün kayıt yoksa nazik bir davet. Kapalı, sessiz saat, kayıt veya sınır varken görünmez.
- **Menü.** Alt çubuk 5 öğeyle dolu olduğu için karakter ve hatırlatma ana sayfadan açılır. Adresler durur.
- Migration: `20261020140000_mascot.sql`. Yerelde ve production'da uygulandı (20 Ekim 2026, `npx supabase db push`; önce `--dry-run`). Yeni tablolardır; mevcut satırlar değişmedi. Staging ertelendiği için orada henüz yoktur.

## Veli paneli ve PDF rapor (Faz 11)

Veli, aktif bağlantısındaki öğrencinin haftalık ve aylık özetini okur. Haftalık PDF'i sunucu üretir. Aylık PDF yoktur. Öğrenci rapor isteyemez ve indiremez. Yönetici rolü, aktif veli bağlantısı olmadan rapor açmaz.

| Katman | Dosyalar | Görev |
| --- | --- | --- |
| Dönem | `src/features/reports/periods.ts` | İstanbul haftası ve ayı. Form yalnızca `current` veya `previous` gönderir. |
| Belge | `document.ts`, `layout.ts`, `pdf.ts` | Metin blokları, sayfa kırılması, gömülü Nunito ile PDF. Diske yazılmaz. |
| Yetki | `access.ts` | `canRequestReport` ve `canDownloadReport`. Supabase'i bilmez. |
| Adaptör | `src/services/supabase/report-store.ts` | Yazma `service_role` ile, aktif bağlantı kontrolünden sonra. Okuma da öyle; indirme yeniden kontrol edilir. |
| Sayfalar | `/veli`, `/veli/ogrenci/[studentId]`, `GET /veli/rapor/[jobId]` | Özet, indirme formu, dosya veya Türkçe ret sayfası. |

- **Dönem.** Bu hafta pazartesiden bugüne kadardır ve bitmediği yazılır. Geçen hafta bir önceki tam pazartesi–pazardır. Bu ay ayın birinden bugüne, geçen ay bir önceki tam takvim ayıdır. Aralık ve birim (soru, dakika, net) ekranda ve PDF'te yazılıdır.
- **PDF.** `pdf-lib` 1.17.1 ve `@pdf-lib/fontkit` 1.1.1. Standart PDF yazı tipleri ğ, ş, ı ve İ çizemez. Nunito Regular/Bold (latin ve latin-ext, SIL OFL) `src/features/reports/fonts` altındadır. ESM paketi yalnızca varsayılan dışa aktarımı verdiği için yükleyici her iki şekli de kabul eder. Üretim tarihi İstanbul saatidir. Net formülü `Net = doğru - (yanlış / 3)` diye yazılır. Koçluk cümlesi öğrencinin kartındaki metindir; veliye kaydı yalnızca öğrencinin değiştirebileceği söylenir.
- **Dosya.** Baytlar `report_jobs.pdf_bytes` içindedir (`storage_kind = database`). Hazır dosya `%PDF-` ile başlar, 400 ile 1.500.000 bayt arasındadır. Başarısız satırda bayt yoktur; `failure_code` `generation_failed` veya `empty_document` olur. İndirme `application/pdf` ve `attachment` döner. Ret sayfası HTML'dir, ek yoktur ve `%PDF` içermez.
- **Tekrar.** Aynı veli, öğrenci, tür ve dönem yeniden üretilirse satır güncellenir ve 24 saat yeniden başlar. Veli 15 dakikada en fazla 8 rapor ister. Denetim olayı `report.generate` neden kodunu yazar; PDF içeriğini, adı ve öğrenci kimliğini yazmaz.
- **Silme.** `purge_expired_report_jobs()` veli ana sayfası, öğrenci sayfası ve indirme isteğinde çalışır. `purge_retained_rows()` buna ek olarak süresi dolmuş raporları, 1 yıllık denetim ve bitmiş bağlantı satırlarını, 7 günden eski davetleri ve 1 günden eski oran sınırı pencerelerini siler. Bunu `npm run data -- retain` çalıştırır. Kimse çalıştırmazsa satırlar sürelerini aşabilir. Fonksiyon production'da var (21 Ekim 2026); bu turda çalıştırılmadı.
- **Route.** `instant = false` ve `connection()` ile indirme adresi oturumsuz önbelleğe alınmaz. Aksi halde herkese `/giris` yönlendirmesi yapışırdı.
- Migration: `20261021120000_report_jobs.sql`. Yerelde ve production'da uygulandı (21 Ekim 2026, `npx supabase db push`; önce `--dry-run`). Yeni tablodur; mevcut satırlar değişmedi. Staging ertelendiği için orada henüz yoktur.

## Yayın hazırlığı (Faz 12)

Kök yerleşim her istekte `connection()` bekler. Böylece HTML, o isteğin nonce'u ile üretilir. `cacheComponents` açık kalır; oturum sayfaları yine dinamiktir.

| Konu | Karar |
| --- | --- |
| PWA | `src/app/manifest.ts`, `public/icons`. Hesap sayfası Android ve iPhone ekleme adımlarını yazar. Chromium `beforeinstallprompt` verirse üstte "Ekle" çıkar. |
| Çevrimdışı | `public/sw.js` yalnızca `/cevrimdisi` ve simgeleri önbelleğe alır. Gezinme ağdadır; ağ yoksa statik çevrimdışı sayfa gelir. Çalışma, deneme ve hesap HTML'i Cache API'ye yazılmaz. Kayıt sırasında geliştirme ortamında işçi kaydı yapılmaz. |
| CSP | Production: nonce + `strict-dynamic`, `style-src-attr 'none'`, `upgrade-insecure-requests`. Geliştirme: React için `unsafe-eval` ve `unsafe-inline`. İlerleme çubuğu 5'er puanlık sınıflar kullanır; satır içi `style` yoktur. |
| Hata izleme | `SENTRY_DSN` boşsa gönderim yoktur. Doluysa yalnızca `o*.ingest.de.sentry.io` kabul edilir. Gövde digest ve temizlenmiş metindir; kullanıcı, çerez ve istek yoktur. Oturum tekrarı kodda yoktur. Production: kuruluş `lgs-pusula`, bölge `de`, plan Developer (30 gün), proje `lgs-pusula-sj`. DSN gizli değişkendir. İstemci anahtarında replay kapalıdır. |
| Saklama | `purge_retained_rows()` ve `erase_personal_data()` (`20261021160000_retention.sql`). İkisi de yalnızca `service_role`. Silme müfredatı silmez. Betik onay istemeden çağırmaz. Production'a 21 Ekim 2026'da uygulandı; fonksiyonlar çağrılmadı. |
| Yedek | `npm run backup -- dump` şifreli dosyayı `backups/` altına yazar. AES-256-GCM, parola diske yazılmaz. Düz metin yedek tutulmaz. Saklama 30 gündür; eski dosyayı proje sahibi siler. |
| Dışa aktarma | `npm run data -- export`. Davet özeti, PDF baytı ve oran sınırı anahtarı yoktur. Dosya depoya girmez. |

**Yerel deneme (21 Ekim 2026):** şifreli yedek alınıp aynı tabloya geri yüklendi. Çevrimdışı gezinme giriş formunu değil, "İnternet yok" sayfasını açtı. Production CSP'de `unsafe-eval` yok ve betik nonce'u başlıkla aynıydı.

**Gerçek telefonda bakılacaklar (12.6, henüz yapılmadı):**

1. Öğrenci girişi, bir çalışma kaydı, bir deneme.
2. Veli bağlantısı: kod, onay, veli özeti, PDF.
3. Ana ekrana ekleme ve uçak modunda eski kaydın açılmaması.
4. 320 px genişlikte yatay taşma olmaması.

### Henüz uygulanmayanlar

- Saklama temizliği için zamanlanmış görev. Fonksiyon production'da var. Kimse `npm run data -- retain` çalıştırmazsa satırlar sürelerini aşabilir.
- Faz 12 kodunun production'a dağıtılması. `SENTRY_DSN` Vercel'de durur; canlı sürüm bu kodu içermediği için henüz olay göndermez.
- Kalıcı staging dalı ve o adresin HTTPS kontrolü (2.8.3.c). GitHub bağlantısı 22 Ekim 2026'da kuruldu.

## Yapay zekâ, içe aktarma ve Word raporu (Faz 13)

Karar 0.12, 22 Ekim 2026'da yeniden bakıldı. İstek yalnızca `https://api.groq.com/openai/v1/chat/completions` adresine gider. Proje sahibi aynı gün kuruluş için sıfır saklamayı açtı. `AI_ZDR_CONFIRMED` ve `AI_ENABLED` production ile yerelde açıktır. `AI_API_KEY` yerel dosyada ve Vercel Production gizli değişkenindedir; depoda yoktur. Anahtar, sağlayıcı ve sıfır saklama onayı birlikte olmadan istek gitmez. Gövde kural kartının kısa özetidir; hesap kimliği, ad ve e-posta çıkarılır. Model yanıtında `text` dışında bir alan varsa cümle gösterilmez. Kural kartı değişmez. Günlük tavan `consume_ai_request` ile sayılır.

İçe aktarma `/ogrenci/ice-aktar` üzerindedir. Öğrenci kimliği oturumdandır. CSV ve xlsx 500 KB ve 100 satırla sınırlıdır. Formül hücresi reddedilir. PDF modele gitmez; metin katmanındaki `tarih:` satırları okunur, yoksa satır uydurulmaz. Kayıt, önizlemeden sonra `confirm=evet` ile yazılır. Aynı satır aynı `request_id` üretir.

Word raporu PDF ile aynı bloklardandır. Dosya `report_jobs` tablosuna yazılmaz; veli bağlantısı kontrol edildikten sonra tarayıcıya iner. Production migration `20261022100000_ai_preferences.sql` henüz gönderilmedi.

## Öğrenci ana sayfa görünümü (Faz 14)

`/ogrenci` dört banttır: aşama yolu, bugünün hedefleri, ders karoları, özet. `lg` altında bantlar alt alta iner; geniş ekranda hedefler ve dersler yan yanadır. Menü `getNavItems` ile aynı kalır. Hızlı kayıt kartı kalkmıştır. Ders karosu `/ogrenci/calisma/yeni?ders=<ders kimliği>` adresine gider; kimlik katalogda yoksa form dersi boş açar. Kutuda bu haftanın soru sayısı ve varsa o derse ait hedef vardır; yüzde veya sıralama üretilmez. Haftalık toplam özette kalır. Koçluk kanıtı "Neden bu öneri?" içindedir. Sayfa zemini nötrdür; kartlar yüzey rengindedir.

Kutlama penceresi yeni bir tablo açmaz. Kayıt, deneme veya kazanım yazısı hedefi, rozeti ya da aşamayı ilk kez geçirirse adreste imzalı `kutlama` işareti durur. Kazanım önerisindeki Tamamlandı ayrıdır: puan yazmaz, aşama penceresini açmaz ve adreste imzalı `alkis` işaretiyle kısa bir alkış penceresi gösterir. İmza `AUTH_SECRET` ile doğrulanır, 15 dakika yaşar ve cümleyi taşımaz. Aşama penceresinin cümlesi, pencere açılırken öğrencinin kendi satırlarından kurulur. Alkış cümlesi kodda sabittir. "Tamam" ve Esc işareti siler. Aynı gün sayfayı işaretsiz yenilemek pencereyi açmaz. Hedef yoksa veya henüz dolmamışsa hedef cümlesi çıkmaz. Boş gün aşamayı geri götürmez. Konfeti ve durak hareketi yalnızca `prefers-reduced-motion: no-preference` iken çalışır.
