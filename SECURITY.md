# Güvenlik Politikası — LGS Pusula

## Amaç ve kapsam

Bu belge, LGS Pusula geliştirme ve işletim süreçlerinde uygulanması gereken güvenlik ilkelerini tanımlar. Bu belge tek başına uygulamanın güvenli olduğunu kanıtlamaz. Kontroller kod, altyapı, veri tabanı politikaları ve testlerle uygulanıp doğrulanmalıdır.

## Temel ilkeler

- Güvenli varsayılanlar ve en az ayrıcalık.
- Sunucu tarafında kimlik doğrulama ve her istekte yetkilendirme.
- İstemci girdilerine ve yüklenen dosyalara güvenmeme.
- Hassas verileri toplamama veya gereksiz yere loglamama.
- Bağımlılıkların ve altyapının güncel tutulması.
- Güvenlik kontrollerinin kod incelemesi ve otomatik testlerle doğrulanması.

## Kimlik doğrulama ve oturumlar

- Kanıtlanmış bir kimlik doğrulama çözümü kullanın; özel parola/oturum mekanizmasını sıfırdan yazmayın.
- Parolaları düz metin veya geri döndürülebilir şifreleme ile saklamayın.
- Güvenli, HttpOnly ve uygun SameSite özelliklerine sahip çerezler kullanın; üretimde HTTPS zorunlu olsun.
- Oturum yenileme, çıkış, parola değişimi ve hesap kurtarma akışlarını test edin.
- Giriş ve parola sıfırlama uçlarında oran sınırlaması ve kötüye kullanım önlemleri uygulayın.
- Yönetici hesaplarına daha güçlü kimlik doğrulama, mümkünse MFA uygulayın.
- Oturum kimliklerini URL'lerde veya istemci loglarında taşımayın.

### Uygulanan kontroller (Faz 3)

Ayrıntı: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ("Veri tabanı ve kimlik doğrulama").

