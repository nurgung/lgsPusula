# LGS Pusula

LGS Pusula; 8. sınıf öğrencilerinin günlük çalışmalarını, deneme sınavı sonuçlarını ve kazanım eksiklerini izlemeyi; öğrenciye kural tabanlı ve yapay zekâ destekli geri bildirim sunmayı; velinin yetkili olduğu öğrencinin gelişimini takip etmesini amaçlayan, mobil uyumlu bir web/PWA platformudur.

> **Kullanım kapsamı:** Uygulama yalnızca aile içinde kullanılır: proje sahibi (veli + yönetici) ve çocuğu (öğrenci). Herkese açık kayıt yoktur. Ayrıntı: [docs/DECISIONS.md](docs/DECISIONS.md) (0.13).

> **Proje durumu:** Faz 0, 1 ve 4–9 tamamlandı. Faz 2'de staging, Vercel–GitHub bağlantısı ve `braces` yaması bekliyor. Faz 3'te staging ve production aile hesapları bekliyor. Faz 10 başlanmadı. İlerleme [roadmap.md](roadmap.md) içinde izlenir. Ayrıntılar: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Ürün hedefleri

- Ders ve konu bazında günlük soru, doğru, yanlış, boş ve çalışma süresi kayıtları.
- Günlük/haftalık hedefler ve geçmiş dönemlerle karşılaştırma.
- Deneme sınavı sonuçları ve yanlışlarla ilişkilendirilmiş MEB kazanımlarının takibi.
- Açıklanabilir, kural tabanlı analizler; gerektiğinde yapay zekâ ile anlaşılır geri bildirim ve çalışma önerileri.
- Öğrencinin seçtiği hayvan/bitki karakteri, karakter gelişimi, görevler ve rozetler.
- Veri girişi olmadığında nazik ve ayarlanabilir hatırlatmalar.
- Davet ve onay mekanizmasıyla veli-öğrenci hesabı ilişkilendirme.
- Haftalık/aylık raporları PDF ve DOCX olarak dışa aktarma.
- Duyarlı web arayüzü ve kurulabilir PWA deneyimi.

## Ürün ilkeleri

1. **Öğrenci esenliği:** Utandırma, cezalandırma, korkutma veya öğrencileri birbirleriyle sıralama yoktur.
2. **Doğruluk:** Girdi olmayan kazanım bilgisi tahmin edilmiş gerçek gibi sunulmaz. Net hesabı deneme türüne ait açık kurala dayanır.
3. **İnsan denetimi:** Yapay zekâ çıktıları öneridir; kesin akademik hüküm veya profesyonel danışmanlık yerine geçmez.
4. **Gizlilik varsayılanı:** Öğrenci kayıtları yalnızca yetkili hesaplara açılır. Analitik ve bildirimler veri minimizasyonu ilkesiyle tasarlanır.
5. **Erişilebilirlik:** Klavye ile kullanım, görünür odak, okunabilir kontrast, anlaşılır hata mesajları ve ekran okuyucu desteği hedeflenir.
6. **Önce güvenli temel:** Kimlik doğrulama, erişim kontrolü ve veri doğrulama olmadan gerçek öğrenci verileriyle yayın yapılmaz.

## Önerilen teknoloji yığını

Teknoloji kararları uygulama başlamadan önce doğrulanmalı ve sürümler sabitlenmelidir.

- **Web/PWA:** Next.js (App Router), React, TypeScript
- **Stil ve bileşenler:** Tailwind CSS ve erişilebilir bileşenler
- **Veri katmanı:** PostgreSQL
- **Başlangıçta yönetilen altyapı seçeneği:** Supabase (PostgreSQL, Auth, Storage ve RLS); sağlayıcıya özgü özellikler soyutlanmalı
- **Şema ve doğrulama:** Zod veya eşdeğer bir şema doğrulama katmanı
- **Formlar:** React Hook Form veya eşdeğeri
- **Grafikler:** Erişilebilir grafik kütüphanesi; tablo alternatifi de sunulmalı
- **Testler:** Vitest/Jest, React Testing Library, Playwright
- **Dağıtım:** HTTPS destekleyen bir bulut platformu; staging ve production ayrımı
- **Raporlama:** Sunucu tarafında PDF/DOCX üretimi; dosya üretimi yetki kontrolü arkasında

Sürümler ve sağlayıcı seçimi uygulama başlangıcında kararlaştırılmalı; Cursor tarafından rastgele veya gerekçesiz bağımlılık eklenmemelidir.

