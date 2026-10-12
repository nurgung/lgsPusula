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
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (yüksek, DoS) | `braces` ≤ 3.0.3, yalnızca geliştirme aracı: `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` | Yamalı sürüm yok (12 Ekim 2026). `npm audit fix --force` ESLint yapılandırmasını Next 14'e düşürür. Paket production paketine girmez; yalnızca geliştiricinin kendi kodunu tarayan lint sırasında, depodaki glob desenleriyle çalışır. Saldırganın desen gönderebileceği bir yol yok. | `braces` veya `eslint-config-next` yamalı sürüm yayınladığında (Dependabot PR'ı) hemen güncellenir. |

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

## Güvenlik açığı bildirimi

Güvenlik açıklarını herkese açık issue olarak değil, GitHub'ın özel bildirim kanalıyla iletin. Bildirimlerde gerçek öğrenci verisi veya açıkları istismar etmeye yarayacak gereksiz ayrıntılar paylaşılmamalıdır.

- Bildirim kanalı: GitHub deposunda **Security → Report a vulnerability** (Private vulnerability reporting). Bu kanal açıktır.
- E-posta adresi: **Henüz açılmadı**; açıldığında buraya eklenecek.
- Beklenen bilgiler: etkilenen bileşen, etki, yeniden üretim için güvenli adımlar ve iletişim yöntemi.
- Bildirimler doğrulanana kadar kamuya açık paylaşım yapılmaması rica edilir.

## Yayın öncesi güvenlik kontrol listesi

- [ ] Yetkisiz nesne erişimi/IDOR testleri.
- [ ] RLS ve sunucu tarafı yetki testleri.
- [ ] Oturum, parola sıfırlama ve oran sınırlaması testleri.
- [ ] Dosya yükleme, içe aktarma ve rapor indirme testleri.
- [ ] Gizli anahtar ve bağımlılık taraması.
- [ ] Yapay zekâ istem enjeksiyonu ve veri minimizasyonu testleri.
- [ ] Yedekleme geri yükleme denemesi.
- [ ] Hata izleme ve loglarda hassas veri kontrolü.
- [ ] Veri saklama/silme akışlarının doğrulanması.
- [ ] Kritik/yüksek riskli bulguların giderilmesi.
