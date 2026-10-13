# Yetkilendirme ve Erişim Modeli

## Amaç

Bu belge, LGS Pusula'daki rollerin ve kayıt erişiminin nasıl kontrol edileceğini tanımlar. UI'da bir bağlantıyı gizlemek yetkilendirme değildir. Her veri okuma, oluşturma, değiştirme, silme, dışa aktarma ve yönetim isteği sunucu tarafında doğrulanmalıdır.

## Roller

### Öğrenci
- Kendi profilini ve tercihlerini görebilir/düzenleyebilir.
- Kendi günlük çalışma kayıtlarını ve denemelerini oluşturabilir, görebilir ve düzeltebilir.
- Kendi karakterini, hedeflerini ve raporlarını görebilir.
- Kendi verilerinin erişimini sağlayan aktif veli ilişkilerini görüntüleyebilir.
- Başka öğrencilerin kayıtlarına erişemez.

### Veli
- Yalnızca aktif ve onaylı ilişki bulunan öğrencilerin verilerini görüntüleyebilir.
- Öğrenci verisini değiştirme yetkisi varsayılan olarak verilmez.
- Öğrenci adına kayıt girişi yapılacaksa bu ayrı ve açıkça tanımlanmış bir yetki olmalıdır.
- İlişki daveti oluşturabilir, kabul/ret sürecini tamamlayabilir veya ilişkiyi sonlandırabilir; hangi tarafın hangi işlemi yapabileceği ürün akışında açıkça belirlenmelidir.

### Yönetici
- Müfredat katalogları, sistem ayarları ve kullanıcı desteği için gerekli asgari yetkilere sahip olur.
- Yönetici rolü öğrenci kayıtlarını sınırsız görüntüleme hakkı anlamına gelmemelidir.
- Hassas verilere destek amacıyla erişim gerekiyorsa gerekçe, kapsam, süre ve denetim kaydı bulunmalıdır.
- Yönetici rolü kullanıcı tarafından değiştirilebilir bir profil alanından atanamaz.

### Aile kullanımında hesaplar

Uygulamada iki hesap vardır ([docs/DECISIONS.md](docs/DECISIONS.md), 0.13): proje sahibinin hesabı **veli + yönetici**, çocuğun hesabı **öğrenci** rolündedir. Herkese açık kayıt kapalıdır; hesaplar ve roller yalnızca kurulum betiğiyle oluşturulur.

- Aynı hesapta yönetici rolünün bulunması, öğrenci verisine veli bağlantısının verdiğinden fazla erişim sağlamaz.
- Yönetici sayfaları ve işlemleri MFA doğrulanmış oturum ister; MFA'sız oturum yalnızca veli yetkilerini kullanabilir.
- Veli, öğrencinin kayıtlarını yalnızca okur; giremez ve değiştiremez.
- Yetki testleri iki aile hesabıyla sınırlı kalmaz: kurgusal ek öğrenci/veli hesaplarıyla yatay erişim senaryoları da test edilir.

### Uygulanan durum (Faz 3)

- Oturum ve kullanıcı yalnızca sunucudaki veri erişim katmanından (`src/features/auth/session.ts`) okunur. `requireUser()` oturum yoksa `/giris`'e yönlendirir.
- `profiles` tablosunda RLS açıktır: kullanıcı yalnızca kendi satırını okur; rolünü, geçici parola bayrağını veya başka bir profili değiştiremez (uçtan uca testle doğrulandı). `audit_events` ve oran sınırı tablolarına kullanıcıların hiç erişimi yoktur.
- Rol bazlı sayfa erişimi, veli-öğrenci ilişkisi kontrolleri ve yönetici için MFA **henüz yoktur** (Faz 4). Şu an oturum açan herkes yalnızca kendi `/hesap` sayfasını görür.

## Veli-öğrenci ilişkilendirme akışı

Karar ve gerekçe: [docs/DECISIONS.md](docs/DECISIONS.md) (0.4).