Faz 0'da verilen servis kararları (Supabase, Vercel, Sentry; e-posta yok; yapay zekâ için Faz 13'te Groq) [docs/DECISIONS.md](docs/DECISIONS.md) içindedir. Supabase kodda bağlıdır ve yerelde çalışır; bulut projeleri ile Vercel henüz kurulmamıştır.

## Başlangıç kurulumu

Proje `create-next-app@16.4.0` ile oluşturuldu. Gereksinim: Node.js 22.12 veya üzeri (geliştirme Node 24 ile doğrulandı).

```bash
npm ci
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Gerçek anahtarları yalnızca `.env.local` içine yazın; bu dosya Git'e eklenmez. Ortak bileşen örneklerini görmek için `.env.local` içinde `UI_PREVIEW_ENABLED=true` yapın ve `http://localhost:3000/onizleme` adresini açın. Bu sayfalarda giriş yoktur ve gerçek öğrenci verisi gösterilmez.

### Yerel veri tabanı ve giriş

Docker Desktop çalışıyor olmalıdır.

```bash
npm run db:start          # yerel Supabase (API: http://127.0.0.1:55321), migration'ları uygular
npx supabase status       # API_URL, ANON_KEY, SERVICE_ROLE_KEY değerlerini gösterir
```

Bu üç değeri `.env.local` içinde `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` alanlarına yazın. `AUTH_SECRET` için en az 32 karakterlik rastgele bir değer üretin (`.env.example` içinde komut var). Ardından:

```bash
npm run accounts -- setup                          # kurgusal veli + öğrenci hesabı; geçici parolalar ekranda bir kez gösterilir
npm run accounts -- reset-password <kullanici_adi> # yeni geçici parola, tüm oturumları kapatır
npm run db:reset                                   # yerel veri tabanını sıfırlar
npm run catalog -- import data/catalog/ornek-katalog.json   # kurgusal ÖRNEK müfredatı yükler (yalnızca yerelde)
npm run catalog -- import data/catalog/meb-8-sinif-2026-2027.json   # MEB 8. sınıf kazanımları (2026-2027)
```

Betikler hedef Supabase adresini gösterir ve "evet" yazılmadan yazma yapmaz. Yerelde yalnızca kurgusal ad kullanın. `data/catalog/ornek-katalog.json` gerçek MEB programı değildir; betik bu dosyayı yerel Supabase dışına yüklemeyi reddeder. Gerçek katalog `data/catalog/meb-8-sinif-2026-2027.json`; kaynakları ve dosya biçimi [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) içinde ("Müfredat kataloğu").

## Önerilen depo yapısı

```text
lgs-pusula/
├── .cursor/
│   └── rules/
│       ├── 00-project.mdc
│       ├── 10-security.mdc
│       ├── 20-architecture.mdc
│       └── 30-ui-ux.mdc
├── README.md
├── roadmap.md
├── SECURITY.md
├── AUTHORIZATION.md
├── PRIVACY.md
├── UI_UX_GUIDELINES.md
├── CONTRIBUTING.md
├── .env.example
├── .gitignore
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── DECISIONS.md
├── public/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── lib/
│   ├── services/
│   └── types/
└── tests/
```

## Temel modüller

- `auth`: oturum, kayıt, parola sıfırlama
- `profiles`: rol ve profil bilgileri
- `family-links`: veli-öğrenci daveti, onayı, iptali
- `curriculum`: ders, konu ve kazanım kataloğu
- `study-logs`: günlük çalışma kayıtları
- `exams`: denemeler, ders sonuçları, kazanım eşleştirmeleri
- `coaching`: açıklanabilir kurallar ve öneri üretimi
- `mascot`: karakter, gelişim aşaması, rozetler
- `notifications`: kullanıcı tercihleri ve hatırlatmalar
- `reports`: haftalık/aylık PDF ve DOCX çıktıları
- `imports`: doğrulanmış CSV/XLSX ve gerektiğinde PDF içe aktarma
- `admin`: katalog ve sistem yönetimi

## Veri girişi ve içe aktarma

İlk sürümde elle giriş ana akış olmalıdır. Dosya aktarımı, elle girişle aynı doğrulama kurallarını kullanmalıdır.

