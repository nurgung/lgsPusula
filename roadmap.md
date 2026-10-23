# LGS Pusula — Yol Haritası

## Nasıl kullanılır

- Fazlar sırayla uygulanır. Bir faz bitmeden sonrakine geçilmez; proje sahibi onay vermeden yeni faza başlanmaz.
- `[x]` yapıldı ve doğrulandı, `[ ]` yapılmadı. Kutucuk yalnızca iş yapılıp ilgili test/kontrol **çalıştırıldıktan** sonra işaretlenir.
- Her fazın sonunda "Bitti sayılması için" maddelerinin hepsi işaretli olmalıdır.
- Faz 1–12 MVP'yi oluşturur. Faz 13 MVP sonrasıdır.
- Bu dosyanın asıl kopyası GitHub deposundadır (`nurgung/lgsPusula`).

## Durum özeti

| Faz | Konu | Durum |
|---|---|---|
| 0 | Ürün ve servis kararları | Tamamlandı — 13/13 karar verildi ([docs/DECISIONS.md](docs/DECISIONS.md)) |
| 1 | Proje altyapısı | Tamamlandı |
| 2 | Tasarım sistemi ve CI | Devam ediyor — Vercel production `https://lgs-pusula.vercel.app` açık. Preview `lgs-pusula-prod` kullanıyor. GitHub bağlantısı 22 Ekim 2026'da kuruldu. `braces` yaması ve kalıcı staging adresi bekliyor |
| 3 | Veri tabanı ve kimlik doğrulama | Devam ediyor — bulut veri tabanı `lgs-pusula-prod`. Ayrı staging projesi yok; önizleme aynı projeyi kullanır (22 Ekim 2026). Production aile hesapları 23 Ekim 2026'da oluşturuldu; ilk girişte parola değişimi duruyor |
| 4 | Roller ve veli-öğrenci ilişkisi | Tamamlandı — yerel testler ve CI geçti; migration production'a uygulandı (13 Ekim 2026) |
| 5 | Müfredat kataloğu | Tamamlandı — kod, yerel testler ve CI tamam; migration ve MEB 8. sınıf kataloğu (326 kazanım) production'da (14 Ekim 2026) |
| 6 | Günlük çalışma kayıtları ve hedefler | Tamamlandı — kod, yerel testler ve CI; migration production'a uygulandı (19 Ekim 2026) |
| 7 | Deneme sınavları ve net hesabı | Tamamlandı — kod, yerel testler ve CI; migration production'a uygulandı (20 Ekim 2026) |
| 8 | Kazanım analizi ve grafikler | Tamamlandı — kod, yerel testler ve CI; migration production'a uygulandı (20 Ekim 2026) |
| 9 | Kural tabanlı koçluk | Tamamlandı — kod, birim testler ve uçtan uca kart; öneri tablosu yok (20 Ekim 2026) |
| 10 | Karakter, görev ve bildirimler | Tamamlandı — kod ve yerel testler; migration production'a uygulandı (20 Ekim 2026). Tüm uçtan uca paket bu turda yeniden çalıştırılmadı |
| 11 | Veli paneli ve PDF rapor | Tamamlandı — kod, yerel testler ve production migration (21 Ekim 2026). Tüm uçtan uca paket bu turda yeniden çalıştırılmadı |
| 12 | PWA, erişilebilirlik ve yayın hazırlığı | Devam ediyor — PWA, çevrimdışı sınır, nonce CSP, yedek ve saklama migration'ı doğrulandı. Sentry AB projesi ve `SENTRY_DSN` Production'da (21 Ekim 2026). Gerçek cihaz ve Gitleaks bekliyor |
| 13 | MVP sonrası: yapay zekâ, içe aktarma, DOCX | Devam ediyor — sıfır saklama açık, `AI_ENABLED=true`. Groq anahtarı yerelde ve Vercel Production gizli değişkeninde; depoda yok. Production migration bekliyor |

---

## Faz 0 — Ürün ve servis kararları

**Amaç:** Geliştirmeyi engelleyen kararları vermek. Kod yazılmaz.
**Not:** Her kararın hangi fazdan önce gerektiği parantez içinde yazılıdır.

**Kararlar:** [docs/DECISIONS.md](docs/DECISIONS.md)
**Kapsam:** Uygulamayı yalnızca proje sahibi (veli + yönetici) ve çocuğu (öğrenci) kullanır (0.13). Bu nedenle sonraki fazlarda bazı maddeler "kapsam dışı (0.13)" olarak çizildi; kullanım aile dışına açılırsa geri gelirler.