1. Daveti öğrenci başlatır: kısa ömürlü (24 saat), tek kullanımlık ve tahmin edilmesi zor bir kod üretilir. Veri tabanında yalnızca kodun özeti tutulur.
2. Veli, kimliği doğrulanmış oturumla kodu girer; ilişki `pending` olur. Kod girme denemeleri oran sınırlamasına tabidir.
3. Gerekiyorsa yaş ve veli onayı süreçleri ürünün hukuki değerlendirmesine göre tamamlanır.
4. Son onayı öğrenci verir; ilişki `active` durumuna geçer. Kodu bilmek tek başına erişim vermez.
5. İlişki reddedilebilir, süresi dolabilir veya iptal edilebilir.
6. İptal sonrasında erişim bir sonraki istekte kaldırılır; önbellek ve rapor erişimleri de ele alınır.
7. Davet belirteci loglarda veya analitik sistemlerinde açık biçimde tutulmaz.

Önerilen durumlar: `pending`, `active`, `declined`, `expired`, `revoked`.

## Erişim matrisi

| Kaynak/işlem | Öğrenci | Veli | Yönetici |
|---|---|---|---|
| Kendi profili | Oku/düzenle | Oku/düzenle | Gerekli asgari yönetim |
| Kendi günlük kayıtları | CRUD | Aktif ilişki varsa oku | Sınırlı destek; gerekçeli |
| Kendi denemeleri | CRUD | Aktif ilişki varsa oku | Sınırlı destek; gerekçeli |
| Öğrenci karakteri | Kendi karakteri | Oku | Sistem içeriğini yönet |
| Veli-öğrenci bağlantısı | Kendi bağlantısını yönet | Kendi bağlantısını yönet | İstisna desteği, denetimli |
| Müfredat kataloğu | Oku | Oku | CRUD |
| Rapor dışa aktarma | Kendi verisi | Bağlı öğrenci verisi | Varsayılan olarak kapalı; istisna denetimli |
| Sistem rolleri | Hayır | Hayır | Sınırlı ve denetimli |

CRUD: oluşturma, okuma, güncelleme ve silme. Tablo başlangıç politikasıdır; nihai davranış kullanıcı hikâyeleriyle netleştirilmelidir.

## Uygulama kuralları

- Kimliği doğrulanmış kullanıcı kimliği güvenilir oturum bağlamından alınır.
- İstemciden gelen öğrenci kimliği, aktif ilişki veya kayıt sahipliği sunucuda doğrulanır.
- Her sorgu uygun sahiplik/ilişki koşuluyla sınırlandırılır.
- Liste, arama, istatistik, grafik, dışa aktarma ve arka plan işleri de aynı erişim modeline uyar.
- İlişki iptalinde eski URL veya önceden alınmış kimliklerle erişim mümkün olmamalıdır.
- Veri tabanı RLS politikaları varsa uygulama katmanı kontrollerinin yerine değil, ek savunma katmanı olarak kullanılmalıdır.
- Ayrıcalıklı anahtar yalnızca güvenilir sunucu ortamında kullanılmalıdır.

## Zorunlu negatif test senaryoları

- Öğrenci A, URL'deki ID'yi değiştirerek Öğrenci B'nin kaydını okuyamaz.
- Veli A, bağlantısı olmayan öğrencinin raporunu indiremez.
- İptal edilmiş ilişki, önceden bilinen API adresiyle yeniden kullanılamaz.
- Normal kullanıcı kendi rolünü yöneticiye yükseltemez.
- Dosya aktarımındaki satırlar farklı öğrencilere aitmiş gibi yazılamaz.
- Arka plan rapor görevi, talep sahibinin yetkisini doğrulamadan dosya üretemez.
- Arama ve toplu istatistik uçları başka öğrencilere ait verileri sızdırmaz.
- Yönetici işlemleri yetkisiz normal oturumla gerçekleştirilemez.