- İçe aktarma önizlemesi ve kullanıcı onayı sunulmalı.
- Satır bazında hata ve düzeltme açıklaması gösterilmeli.
- Dosya boyutu, uzantı, MIME türü ve içerik doğrulanmalı; yalnızca dosya uzantısına güvenilmemeli.
- Dosyalar web kök dizininde çalıştırılabilir şekilde saklanmamalı.
- PDF içinden otomatik çıkarım yapılırsa çıkarılan veriler kullanıcı tarafından onaylanmadan kesin kayıt olarak yazılmamalı.
- İçe aktarma işlemi mümkünse tekrar çalıştırıldığında kopya kayıt üretmemeli; idempotency yaklaşımı kullanılmalı.

## Koçluk yaklaşımı

Kural motoru önce güvenilir metrikler üretir: hedef tamamlama, ders bazında doğruluk, son denemeler arasındaki değişim ve tekrar gerektiren kazanımlar. Yapay zekâ yalnızca gerekli ve izin verilen bağlamı kullanarak bu sonuçları öğrenci seviyesine uygun bir dille açıklayabilir.

Yapay zekâ:

- Net, puan veya kazanım verisi uydurmamalı.
- Girdiler eksikse bunu açıkça belirtmeli veya ek bilgi istemeli.
- Teşhis, tehdit, utandırma ve kesin başarı garantisi vermemeli.
- Sağlayıcıya gönderilen veriyi en aza indirmeli; mümkün olduğunda doğrudan tanımlayıcıları çıkarmalı.
- Çıktıları şema doğrulamasından geçirmeli ve kullanıcıya öneri olarak göstermeli.
- Sağlayıcı hatası veya kotası dolduğunda kural tabanlı geri dönüş sağlamalı.

## Geliştirme komutları

`package.json` içinde tanımlı komutlar:

```bash
npm run dev           # geliştirme sunucusu
npm run lint          # ESLint
npm run typecheck     # route tiplerini üretir + tsc --noEmit
npm run test          # Vitest birim/bileşen testleri (tek sefer)
npm run test:watch    # Vitest izleme modu
npm run test:e2e      # Playwright (ilk sefer: npx playwright install chromium); giriş testleri yerel Supabase ister, yoksa atlanır
npm run db:start      # yerel Supabase'i başlat (Docker)
npm run db:reset      # yerel veri tabanını sıfırla ve migration'ları uygula
npm run db:stop       # yerel Supabase'i durdur
npm run accounts      # hesap kurulumu / parola sıfırlama betiği
npm run catalog       # müfredat kataloğu yükleme betiği (import <dosya.json> [--dry-run])
npm run format        # Prettier ile biçimlendir
npm run format:check  # biçim kontrolü
npm run build         # production build
npm run check         # lint + typecheck + test + build
```

Bir komut `package.json` içinde tanımlı değilse başarılıymış gibi raporlanmamalıdır.

## Ortam değişkenleri

`.env.example` içinde yalnızca değişken adları ve açıklayıcı yer tutucular bulunmalıdır. Gerçek değerler, erişim belirteçleri ve özel anahtarlar commit edilmemelidir. Tarayıcıya açılan `NEXT_PUBLIC_` değişkenlerinde gizli bilgi bulunmamalıdır.

## Güvenlik ve gizlilik

Güvenlik politikası için [SECURITY.md](SECURITY.md), rol ve erişim modeli için [AUTHORIZATION.md](AUTHORIZATION.md), kişisel veri ilkeleri için [PRIVACY.md](PRIVACY.md) ve arayüz standardı için [UI_UX_GUIDELINES.md](UI_UX_GUIDELINES.md) belgelerini okuyun.

Bu belgeler tek başına KVKK uyumluluğu veya güvenli uygulama garantisi vermez. Yayın öncesinde veri akışları, veli izinleri, saklama/silme süreçleri, tedarikçiler ve hukuki yükümlülükler yetkin kişilerce değerlendirilmelidir.

## Katkı ve Cursor kullanımı

- Her görevden önce ilgili kuralları ve mimariyi okuyun.
- Küçük, gözden geçirilebilir değişiklikler yapın.
- Erişim kontrolü veya veri modeli değişikliklerine test ekleyin.
- Gerçek kullanıcı verilerini geliştirme ortamına kopyalamayın.
- Tamamlanmamış özellikleri, sahte verileri ve sınırlamaları açıkça işaretleyin.
- Ayrıntılar için [CONTRIBUTING.md](CONTRIBUTING.md) dosyasına bakın.

## Lisans

Kapalı kaynak, tüm hakları saklıdır; açık kaynak lisansı verilmemiştir. Ayrıntı: [LICENSE](LICENSE) ve [docs/DECISIONS.md](docs/DECISIONS.md) (0.11).