- Kimlik doğrulama Supabase Auth ile yapılır; parolalar Supabase'de bcrypt ile saklanır. Uygulama parola saklamaz ve loglamaz.
- Herkese açık kayıt kapalıdır. Hesapları yalnızca `service_role` anahtarıyla çalışan kurulum betiği oluşturur. Geçici parola ilk girişte değiştirilmek zorundadır.
- Oturum çerezleri `HttpOnly`, `Secure`, `SameSite=Lax`; tarayıcıda Supabase istemcisi yoktur.
- Her sayfa ve işlem oturumu Auth sunucusuna sorarak doğrular; başka cihazda kapatılan oturum bir sonraki istekte geçersiz olur.
- Giriş ve parola değiştirmede IP, kullanıcı adı ve kullanıcı başına oran sınırlaması vardır; sınırlayıcıya ulaşılamazsa istek reddedilir. Hatalı girişte, kullanıcı adı yanlış da olsa parola yanlış da olsa aynı mesaj gösterilir (hesap varlığı sızdırılmaz).
- Güvenlik olayları `audit_events` tablosuna parola, belirteç, açık kullanıcı adı veya IP olmadan yazılır.
- Test kapsamı: `src/features/auth/*.test.ts` (birim), `tests/e2e/auth.spec.ts` (yerel Supabase'e karşı: kayıt kapalı, çerez özellikleri, oran sınırı, rol değiştirememe, RLS, oturum kapatma, loglarda gizli bilgi olmaması).

**Bilinen sınırlar:**

- Supabase Auth'un kendi IP sınırı (bulutta 5 dakikada 30 giriş) sunucunun IP'sine uygulanır, çünkü giriş istekleri Vercel'den gelir. Asıl koruma uygulamanın kendi sınırlarıdır.
- Vercel dışında (ör. yerelde) `x-real-ip` başlığı taklit edilebilir; IP sınırı yalnızca Vercel arkasında güvenilirdir. Kullanıcı adı sınırı her ortamda geçerlidir.
- Kullanıcı adı sınırı, başkasının yanlış denemeleriyle de dolabilir; bu durumda gerçek kullanıcı da 15 dakika giriş yapamaz. Sınır bu sürenin sonunda kendiliğinden kalkar.

## Yetkilendirme

- Rol kontrollerini yalnızca arayüzde yapmayın. Sunucu ve veri tabanı katmanında da doğrulayın.
- Her öğrenci kaydı için sahiplik veya aktif veli-öğrenci ilişkisi doğrulayın.
- İstemciden gelen `userId`, `studentId`, rol veya sahiplik alanlarını tek başına doğru kabul etmeyin.
- Supabase kullanılıyorsa RLS politikalarını etkinleştirin ve negatif testlerle doğrulayın.
- `service_role` gibi ayrıcalıklı anahtarları tarayıcıya göndermeyin.
- İdari işlemler için ayrı, dar kapsamlı izinler tanımlayın.

## Veri doğrulama ve web güvenliği

- İstemci ve sunucu tarafında şema doğrulaması yapın; sunucu doğrulaması zorunludur.
- SQL sorgularında parametreli sorgular veya güvenli ORM kullanın.
- XSS, CSRF, SSRF, açık yönlendirme, IDOR/BOLA ve güvenli olmayan doğrudan nesne erişimi risklerini değerlendirin.
- İçerik Güvenlik Politikası (CSP), güvenlik başlıkları ve HTTPS yapılandırmasını uygun şekilde uygulayın.
- Hata yanıtlarında stack trace, SQL, gizli anahtar veya iç sistem ayrıntısı göstermeyin.
- Kullanıcı tarafından girilen metni HTML olarak çalıştırmayın.

## Dosya yükleme ve dışa aktarma

- İzin verilen dosya türlerini açıkça belirleyin; uzantı, MIME ve dosya imzasını kontrol edin.
- Dosya boyutu, satır sayısı, sayfa sayısı ve işlem süresi sınırları koyun.
- Yüklenen dosyaları web kök dizini dışında ve özel depolamada tutun.
- Dosya adlarını güvenilir kullanıcı girdisi olarak kullanmayın; rastgele kimlik üretin.
- Makro, formül, gömülü betik veya harici bağlantı içeren içerikleri çalıştırmayın.
- XLSX/CSV içe aktarımında formül enjeksiyonunu önleyin; hücre içeriklerini güvenli şekilde işleyin.
- PDF/DOCX üretiminde HTML veya şablon enjeksiyonunu önleyin.
- İçe aktarma ve rapor indirme isteklerinde yetkiyi yeniden kontrol edin.
- Geçici dosyaları ve başarısız yüklemeleri belirlenen süre içinde silin.

## Yapay zekâ güvenliği

- Kullanıcı verisini modele göndermeden önce gerekli olan en az bağlamı belirleyin.
- Doğrudan tanımlayıcıları ve veli/öğrenci iletişim bilgilerini mümkün olduğunda modele göndermeyin.
- Öğrenci kayıtlarını model talimatı gibi değerlendirmeyin; kullanıcı metninin istem enjeksiyonu içerebileceğini varsayın.
- Model çıktısını güvenilmeyen veri kabul edin. Şema doğrulaması, uzunluk sınırı ve içerik güvenliği uygulayın.
- Model çıktısı doğrudan SQL, kod, erişim kontrolü, puan veya karakter ödülü belirlememelidir.
- Sayısal analizleri kural motorundan üretin; model yalnızca açıklama/öneri oluşturabilir.
- Sağlayıcı hatası, zaman aşımı ve kota aşımında güvenli kural tabanlı geri dönüş sağlayın.
- Sağlayıcıların veri saklama, model eğitimi, bölge ve alt işleyen koşullarını değerlendirin.
- İstemler ve yanıtlar varsayılan olarak hassas kayıtlarla birlikte loglanmamalıdır.

## Gizli bilgiler ve bağımlılıklar

- Gerçek `.env` dosyalarını, anahtarları ve kimlik bilgilerini Git'e eklemeyin.
- `.env.example` yalnızca boş/örnek değer içersin.
- Tarayıcıya açılan ortam değişkenlerinde gizli bilgi bulundurmayın.
- Kilit dosyası kullanın; bağımlılık ve güvenlik uyarılarını düzenli izleyin.
- Üretim dağıtımında en az yetkili servis hesapları kullanın.
- Geliştirme, test ve production verilerini ayırın.

### Otomatik denetimler (CI)

`.github/workflows/ci.yml` her push ve PR'da, ayrıca her pazartesi 08:00'de (Türkiye saati, 05:00 UTC) şunları çalıştırır:

- `npm audit --omit=dev --audit-level=moderate`: uygulamayla birlikte çalışan (production) bağımlılıklarda orta veya üstü uyarı varsa CI **kırmızı** olur.
- `npm audit --audit-level=high` (tüm bağımlılıklar): yalnızca rapor verir, CI'ı durdurmaz. Aşağıdaki kabul edilen riskler bu yüzden görünür kalır.
- Gitleaks: push ve PR'da yeni commit'lerde, haftalık ve elle başlatılan çalıştırmada tüm commit geçmişinde gizli anahtar taraması; bulgu varsa CI kırmızı olur.
- Dependabot haftalık olarak npm ve GitHub Actions güncellemelerini önerir.

### Kabul edilen bağımlılık riskleri

Bir uyarı düzeltilemiyorsa burada gerekçesi ve gözden geçirme koşuluyla kayıt altına alınır.

| Uyarı | Paket ve yol | Neden kabul edildi | Ne zaman yeniden bakılır |
|---|---|---|---|
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (yüksek, DoS) | `braces` ≤ 3.0.3, yalnızca geliştirme aracı: `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` | Yamalı sürüm yok (13 Ekim 2026'da yeniden bakıldı; npm'deki son sürüm hâlâ 3.0.3). `npm audit fix --force` ESLint yapılandırmasını Next 14'e düşürür. Paket production paketine girmez; yalnızca geliştiricinin kendi kodunu tarayan lint sırasında, depodaki glob desenleriyle çalışır. Saldırganın desen gönderebileceği bir yol yok. | `braces` veya `eslint-config-next` yamalı sürüm yayınladığında (Dependabot PR'ı) hemen güncellenir. |