- [x] 0.13 Kullanım kapsamını belirle — yalnızca aile içi; herkese açık kayıt yok, veli hesabı aynı zamanda yönetici (MFA zorunlu), veli yalnızca okur
- [x] 0.1 Veri tabanı ve kimlik doğrulama sağlayıcısını seç: Supabase veya alternatif *(Faz 3'ten önce)* — Supabase, AB bölgesi, ücretsiz plan
- [x] 0.2 Barındırma platformunu ve staging/production ayrımını belirle *(Faz 2'den önce)* — Vercel Hobby; önizleme/staging ve production ayrı
- [x] 0.3 Öğrenci, veli ve yönetici kullanıcı akışlarını yaz *(Faz 4'ten önce)*
  - [x] 0.3.1 Akış taslaklarını aile kullanımına göre yaz
  - [x] 0.3.2 Proje sahibi taslakları onaylasın — onaylandı
- [x] 0.4 Veli-öğrenci bağlantısında daveti kimin başlatıp kimin onaylayacağını belirle *(Faz 4'ten önce)* — öğrenci kod üretir, veli girer, öğrenci onaylar
- [x] 0.5 Veli onayı, veri saklama süreleri ve KVKK konularını değerlendir *(Faz 4'ten önce)* — aile içi kullanım nedeniyle uzman değerlendirmesi gerekmiyor; saklama süreleri yazıldı; kapsam genişlerse uzman soruları hazır
- [x] 0.6 Ders/kazanım veri kaynağını ve güncelleme sorumlusunu belirle *(Faz 5'ten önce)* — MEB programları + LGS kapsamı; proje sahibi
- [x] 0.7 Deneme türlerini ve her tür için net hesaplama kuralını yaz *(Faz 7'den önce)*
  - [x] 0.7.1 Deneme türlerini ve net kuralını yaz (tam LGS + branş; net = doğru − yanlış ÷ 3)
  - [x] 0.7.2 Negatif net kuralını belirle — ders neti eksi olabilir ve toplama katılır; toplam net eksiyse 0 alınır
  - [x] 0.7.3 Güncel LGS soru dağılımını MEB kılavuzuyla doğrula — proje sahibi doğruladı (20/20/20/10/10/10, toplam 90)
- [x] 0.8 E-posta/bildirim servisini seç *(Faz 10'dan önce)* — yalnızca uygulama içi bildirim; alan adı olmadığı için e-posta yok
- [x] 0.9 Hata izleme servisini seç *(Faz 12'den önce)* — Sentry ücretsiz plan, AB bölgesi
- [x] 0.10 Güvenlik açığı bildirim adresini belirle ve `SECURITY.md`'ye yaz *(Faz 12'den önce)* — GitHub özel bildirim; depo ayarında açıldı
- [x] 0.11 Lisans kararını ver *(Faz 12'den önce)* — kapalı kaynak, `LICENSE` eklendi; depo herkese açık, kullanım hakkı verilmez
- [x] 0.12 Yapay zekâ sağlayıcısını, veri işleme şartlarını ve maliyetini değerlendir *(Faz 13'ten önce)* — Groq ücretsiz plan, sıfır veri saklama açık
  - [x] 0.12.1 Kullanımı MVP sonrasına bırak ve değerlendirme ölçütlerini yaz
  - [x] 0.12.2 Ücretsiz sağlayıcıları ölçütlerle karşılaştır (Groq, Mistral, Gemini)
  - [x] 0.12.3 Proje sahibi seçimi onaylasın — Groq onaylandı

---

## Faz 1 — Proje altyapısı

**Amaç:** Çalışan, test edilen ve güvenli varsayılanlara sahip boş uygulama.

**İşler**
- [x] 1.1 Next.js 16.4 + React 19.3 + TypeScript 5.9 (strict) projesini kur
- [x] 1.2 Tailwind CSS 4 kur
- [x] 1.3 ESLint'i yapılandır (`any`, `@ts-ignore` ve `NEXT_PUBLIC_` gizli ad yasağı)
- [x] 1.4 Prettier'ı yapılandır
- [x] 1.5 Vitest + Testing Library ile birim/bileşen testlerini kur
- [x] 1.6 Playwright ile uçtan uca testleri kur (320 px mobil + masaüstü)
- [x] 1.7 `npm run lint / typecheck / test / test:e2e / build / check` komutlarını tanımla
- [x] 1.8 `.env.example` dosyasını ve Zod ile sunucu tarafı ortam değişkeni doğrulamasını yaz
- [x] 1.9 Güvenlik başlıklarını ekle (nosniff, çerçeveleme yasağı, referrer, izin politikası, HSTS)
- [x] 1.10 Tasarım token'larını (renk, yazı tipi, köşe, gölge) tek dosyada tanımla
- [x] 1.11 Temel bileşenleri yaz: Button, Card, StateMessage, ProgressMeter, TableScroll, SkipLink
- [x] 1.12 Ana sayfa, giriş yer tutucusu, yükleniyor, hata ve bulunamadı sayfalarını oluştur
- [x] 1.13 Öğrenci, veli ve yönetici sayfa taslaklarını örnek veriyle hazırla (`/onizleme`, yalnızca geliştirme ortamında açılır)
- [x] 1.14 İlk commit'i oluştur ve GitHub'a push et — `8e2e5f5`, depo `nurgung/lgsPusula` (sonradan herkese açık yapıldı, 0.11), `main` dalı

**Bitti sayılması için**
- [x] Uygulama yerelde çalışır, production build alınır
- [x] Lint, tip kontrolü, 23 birim testi ve 26 uçtan uca test geçer
- [x] Mevcut sayfalarda 320 px ve masaüstünde yatay taşma yoktur
- [x] Depoda gizli anahtar yoktur
- [x] Kod GitHub'dadır

---

## Faz 2 — Tasarım sistemi ve CI

**Amaç:** Sonraki fazlarda gereken ortak bileşenleri ve otomatik kontrolleri tamamlamak.
**Ön koşul:** Faz 1, karar 0.2

**İşler**
- [x] 2.1 Form bileşenleri: görünür etiket, yardım metni, alan hatası, sayı alanı (mobil klavye) — `TextField`, `NumberField`, `SelectField`, `FormErrorSummary`
- [x] 2.2 Onay penceresi (modal): klavye ile kapanır, odak içeride kalır — `ConfirmDialog` (yerleşik `<dialog>`)
- [x] 2.3 Anlık bildirim (toast): ekran okuyucuya duyurulur — `ToastProvider` / `useToast`
- [x] 2.4 Uygulama yerleşimi: üst başlık + mobil alt gezinme (rol bazlı menü yapısı) — `AppShell`, `getNavItems`; `/onizleme` bu yerleşime geçti
- [x] 2.5 GitHub Actions: her push'ta lint, typecheck, test, build ve e2e
  - [x] 2.5.1 İş akışını yaz (`.github/workflows/ci.yml`); içindeki komutlar yerelde geçti
  - [x] 2.5.2 Push sonrası GitHub'da çalıştığını ve yeşil olduğunu doğrula — `5411b27`, [çalışma 38247539696](https://github.com/nurgung/lgsPusula/actions/runs/38247539696)
- [x] 2.6 CI'da bağımlılık denetimi (`npm audit`) ve gizli anahtar taraması
  - [x] 2.6.1 Engelleyici production `npm audit`, rapor amaçlı tam `npm audit`, Gitleaks ve Dependabot ekle
  - [x] 2.6.2 Push sonrası GitHub'da çalıştığını ve temiz olduğunu doğrula — production audit 0 uyarı, Gitleaks yeni commit'te bulgu yok
  - [x] 2.6.3 Tüm geçmişi tarayan elle/haftalık Gitleaks çalıştırmasının temiz olduğunu doğrula — [çalışma 38247767095](https://github.com/nurgung/lgsPusula/actions/runs/38247767095): 5 commit, bulgu yok
- [ ] 2.7 `npm audit` uyarılarını çöz (`eslint-config-next` → `braces`)
  - [x] 2.7.1 Production bağımlılıklarında uyarı yok (`npm audit --omit=dev`: 0)
  - [x] 2.7.2 `braces` uyarısı için yamalı sürüm yok; yalnızca geliştirme aracı olduğu için kabul edilen risk olarak `SECURITY.md`'ye yazıldı
  - [ ] 2.7.3 Yamalı sürüm çıkınca güncelle (Dependabot haber verir) — 13 Ekim 2026: npm'de son sürüm hâlâ 3.0.3, yama yok
- [ ] 2.8 Staging ortamını kur ve ortam değişkenlerini platformun secret yönetimine taşı
  - [x] 2.8.1 `vercel.json` (Frankfurt, `fra1`) ve kurulum adımları ([docs/ARCHITECTURE.md](docs/ARCHITECTURE.md))
  - [x] 2.8.2 Vercel projesini bağla ve ortam değişkenlerini Preview/Production için ayrı gir
    - [x] 2.8.2.a Vercel projesi `nurgung/lgs-pusula` oluşturuldu; Production değişkenleri girildi (gizli olanlar "Secret" türünde) — 13 Ekim 2026
    - [x] 2.8.2.b Preview değişkenleri — ayrı Supabase projesi yok. Proje sahibi kararıyla `lgs-pusula-prod` (22 Ekim 2026). `APP_ENV=staging`, örnek sayfalar kapalı, `AUTH_SECRET` production'dan ayrı
    - [x] 2.8.2.c Vercel–GitHub bağlantısı — `vercel git connect` 22 Ekim 2026'da `nurgung/lgsPusula` için "Connected" döndü. Bu komut yeni dağıtım başlatmadı; sıradaki GitHub push'u dağıtımı dener
  - [ ] 2.8.3 Preview dağıtımlarında Vercel Authentication açık; staging adresi HTTPS ve güvenlik başlıklarıyla açılır
    - [x] 2.8.3.a Önizleme dağıtım adresi Vercel girişine yönleniyor (Vercel Authentication açık)
    - [x] 2.8.3.b Production adresi `https://lgs-pusula.vercel.app` HTTPS ile açılıyor; HTTP→HTTPS yönlendirmesi, HSTS, `nosniff`, `X-Frame-Options: DENY`, referrer ve izin politikası doğrulandı; fonksiyonlar `fra1`'de
    - [ ] 2.8.3.c Kalıcı staging adresi (staging dalı + staging değişkenleri) aynı kontrollerle açılır

**Bitti sayılması için**
- [x] Yeni bileşenlerin erişilebilirlik testleri geçer — 59 birim testi, 46 uçtan uca test (klavye, odak, canlı bölge, 44 px hedef, 320 px taşma)
- [x] Bir push sonrası CI otomatik çalışır ve yeşildir — [çalışma 38247539696](https://github.com/nurgung/lgsPusula/actions/runs/38247539696)
- [ ] Staging adresi HTTPS ile açılır

---

## Faz 3 — Veri tabanı ve kimlik doğrulama

**Amaç:** Aile hesaplarının güvenli şekilde oluşturulup giriş yapabilmesi.
**Ön koşul:** Faz 2, kararlar 0.1, 0.13
**Not:** Faz 2'de staging kurulumu (2.8) ve `braces` yaması (2.7.3) beklerken proje sahibinin onayıyla başlandı (12 Ekim 2026). Ayrıntılar: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Veri tabanı ve kimlik doğrulama").

**İşler**
- [ ] 3.1 Seçilen sağlayıcıyı bağla; geliştirme, staging ve production veri tabanlarını ayır
  - [x] 3.1.1 Supabase'i koda bağla (`@supabase/ssr`, `src/services/supabase`); yerel geliştirme ortamı Docker'da (`npm run db:start`, portlar 553xx)
  - [ ] 3.1.2 Staging ve production Supabase projelerini Frankfurt'ta aç; kayıt kapalı, parola kuralı ayarlanır, `supabase db push` ile migration uygulanır, değerler Vercel'e girilir (adımlar [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md))
    - [x] 3.1.2.a Production: `lgs-pusula-prod` (Frankfurt) açıldı, migration uygulandı, parola kuralı (10 karakter, harf + rakam) ayarlandı, değerler Vercel Production'a girildi; canlı adreste giriş Supabase'e bağlanıyor (yanlış girişte doğru hata mesajı) — 13 Ekim 2026
    - [ ] 3.1.2.b Ayrı staging Supabase projesi açılmadı. 22 Ekim 2026: proje sahibi önizlemenin `lgs-pusula-prod` üzerinde çalışmasına karar verdi. `velitakipnew` duraklatılmaz. Ayrı proje, yer açılırsa veya plan yükselirse gelir
    - [x] 3.1.2.c Production'da iki aile hesabı oluşturuldu (23 Ekim 2026). Roller veli+yönetici ve öğrenci. Geçici parolalar yalnızca o anda gösterildi; ilk girişte parola değişimi zorunlu. Staging ayrı proje olmadığı için yok
- [x] 3.2 Migration altyapısını kur
  - [x] 3.2.1 `supabase/migrations` + Supabase CLI; migration `supabase db reset` ile sıfırdan uygulandı
  - [x] 3.2.2 CI'daki uçtan uca iş yerel Supabase'i başlatıp migration'ları uygular; push sonrası GitHub'da yeşil olduğu doğrulanır — [çalışma 38355078745](https://github.com/nurgung/lgsPusula/actions/runs/38355078745)
- [x] 3.3 `profiles` tablosu migration'ı (rol kullanıcı tarafından değiştirilemez) — RLS: yalnızca kendi satırını okur; güncelleme/ekleme yetkisi yok (uçtan uca test)
- [ ] 3.4 Herkese açık kaydı kapat; iki aile hesabını oluşturan kurulum betiği (geçici parola yalnızca ekranda gösterilir)
  - [x] 3.4.a Kurulum betiği `npm run accounts -- setup` (yerelde kurgusal hesaplarla denendi); yerel Supabase'de kayıt kapalı (uçtan uca test)
  - [ ] 3.4.b Staging ve production projelerinde kayıt kapatılır (3.1.2 ile birlikte)
    - [x] 3.4.b.1 Production'da kayıt kapalı — dışarıdan kayıt isteği `422 signup_disabled` ile reddedildi (13 Ekim 2026)
    - [ ] 3.4.b.2 Staging'de kayıt kapatılır (3.1.2.b ile birlikte)
- [x] 3.4.1 Giriş, çıkış ve ilk girişte parola değiştirme akışları — kullanıcı adı + parola; geçici parolayla girişte `/parola-degistir` zorunlu
- [x] 3.5 Parola sıfırlama (kurulum betiğiyle; e-posta yok, 0.8) ve tüm oturumları sonlandırma — `npm run accounts -- reset-password`, `/hesap` içinde "Tüm cihazlarda çıkış yap"; parola değişince diğer oturumlar kapanır
- [x] 3.6 Oturumu sunucuda okuyan `server-only` veri erişim katmanı — `src/features/auth/session.ts`
- [x] 3.7 Oturuma bağlı bileşenleri `<Suspense>` arkasında yaz; oturum verisini paylaşılan önbelleğe koyma — yalnızca istek içi `React.cache`; sayfalar kısmi prerender (build ile doğrulandı)
- [x] 3.8 Giriş ve parola sıfırlama uçlarına oran sınırlaması — giriş: IP başına 20, kullanıcı adı başına 5; parola değiştirme: kullanıcı başına 5 (15 dakikada). Parola sıfırlama uygulamada uç değil, betikle yapılır
- [x] 3.9 Güvenlik olaylarını hassas veri içermeden kaydet (`audit_events`)
- [x] 3.10 `/giris` yer tutucusunu gerçek giriş sayfasıyla değiştir

**Bitti sayılması için**
- [x] Giriş, çıkış ve parola sıfırlama uçtan uca testlerle doğrulanır — `tests/e2e/auth.spec.ts`, yerel Supabase'e karşı, 320 px ve masaüstü
- [x] Dışarıdan yeni hesap açılamaz (test) — yerel Supabase'de uçtan uca testle, production'da `signup_disabled` yanıtıyla doğrulandı; staging 3.4.b.2
- [x] Çerezler Secure, HttpOnly ve SameSite özelliklidir — uçtan uca test + birim test
- [x] Oran sınırlaması testle doğrulanır — birim testler + uçtan uca test
- [x] Loglarda parola veya token bulunmadığı kontrol edilir — `audit_events` uçtan uca testi; uçtan uca çalıştırmanın çıktısı ve Next.js geliştirme logu tarandı (parola, JWT, oturum çerezi bulunmadı)

---

## Faz 4 — Roller ve veli-öğrenci ilişkisi

**Amaç:** Her kullanıcının yalnızca yetkili olduğu veriyi görmesi.
**Ön koşul:** Faz 3, kararlar 0.3, 0.4, 0.5

**İşler**
- [x] 4.1 Öğrenci, veli ve yönetici rolleri; rol yalnızca sunucuda atanır; veli hesabı aynı zamanda yönetici olabilir (0.13)
- [x] 4.2 Ortak yetki yardımcıları: sahiplik ve aktif ilişki kontrolü
- [x] 4.3 `family_links` migration'ı (`pending`, `active`, `declined`, `expired`, `revoked`)
  - [x] 4.3.1 Yerelde `supabase db reset` ile uygulandı; CI'da yeşil — [çalışma 38384209054](https://github.com/nurgung/lgsPusula/actions/runs/38384209054)
  - [x] 4.3.2 Production'a `supabase db push` ile uygulandı; `supabase migration list --linked` iki migration'ı da eşit gösteriyor (13 Ekim 2026)
  - [ ] 4.3.3 Staging'e uygulanır (3.1.2.b ile birlikte, ertelendi)
- [x] 4.4 Veli daveti: kısa ömürlü, tek kullanımlık belirteç
- [x] 4.5 Davet kabul, ret ve ilişkiyi sonlandırma ekranları
- [x] 4.6 RLS politikaları (her tablo için okuma/yazma ayrı)
- [ ] ~~4.7 Hesap devre dışı bırakma~~ — kapsam dışı (0.13)
- [x] 4.8 Yönetici yetkisi olan hesap için MFA; yönetici sayfaları MFA doğrulanmış oturum ister
- [x] 4.9 Gerçek `/ogrenci`, `/veli`, `/yonetici` sayfalarını yetki kontrolüyle oluştur; `/onizleme` taslaklarını kaldır

**Bitti sayılması için**
- [x] Öğrenci A, URL'deki ID'yi değiştirerek Öğrenci B'nin kaydını okuyamaz (test) — `tests/e2e/access.spec.ts`, yerel Supabase, 320 px ve masaüstü
- [x] Veli yalnızca aktif ilişkisi olan öğrenciyi görür (test) — aynı dosya
- [x] İptal edilen ilişki bir sonraki istekte erişimi kaldırır (test) — aynı dosya
- [x] Normal kullanıcı kendini yönetici yapamaz (test) — aynı dosya
- [x] Yönetici işlemleri normal oturumla yapılamaz (test) — aynı dosya; TOTP sonrası `/yonetici` açılır
- [x] RLS politikaları gerçek rollerle test edilir — aynı dosya
- [x] 13 Ekim 2026 yeniden doğrulama: lint, tip kontrolü, 124 birim testi ve 72 uçtan uca test yerelde geçti

---

## Faz 5 — Müfredat kataloğu

**Amaç:** Ders, konu ve kazanım listesinin sistemde bulunması.
**Ön koşul:** Faz 4, karar 0.6

**Not:** Proje sahibinin onayıyla 13 Ekim 2026'da başlandı. Ayrıntılar: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Müfredat kataloğu"), [docs/DATABASE.md](docs/DATABASE.md), [AUTHORIZATION.md](AUTHORIZATION.md).

**İşler**
- [x] 5.1 `subjects`, `topics`, `learning_outcomes` migration'ları (kaynak sürümü dahil)
  - [x] 5.1.1 `20261013130000_curriculum_catalog.sql`: kaynak adı/sürümü ve giriş tarihi her satırda; silme yok, `archived_at` ile "eski sürüm"; konu/kazanım taşınamaz; RLS okuma/yazma ayrı, yazma yalnızca yönetici + TOTP (`is_catalog_admin()`). Yerelde uygulandı ve testlendi
  - [x] 5.1.2 Push sonrası CI'da yeşil çalışma — `c189cc5`, [çalışma 38538837112](https://github.com/nurgung/lgsPusula/actions/runs/38538837112)
  - [x] 5.1.3 Production'a `supabase db push` (proje sahibinin onayıyla) — önce `--dry-run` ile yalnızca bu migration'ın gideceği görüldü; uygulandı, `supabase migration list --linked` üç migration'ı da eşit gösteriyor (14 Ekim 2026)
- [x] 5.2 Katalog verisini yükleme betiği — `npm run catalog -- import <dosya.json> [--dry-run]`; ortak şemayla doğrulama, plan + "evet" onayı, tekrar yüklemede çift kayıt yok (yerelde 6/9/11 satırla iki kez denendi), kazanım taşınmaya çalışılırsa hiçbir şey yazmadan durur; `"example": true` dosyalar yalnızca yerel Supabase'e yüklenir
  - [x] 5.2.1 Gerçek MEB 8. sınıf / LGS katalog dosyasını hazırla ve yükle (proje sahibi, karar 0.6). Depodaki `data/catalog/ornek-katalog.json` kurgusaldır
    - [x] 5.2.1.a `data/catalog/meb-8-sinif-2026-2027.json`: 2026-2027'de 8. sınıfta geçerli MEB programlarının resmî PDF'lerinden 6 ders, 45 konu, 326 kazanım; ders başına sayılar program tablolarıyla aynı (birim test). Yerel Supabase'e yüklendi, ikinci yüklemede yeni satır oluşmadı (14 Ekim 2026). Kaynaklar ve kod uyarlamaları: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
    - [x] 5.2.1.b Proje sahibinin onayıyla production'a yüklendi: 6 ders, 45 konu, 326 kazanım; ikinci deneme çalıştırması 0 yeni satır gösterdi (14 Ekim 2026). İçerik düzeltmeleri `/yonetici/mufredat` ekranından yapılabilir
- [x] 5.3 Yönetici için katalog ekleme/düzenleme ekranı — `/yonetici/mufredat` ve `/yonetici/mufredat/[subjectId]`: ekleme, düzenleme, eski sürüm yapma/geri alma; her değişiklik `audit_events`'e yazılır
- [x] 5.4 Öğrenci için aranabilir konu/kazanım seçici bileşeni — `CurriculumPicker` (Türkçe karaktere duyarsız arama, yerleşik radyo düğmeleriyle klavye erişimi, eski sürümler gösterilmez); `/ogrenci/konular` sayfasında kullanılıyor, Faz 6 formunda da kullanılacak

**Bitti sayılması için**
- [x] Katalog yalnızca yönetici tarafından değiştirilebilir (test) — `tests/e2e/catalog.spec.ts`: TOTP'siz yönetici yazamaz, TOTP'li yönetici yazar ama silemez/taşıyamaz; `catalog-change.test.ts`. Yerel Supabase, 320 px ve masaüstü
- [x] Öğrenci ve veli kataloğu yalnızca okuyabilir (test) — aynı dosya: okuma var; ekleme, güncelleme, eski sürüm yapma ve silme reddedilir; girişsiz ziyaretçi okuyamaz
- [x] 13 Ekim 2026 doğrulama: lint, tip kontrolü, 182 birim testi, production build ve 80 uçtan uca test yerelde geçti

---

## Faz 6 — Günlük çalışma kayıtları ve hedefler

**Amaç:** Öğrencinin günlük çalışmasını kaydedip hedefini takip etmesi.
**Ön koşul:** Faz 5

**Not:** Proje sahibinin onayıyla 19 Ekim 2026'da başlandı. Ayrıntılar: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Günlük çalışma ve hedefler"), [docs/DATABASE.md](docs/DATABASE.md), [AUTHORIZATION.md](AUTHORIZATION.md).

**Kararlar (bu fazda, güvenli varsayım):** Hedef birimi soru sayısıdır. Süre dakika olarak kaydedilir ama hedefe sayılmaz. Hafta pazartesi başlar, pazar biter. Gün sınırı Europe/Istanbul gece yarısıdır. `studied_on` öğrencinin seçtiği İstanbul takvim günüdür; ileri tarih ve 1 Eylül 2024'ten eski tarih yazılamaz.

**İşler**
- [x] 6.1 Saat dilimi kararını uygula (Europe/Istanbul) ve gün sınırı yardımcılarını yaz — `src/features/study/calendar.ts`; 20:59 UTC aynı gün, 21:00 UTC ertesi gün
- [x] 6.2 Ortak doğrulama şeması: negatif değer yok, doğru + yanlış + boş = soru sayısı — `src/features/study/schemas.ts`; en az 1 soru, süre 0–1440 dakika
- [x] 6.3 `study_logs` migration'ı
  - [x] 6.3.1 `20261019150000_study_records.sql` yerelde uygulandı ve test edildi (19 Ekim 2026). Yeni tablolar; mevcut satırlar değişmez
  - [x] 6.3.2 Production'a `supabase db push` (proje sahibi onayıyla) — önce `--dry-run` ile yalnızca bu migration'ın gideceği görüldü; uygulandı, `supabase migration list --linked` dört migration'ı da eşit gösteriyor (19 Ekim 2026). Staging 3.1.2.b ile birlikte ertelendi
- [x] 6.4 Günlük kayıt formu (ders, isteğe bağlı konu/kazanım, soru, doğru, yanlış, boş, süre) — `/ogrenci/calisma/yeni` ve ana sayfadaki hızlı kayıt
- [x] 6.5 Kayıt düzenleme ve silme (onaylı) — `/ogrenci/calisma/[logId]`
- [x] 6.6 `study_goals` migration'ı; günlük/haftalık hedef belirleme — aynı migration; `/ogrenci/hedefler`. Aynı dönem ve ders için yeniden kaydetmek hedefi günceller, ikinci satır açmaz
- [x] 6.7 Öğrenci ana sayfası: bugünün hedefi, ilerleme, hızlı kayıt
- [x] 6.8 Geçmiş dönemle karşılaştırma (tarih aralığı ve birim gösterilir) — `/ogrenci/calisma` içinde; varsayılan bu haftanın bugüne kadarki günleri ve geçen hafta; birim soru ve dakika

**Bitti sayılması için**
- [x] Negatif ve tutarsız toplamlar sunucuda reddedilir (birim test) — `schemas.test.ts`; veri tabanı kısıtı `tests/e2e/study.spec.ts`
- [x] Gece yarısı ve saat dilimi sınırları test edilir — `calendar.test.ts`
- [x] Günlük özet, kayıtlarla aynı sonucu verir (test) — `summary.test.ts`
- [x] Çift tıklama çift kayıt oluşturmaz — `commit-log.test.ts` ve aynı `request_id` ile ikinci eklemenin reddi (uçtan uca)
- [x] Tüm kayıt uçlarında yetki testleri geçer — `access.test.ts` ve `tests/e2e/study.spec.ts` (öğrenci A/B, velisiz, aktif veli, iptal, yönetici rolü ek erişim vermez; 320 px ve masaüstü)
- [x] 19 Ekim 2026 doğrulama: 206 birim testi geçti. Çalışma uçtan uca testleri ve erişim testleri yerelde geçti. Lint ve tip kontrolü geçti. Production migration uygulandı (6.3.2)

---

## Faz 7 — Deneme sınavları ve net hesabı

**Amaç:** Deneme sonuçlarını doğru net hesabıyla kaydetmek.
**Ön koşul:** Faz 6, karar 0.7

**İşler**
- [x] 7.1 Net hesabını tek merkezi fonksiyonda, deneme türüne bağlı yaz; kural sürümünü kaydet — `src/features/exams/net-rules.ts` (`lgs-v1`); `computeExamNets`
- [x] 7.2 `exams` ve `exam_subject_results` migration'ları
  - [x] 7.2.1 `20261019160000_exams.sql` yerelde uygulandı ve test edildi (19 Ekim 2026). Yeni tablolar; mevcut satırlar değişmez
  - [x] 7.2.2 Production'a `supabase db push` (proje sahibi onayıyla) — önce `--dry-run` ile bu migration'ın gideceği görüldü; 8.1.2 ile birlikte uygulandı, `supabase migration list --linked` altı migration'ı da eşit gösteriyor (20 Ekim 2026). Staging 3.1.2.b ile birlikte ertelendi
- [x] 7.3 Deneme oluşturma ve ders bazında sonuç girişi formu — `/ogrenci/denemeler/yeni` (`lgs_full` ve `branch`)
- [x] 7.4 Deneme listesi ve detay sayfası (mobilde kart görünümü) — `/ogrenci/denemeler`, `/ogrenci/denemeler/[examId]`; ders netleri tablosu + kart liste
- [x] 7.5 Deneme düzenlendiğinde netin yeniden hesaplanması — düzenleme `buildExamPayload` / `computeExamNets` ile yeniden hesaplar; kural sürümü korunur

**Bitti sayılması için**
- [x] Net hesabı her deneme türü için birim testlerle doğrulanır — `net-rules.test.ts`
- [x] Eksi ders netinin toplama katıldığı ve eksi toplam netin 0 alındığı birim testlerle doğrulanır — aynı dosya + karar 0.7 örneği
- [x] Deneme düzenleme, özetleri tutarlı günceller (test) — `tests/e2e/exams.spec.ts` (0 → 5 net)
- [x] Yetki testleri geçer — `access.test.ts` ve `tests/e2e/exams.spec.ts` (öğrenci A/B, aktif veli okur yazamaz, iptal sonrası erişim biter; 320 px ve masaüstü)
- [x] 19 Ekim 2026 doğrulama: exam birim testleri, lint, tip kontrolü ve `tests/e2e/exams.spec.ts` yerelde geçti. Production migration 20 Ekim 2026'da uygulandı (7.2.2)

---

## Faz 8 — Kazanım analizi ve grafikler

**Amaç:** Yanlış/boş soruların kazanımlarla eşleşmesi ve gelişimin görülmesi.
**Ön koşul:** Faz 7

**Not:** Proje sahibinin onayıyla 20 Ekim 2026'da başlandı. Ayrıntılar: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Kazanım analizi ve grafikler"), [docs/DATABASE.md](docs/DATABASE.md), [AUTHORIZATION.md](AUTHORIZATION.md).

**Kararlar (bu fazda, güvenli varsayım):** Eşleştirme isteğe bağlıdır. Kaynak şimdilik yalnızca `manual`, güven `high`. Öncelik kuralı `outcome-priority-v1` (yanlış 2, boş 1); bağlanmamış satırdan sıralama üretilmez. Analiz penceresi 90 gün. Grafik için üçüncü taraf paket yok; yerleşik SVG + zorunlu tablo.

**İşler**
- [x] 8.1 `exam_mistakes` migration'ı (kaynak ve güven düzeyi dahil)
  - [x] 8.1.1 `20261020120000_exam_mistakes.sql` yerelde uygulandı ve test edildi (20 Ekim 2026). Yeni tablo; mevcut satırlar değişmez. Deneme düzenlemede ders satırları yerinde güncellenir (eşleştirmeler korunur)
  - [x] 8.1.2 Production'a `supabase db push` (proje sahibi onayıyla) — önce `--dry-run` ile yalnızca `exams` ve `exam_mistakes` migration'larının gideceği görüldü; uygulandı, `supabase migration list --linked` altı migration'ı da eşit gösteriyor (20 Ekim 2026). Staging 3.1.2.b ile birlikte ertelendi
- [x] 8.2 Yanlış/boş soruları kazanımla manuel eşleştirme ekranı — `/ogrenci/denemeler/[examId]/kazanimlar`
- [x] 8.3 Kazanım önceliklendirme kuralını yaz ve belgele — `outcome-priority-v1` (`prioritize.ts`); `/ogrenci/kazanimlar`
- [x] 8.4 Erişilebilir grafik yaklaşımını seç — yerleşik SVG `NetTrendChart` (üçüncü taraf paket yok; gerekçe ARCHITECTURE); her grafik zorunlu tablo alternatifi sunar
- [x] 8.5 Denemeler arası değişim grafiği + aynı verinin tablosu — `/ogrenci/denemeler/gelisim`
- [x] 8.6 Veri yetersiz olduğunda açıklayıcı boş durum — eşleştirme yok / tek deneme

**Bitti sayılması için**
- [x] Kazanım verisi girilmemişse kazanım tespiti yapılmış gibi gösterilmez (test) — `prioritize.test.ts`, `tests/e2e/outcomes.spec.ts`
- [x] Her grafiğin tablo alternatifi vardır; başlık, birim ve tarih aralığı gösterilir — aynı e2e
- [x] 20 Ekim 2026 doğrulama: lint, tip kontrolü, 232 birim testi ve `tests/e2e/outcomes.spec.ts` (320 px + masaüstü) yerelde geçti. Production migration uygulandı (8.1.2)

---

## Faz 9 — Kural tabanlı koçluk

**Amaç:** Veriye dayalı, nedeni açıklanan çalışma önerileri.
**Ön koşul:** Faz 8

**Not:** Proje sahibinin onayıyla 20 Ekim 2026'da başlandı. Ayrıntılar: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Kural tabanlı koçluk"), [docs/DATABASE.md](docs/DATABASE.md), [AUTHORIZATION.md](AUTHORIZATION.md).

**Kararlar (bu fazda, güvenli varsayım):** Öneri her istekte yeniden hesaplanır; ayrı tablo yoktur. Neden, kural sürümü ve kanıt öneri nesnesinde durur. Çalışma penceresi son 14 gün, deneme ve kazanım penceresi son 90 gündür (Europe/Istanbul, bugün dahil). Bir derste 10 sorudan az kayıtta doğru oranı söylenmez. Doğru sayısı soru sayısının yarısından azsa o ders önerilir. Deneme farkı yalnızca son iki tam LGS içindir; branş denemeleri karışmaz. Kart sırası: bağlı kazanım, düşük doğru sayısı, azalan toplam net, bugünkü hedefin kalanı, hedef daveti. Hiçbiri uymazsa kart sonuç çıkarmaz.

**İşler**
- [x] 9.1 Metrikler: hedef tamamlama, ders bazında doğruluk, denemeler arası değişim, tekrar gereken kazanımlar — `src/features/coaching/metrics.ts`
- [x] 9.2 Öneri kuralları ve her önerinin nedenini saklama — `coaching-v1` (`rules.ts`); neden ve kanıt öneriyle birlikte tutulur, tabloya yazılmaz
- [x] 9.3 Öğrenci ana sayfasında öncelikli öneri kartı ("Neden?" açıklamasıyla) — `/ogrenci`, `RecommendationCard`
- [x] 9.4 Destekleyici mesaj metinlerinin gözden geçirilmesi — `messages.ts`; yasak ifade testi

**Bitti sayılması için**
- [x] Her öneri kaynak veriye ve kurala dayanır (birim test) — `rules.test.ts`
- [x] Veri yetersizken kesin çıkarım yapılmaz (test) — aynı dosya: 10 sorudan az oran yok, bağlanmamış yanlıştan kazanım yok, tek denemeden net farkı yok
- [x] Mesajlar utandırıcı, korkutucu veya kıyaslayıcı değildir — `supportiveCopyIssues` ve şablon testi
- [x] 20 Ekim 2026 doğrulama: lint, `tsc --noEmit`, 18 koçluk birim testi ve `tests/e2e/coaching.spec.ts` (320 px + masaüstü) yerelde geçti. Tüm test paketi bu turda yeniden çalıştırılmadı

---

## Faz 10 — Karakter, görev ve bildirimler

**Amaç:** Cezalandırmayan motivasyon sistemi ve nazik hatırlatmalar.
**Ön koşul:** Faz 9, karar 0.8

**Not:** Proje sahibinin onayıyla 20 Ekim 2026'da başlandı. Ayrıntılar: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Karakter, görev ve bildirimler"), [docs/DATABASE.md](docs/DATABASE.md), [AUTHORIZATION.md](AUTHORIZATION.md).

**Kararlar (bu fazda, güvenli varsayım):** Karakter beş türden biri (kedi, kaplumbağa, serçe, papatya, fidan). Puan kuralı `mascot-v1`: çalışma kaydı 5, bugünkü tüm dersler hedefi 10, deneme kaydı 5, kazanım eşleştirmesi 8. Aynı anahtar ikinci kez puan yazmaz. Puan satırı silinmez ve güncellenmez; bir gün ara veya kaydı silmek aşamayı düşürmez. Aşamalar 0 / 10 / 30 / 60 puanda değişir ve yalnızca ileri gider. Görevler her istekte hesaplanır, ayrı puan yazmaz. Hatırlatma yalnızca uygulama içidir; varsayılan açık, sessiz saat 21:00–08:00 (İstanbul), günde en fazla 1. Eşit saat sessiz saati kapatır. Hatırlatma cümlesi sabittir ve sınav sonucu içermez.

**İşler**
- [x] 10.1 Karakter seçimi (hayvan/bitki) ve `mascot_profiles` migration'ı
  - [x] 10.1.1 `20261020140000_mascot.sql` yerelde uygulandı ve test edildi (20 Ekim 2026). Yeni tablolar; mevcut satırlar değişmez
  - [x] 10.1.2 Production'a `supabase db push` (proje sahibi onayıyla) — önce `--dry-run` ile yalnızca bu migration'ın gideceği görüldü; uygulandı, `supabase migration list --linked` yedi migration'ı da eşit gösteriyor (20 Ekim 2026). Staging 3.1.2.b ile birlikte ertelendi
- [x] 10.2 `reward_events`: puanlar sunucuda, idempotency anahtarıyla hesaplanır — `sync_mascot_rewards_for`; öğrenci puan yazamaz
- [x] 10.3 Karakter aşamaları, rozetler ve görevler — `/ogrenci/karakter` ve ana sayfadaki görev listesi
- [x] 10.4 Bildirim tercihleri, sessiz saatler ve sıklık sınırı — `/ogrenci/bildirimler`
- [x] 10.5 Veri girilmediğinde nazik hatırlatma — ana sayfa; metin kodda, veri tabanında cümle tutulmaz

**Bitti sayılması için**
- [x] Aynı olay tekrar işlendiğinde çift puan oluşmaz (test) — `rules.test.ts` ve `tests/e2e/mascot.spec.ts` (ikinci `sync` 0 döner; kayıt düzenlenince satır 1 kalır)
- [x] Bir gün ara vermek karakteri geriletmez (test) — aynı dosyalar: boş gün puanı düşürmez; kayıt silinince puan durur
- [x] Öğrenci bildirimleri kapatabilir — aynı uçtan uca test, 320 px ve masaüstü
- [x] Bildirimlerde hassas sınav bilgisi gösterilmez — hatırlatma kartında net, puan, yanlış, doğru, sınav ve deneme yok (aynı uçtan uca test)
- [x] 20 Ekim 2026 doğrulama: lint, `tsc --noEmit`, 262 birim testi, `tests/e2e/mascot.spec.ts` ve `tests/e2e/coaching.spec.ts` (320 px + masaüstü) yerelde geçti. Tüm uçtan uca paket bu turda yeniden çalıştırılmadı. Production migration uygulandı (10.1.2)

---

## Faz 11 — Veli paneli ve PDF rapor

**Amaç:** Velinin bağlı öğrencinin gelişimini görmesi ve haftalık rapor alması.
**Ön koşul:** Faz 10

**Not:** Proje sahibinin onayıyla 21 Ekim 2026'da başlandı. Ayrıntılar: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Veli paneli ve PDF rapor"), [docs/DATABASE.md](docs/DATABASE.md), [AUTHORIZATION.md](AUTHORIZATION.md).

**Kararlar (bu fazda, güvenli varsayım):** PDF yalnızca haftalıktır; aylık özet ekranda kalır. Dönem istemciden tarih olarak gelmez: form `current` veya `previous` gönderir, sunucu Europe/Istanbul aralığını hesaplar. Bu hafta bugünde biter ve bitmediği yazılır. Geçen hafta bir önceki tam pazartesi–pazar günleridir. Dosya `report_jobs.pdf_bytes` içindedir; herkese açık bir yola yazılmaz. Aynı veli, öğrenci ve dönem yeniden üretilirse satırın üzerine yazılır ve 24 saat yeniden başlar. Üretim başarısızsa bayt yazılmaz. Silme, veli paneli açılınca veya rapor istenince çalışır; zamanlanmış görev yoktur (Faz 12). Kimse uğramazsa satır 24 saati aşabilir. Öğrenci rapor isteyemez. Yönetici rolü, aktif veli bağlantısı olmadan rapor açmaz.

**İşler**
- [x] 11.1 Veli ana sayfası ve bağlı öğrenci seçimi — `/veli`; bu haftanın soru ve dakika özeti, tarih aralığı ve birim
- [x] 11.2 Haftalık/aylık özetler — `/veli/ogrenci/[studentId]`; koçluk kartı salt okunur
- [x] 11.3 `report_jobs` migration'ı
  - [x] 11.3.1 `20261021120000_report_jobs.sql` yerelde uygulandı ve test edildi (21 Ekim 2026). Yeni tablo; mevcut satırlar değişmez
  - [x] 11.3.2 Production'a `supabase db push` (proje sahibi onayıyla) — önce `--dry-run` ile yalnızca bu migration'ın gideceği görüldü; uygulandı, `supabase migration list --linked` sekiz migration'ı da eşit gösteriyor (21 Ekim 2026). Staging 3.1.2.b ile birlikte ertelendi
- [x] 11.4 Sunucu tarafında haftalık PDF raporu üretimi (dönem, üretim tarihi, metrik açıklamaları) — `pdf-lib` ve gömülü Nunito; `GET /veli/rapor/[jobId]`
- [x] 11.5 İndirme öncesi yetki kontrolü — `canDownloadReport`; bağlantısız veli, öğrenci ve süresi dolmuş satır dosya alamaz
- [x] 11.6 Geçici rapor dosyalarının süre sonunda silinmesi — `purge_expired_report_jobs()` veli sayfasında ve indirmede. Zamanlanmış silme Faz 12'de

**Bitti sayılması için**
- [x] Veli A, bağlantısı olmayan öğrencinin raporunu indiremez (test) — `tests/e2e/reports.spec.ts`: yabancı veli ve bağlantısı kaldırılmış veli HTML 404 alır, dosya almaz
- [x] Türkçe karakterler ve tablo kırılmaları PDF'de doğru görünür — `pdf.test.ts` (Şişli, İstanbul) ve `document.test.ts` (ikinci sayfada tablo başlığı)
- [x] Rapor üretimi başarısızsa boş dosya indirilmez, anlaşılır mesaj gösterilir — aynı uçtan uca test: `failed` satır `text/html` döner, ek yoktur; metin "Boş dosya gönderilmedi."
- [x] 21 Ekim 2026 doğrulama: lint, `tsc --noEmit`, 280 birim testi ve `tests/e2e/reports.spec.ts` (320 px + masaüstü) yerelde geçti. Veli sayfasını açan `access`, `exams`, `catalog` ve `study` spec'leri de geçti. Tüm uçtan uca paket bu turda yeniden çalıştırılmadı. Production migration uygulandı (11.3.2)

---

## Faz 12 — PWA, erişilebilirlik ve yayın hazırlığı

**Amaç:** MVP'yi gerçek kullanıcılara açmaya hazır hale getirmek.
**Ön koşul:** Faz 11, kararlar 0.9, 0.10, 0.11

**Not:** Proje sahibinin onayıyla 21 Ekim 2026'da başlandı. Ayrıntılar: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Yayın hazırlığı"), [docs/DATABASE.md](docs/DATABASE.md), [SECURITY.md](SECURITY.md).

**Kararlar (bu fazda, güvenli varsayım):** Çevrimdışı önbellek yalnızca statik "İnternet yok" sayfası ve simgelerdir. Kayıtlı sayfalar saklanmaz. Hata izleme DSN'i yoksa kapalıdır; varsa yalnızca AB ingest adresine, digest ve temizlenmiş metin gider. Yedek AES-256-GCM ile şifrelenir ve `backups/` altında durur. Dışa aktarma ve silme uygulama içi ekran değil, proje sahibinin bilgisayarındaki betiktir. Saklama temizliği zamanlanmış görev değildir; `npm run data -- retain` ile çalışır.

**İşler**
- [x] 12.1 PWA manifesti, simgeler ve yükleme deneyimi — `src/app/manifest.ts`, `public/icons`, `/hesap` içindeki ekleme adımları. Production'da manifest adı ve 3 simge doğrulandı
- [x] 12.2 Çevrimdışı kapsamı belirle; hassas kayıtları cihazda önbelleğe alma — `public/sw.js`. Tarayıcı çevrimdışıyken `/giris` giriş formunu değil, "İnternet yok" sayfasını açtı (21 Ekim 2026, production sunucusu)
- [x] 12.3 Nonce tabanlı tam İçerik Güvenlik Politikası — `src/proxy.ts`. Production yanıtında nonce eşleşti; `unsafe-eval` ve `unsafe-inline` yoktu; konsol hatası yoktu
- [x] 12.4 Hata izleme (kişisel veri maskelenmiş)
  - [x] 12.4.1 Sunucu adaptörü, temizlik ve testler. DSN boşken gönderim yok. AB dışı adres reddedilir
  - [x] 12.4.2 Sentry kuruluşu `lgs-pusula`, bölge `de`, plan Developer (`am3_f`, 30 gün). Proje `lgs-pusula-sj`. İstemci anahtarında oturum tekrarı kapalı. `SENTRY_DSN` Vercel Production'da gizli değişken. `NEXT_PUBLIC_SENTRY_DSN` kaldırıldı. Canlı site bu kodu henüz dağıtmadığı için olay göndermiyor
- [ ] 12.5 Erişilebilirlik denetimi: klavye, ekran okuyucu, kontrast
  - [x] 12.5.1 Metin renkleri AA kontrast testini geçti. Çevrimdışı sayfada klavye odağı ve 320 px taşma kontrol edildi
  - [ ] 12.5.2 Ekran okuyucu ile gerçek cihaz geçişi (12.6 ile birlikte)
- [ ] 12.6 Gerçek mobil cihazlarda kritik akış testleri — adımlar [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Yayın hazırlığı"). Bu turda telefon yoktu
- [x] 12.7 Yedekleme ve geri yükleme denemesi — yerel tablo şifrelenip geri yüklendi. Production yedeği alınmadı. Eski yedekleri 30 gün sonra proje sahibi siler
  - [x] 12.7.1 `20261021160000_retention.sql` production'a `supabase db push` (proje sahibi onayı, 21 Ekim 2026). Önce `--dry-run` yalnızca bu dosyayı gösterdi. `purge_retained_rows` ve `erase_personal_data` oluştu; ikisini de yalnızca `postgres` ve `service_role` çalıştırabilir. Fonksiyonlar çağrılmadı
- [ ] 12.8 Tüm verileri dışa aktarma ve tüm verileri silme betiği
  - [x] 12.8.a `npm run data -- export` yerel kurgusal veriyle dosya yazdı; davet özeti ve PDF baytı yoktu. Dosya silindi
  - [x] 12.8.b `erase` onay sözcüğü birim testte zorunlu. Betik çalıştırılıp veri silinmedi
  - [ ] 12.8.c Production'da çalıştırmak proje sahibine aittir
- [x] ~~12.8.1 Resmî gizlilik bildirimi ve uygulama içi hesap kapatma ekranı~~ — kapsam dışı (0.13)
- [x] 12.9 Güvenlik değerlendirmesi ve bulguların kapatılması — bu turdaki bulgu satır içi stildi; kalktı. Çevrimdışı önbellek ve hata gövdesi test edildi. Açık kalanlar: `braces` (kabul), staging, gerçek cihaz. Ayrıntı: [SECURITY.md](SECURITY.md)

**Bitti sayılması için**
- [ ] Aşağıdaki "Yayın öncesi kapı kontrolü" listesinin tamamı işaretlidir

---

## Faz 13 — MVP sonrası

**Ön koşul:** MVP yayında, karar 0.12

**Yapay zekâ destekli açıklamalar**
- [x] 13.0 Groq'un güncel veri ve kota şartlarını 0.12 ölçütleriyle yeniden kontrol et; panelde sıfır veri saklamayı aç
  - [x] 13.0.1 Şartlar 22 Ekim 2026'da yeniden bakıldı ve [docs/DECISIONS.md](docs/DECISIONS.md) içine yazıldı. Konsol 18 yaş ister. Bölge ABD. Eğitim yasağı duruyor
  - [x] 13.0.2 Proje sahibi 22 Ekim 2026'da kuruluş için sıfır saklamayı açtı. `AI_ZDR_CONFIRMED=true`, `AI_ENABLED=true` ve `AI_PROVIDER=groq` Vercel Production ile yerelde duruyor. `AI_API_KEY` gizli değişken; depoda yok
- [x] 13.1 Sağlayıcıdan bağımsız yapay zekâ adaptörü (ilk sağlayıcı: Groq) — `src/features/ai/explain.ts`, `src/services/ai/groq.ts`. Birim testler geçti
- [x] 13.2 Modele yalnızca gerekli en az veriyi gönderme; tanımlayıcıları çıkarma — `coachingBrief`. Hesap kimliği, e-posta ve bağlantı özete girmez
- [x] 13.3 Çıktı şeması doğrulaması, uzunluk sınırı, istem enjeksiyonu önlemleri — tek alan `text`, en fazla 400 karakter, ek alan reddi
- [x] 13.4 Hata, zaman aşımı ve kota durumunda kural tabanlı geri dönüş — `explain.test.ts`
- [x] 13.5 Yapay zekâyı kapatma ayarı ve maliyet sınırı — öğrenci anahtarı `/hesap`, günlük tavan `AI_DAILY_REQUEST_LIMIT`. `AI_ENABLED` varsayılan kapalı

**CSV/XLSX içe aktarma**
- [x] 13.6 Şablon ve alan eşleştirme — CSV şablonu `tarih,ders,soru,dogru,yanlis,bos,sure`. Ders adı katalogla eşleşir
- [x] 13.7 Boyut, tür, imza ve satır sınırları; formül enjeksiyonu önlemi — 500 KB, 100 satır, CSV veya PK başlıklı xlsx. Formül satırı yazılmaz
- [x] 13.8 Önizleme, satır bazında hata ve kullanıcı onayı — `/ogrenci/ice-aktar`. Kayıt yalnızca `confirm=evet` ile
- [x] 13.9 Yinelenen kayıt kontrolü (idempotent içe aktarma) — aynı satır aynı `request_id` üretir

**Diğer**
- [x] 13.10 DOCX rapor — veli sayfasında Word indirme. Dosya `report_jobs` içine yazılmaz. `docx.test.ts` Türkçe karakter ve tablo başlığını doğruladı
- [x] 13.11 PDF'den veri çıkarımı (ayrı değerlendirme ve kullanıcı onaylı akış) — PDF modele gitmez. Etiketli metin yoksa satır uydurulmaz. Yazmadan önce önizleme ve onay gerekir

**Bitti sayılması için**
- [x] Yapay zekâ kullanılamadığında temel koçluk çalışır (test) — `src/features/ai/explain.test.ts`, 22 Ekim 2026
- [x] Model çıktısı puan, yetki veya veri tabanı sorgusunu belirlemez (test) — aynı dosya: ek alanlar reddedilir, kural kartı aynı kalır
- [x] Geçersiz dosyalar güvenle reddedilir; satırlar başka öğrenciye yazılamaz (test) — `src/features/import/plan.test.ts`

---

## Yol haritası ilkeleri

- Fazlar tamamlanmadan gerçek öğrenci verisiyle yayına geçilmez.
- Her fazın bitiş ölçütleri test edilebilir olmalıdır.
- Servisler netleşmeden takvim taahhüdü verilmez.
- Öncelik sırası: güvenli temel → doğru veri → anlamlı koçluk → motivasyon → raporlama → ölçekleme.

## Yayın öncesi kapı kontrolü

- [x] Rol ve ilişki erişim testleri başarılı. `tests/e2e/access.spec.ts`, 21 Ekim 2026.
- [x] Net ve hedef hesaplama testleri başarılı. Birim testler ve `tests/e2e/exams.spec.ts` aynı gün.
- [x] Rapor erişim testleri başarılı. `tests/e2e/reports.spec.ts` aynı gün. Faz 13 içe aktarması öğrenci kimliğini oturumdan alır.
- [ ] Gizli anahtar taraması temiz. Bu turda Gitleaks çalıştırılmadı.
- [x] Yedekleme ve geri yükleme denenmiş. Yerel deneme; production yedeği yok.
- [x] Öğrencinin ilk girişte gördüğü "hangi bilgiler tutuluyor, veli neyi görebilir" açıklaması ve veli bağlantı onayı akışı incelenmiş. Metin `/ogrenci` ana sayfasında; onay akışı erişim testleriyle duruyor.
- [x] Yapay zekâ sağlayıcısının veri kullanımı ve saklama şartları incelenmiş. 22 Ekim 2026'da yeniden bakıldı. İstek, sıfır saklama onayı ve `AI_ENABLED` olmadan gitmez.
- [x] Hata izleme araçlarında hassas veri sızıntısı kontrol edilmiş. Gönderilen gövde testte tarandı. Canlı projeye olay gitmedi.
- [x] Destek ve güvenlik olayı müdahale süreci belgelenmiş. [SECURITY.md](SECURITY.md) ("Olay müdahalesi").