## Loglama ve izleme

- Giriş hataları, yetki reddi, dosya içe aktarma hataları ve yönetici değişiklikleri gibi olayları gerekli ölçüde kaydedin.
- Parola, oturum belirteci, API anahtarı, tam deneme kayıtları veya gereksiz kişisel bilgileri loglamayın.
- Log erişimini sınırlayın ve saklama süresini belirleyin.
- Hata izleme servislerine kişisel veri gönderimini azaltın veya maskeleyin.

## Yedekleme ve süreklilik

- Yedekleri şifreleyin, erişimi kısıtlayın ve saklama süresi belirleyin.
- Geri yükleme prosedürünü düzenli olarak deneyin.
- Veri kaybı, hesap ele geçirilmesi ve sağlayıcı kesintisi için olay planı hazırlayın.
- Üretim değişiklikleri için geri alma planı tutun.

## Olay müdahalesi

Aile içi kullanımda müdahale eden kişi proje sahibidir. Bu bölüm bir hukuk bildirimi değildir.

1. Kapsamı sınırla. Etkilenen hesabın parolasını `npm run accounts -- reset-password` ile yenile. Gerekirse Vercel dağıtımını durdur.
2. Kanıtı koru. `audit_events` ve platform logları parola, çerez, davet kodu veya deneme sonucu içermeden saklanır. Ham yedek şifreli kalır ve depoya girmez.
3. Etkiyi yaz. Hangi hesap, hangi tablo, hangi saat. Notlara öğrenci kaydı yapıştırma.
4. Bildir. Aile içinde kararı proje sahibi verir. Depodaki bir açık, herkese açık issue değil, GitHub'ın özel güvenlik kanalına yazılır.
5. Düzelt ve geri yükle. `npm run backup -- restore` onay sözcüğü olmadan yazmaz. Saklama temizliği `npm run data -- retain` ile yapılır.
6. Yedekler 30 gün durur, sonra silinir. Silinen hesabın yedekteki kopyası bu sürenin sonunda gider.

## Güvenlik açığı bildirimi

Güvenlik açıklarını herkese açık issue olarak değil, GitHub'ın özel bildirim kanalıyla iletin. Bildirimlerde gerçek öğrenci verisi veya açıkları istismar etmeye yarayacak gereksiz ayrıntılar paylaşılmamalıdır.

- Bildirim kanalı: GitHub deposunda **Security → Report a vulnerability** (Private vulnerability reporting). Bu kanal açıktır.
- E-posta adresi: **Henüz açılmadı**; açıldığında buraya eklenecek.
- Beklenen bilgiler: etkilenen bileşen, etki, yeniden üretim için güvenli adımlar ve iletişim yöntemi.
- Bildirimler doğrulanana kadar kamuya açık paylaşım yapılmaması rica edilir.

## Yayın öncesi güvenlik kontrol listesi

- [x] Yetkisiz nesne erişimi/IDOR testleri. `tests/e2e/access.spec.ts` 21 Ekim 2026'da yeniden geçti.
- [x] RLS ve sunucu tarafı yetki testleri. Aynı çalışma ve `tests/e2e/auth.spec.ts`.
- [x] Oturum, parola sıfırlama ve oran sınırlaması testleri. `tests/e2e/auth.spec.ts` aynı gün geçti.
- [x] Rapor indirme testleri. `tests/e2e/reports.spec.ts` aynı gün geçti. Dosya yükleme ucu yok (Faz 13).
- [ ] Gizli anahtar ve bağımlılık taraması. Bu turda Gitleaks yerelde çalıştırılmadı. CI push'ta çalışır. `braces` kabul edilen risk olarak duruyor.
- [x] Yapay zekâ istemi yok. Kod Groq'a istek atmaz. İstem enjeksiyonu testi Faz 13'te.
- [x] Yedekleme geri yükleme denemesi. Yerel tablo şifrelenip geri yüklendi (21 Ekim 2026). Production yedeği alınmadı.
- [x] Hata izleme kodu hassas alanları göndermez (`scrub.test.ts`). Canlı Sentry projesi henüz yok; DSN boşken gönderim olmaz.
- [x] Saklama temizliği yerel testle doğrulandı (`tests/e2e/retention.spec.ts`). `erase` production'da çalıştırılmadı.
- [x] Bu turda açılan yüksek bulgu kapatıldı: katı CSP için satır içi stil kalktı, çevrimdışı önbellek kayıt tutmuyor. `braces` kabul edilen risk olarak duruyor.
