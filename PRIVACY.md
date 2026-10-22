# Gizlilik ve Kişisel Veri İlkeleri

## Amaç

LGS Pusula, çocukların eğitim ve çalışma kayıtlarını işleyebileceğinden gizlilik, veri minimizasyonu ve hesap verebilirlik tasarımın temelidir. Bu belge teknik ve ürün ilkelerini tanımlar; tek başına hukuki uygunluk veya KVKK uyumluluğu beyanı değildir.

## Kullanım kapsamı

Uygulama yalnızca aile içinde (proje sahibi ve çocuğu) kullanılır. Bu nedenle resmî gizlilik bildirimi, açık kayıt ve hukuk uzmanı değerlendirmesi şimdilik kapsam dışıdır; veri minimizasyonu ve güvenlik ilkeleri ise aynen geçerlidir. Saklama süreleri ve gerekçe: [docs/DECISIONS.md](docs/DECISIONS.md) (0.5, 0.13). Uygulama aile dışından kullanıcılara açılırsa aşağıdaki "Yayın öncesi kontrol" listesinin tamamı yeniden zorunlu hale gelir.

## Veri minimizasyonu

Yalnızca tanımlanmış ürün amacı için gerekli veriler toplanmalıdır. Mümkün olduğunda aşağıdaki bilgiler toplanmamalıdır:
- Gereksiz kimlik numaraları, açık adresler veya hassas kişisel bilgiler.
- Koçluk için gerekmeyen iletişim ve aile bilgileri.
- Yapay zekâ sağlayıcısına ihtiyaç dışı öğrenci/veli tanımlayıcıları.
- Amaçla ilgisi olmayan konum veya cihaz izleme verileri.

## Veri kategorileri

Uygulama tasarımında şu kategoriler değerlendirilebilir:
- Hesap ve kimlik doğrulama bilgileri.
- Öğrenci profili ve sınıf bilgisi.
- Veli-öğrenci ilişki ve onay kayıtları.
- Günlük çalışma kayıtları ve hedefler.
- Deneme sonuçları, konu ve kazanım bilgileri.
- Karakter, görev ve bildirim tercihleri.
- Güvenlik ve sistem işlem kayıtları.
- Raporlar ve kullanıcı tarafından içe aktarılan dosyalar.

Her kategori için amaç, hukuki işleme şartı, erişim grubu, saklama süresi, silme yöntemi ve üçüncü taraf aktarımı belgelenmelidir.

## Çocuk kullanıcılar ve veli süreci

- Öğrencinin yaşı ve ürünün kullanım biçimi dikkate alınarak uygun veli bilgilendirme/onay akışı hukuk uzmanıyla değerlendirilmelidir.
- Veli-öğrenci ilişkisinin kurulması, doğrulanması, iptali ve kayıt altına alınması açık olmalıdır.
- Veliye ait yetki, yalnızca e-posta veya bağlantıyı bilmeye dayanmamalıdır.
- Öğrenciye gizlilik metinleri yaşına uygun, sade bir dille açıklanmalıdır.
- Çocuğu manipüle eden, aşırı bildirim gönderen veya suçluluk yaratan tasarımlardan kaçınılmalıdır.

## Amaçla sınırlılık ve erişim

- Veriler yalnızca açıklanan amaçlar için işlenmelidir.
- Erişim, `AUTHORIZATION.md` içindeki rol ve ilişki modeline göre sınırlandırılmalıdır.
- Yönetici ve destek erişimleri sınırlı, gerekçeli ve denetlenebilir olmalıdır.
- Üçüncü taraf hizmetlere veri gönderimi öncesinde amaç, kapsam ve sözleşme koşulları incelenmelidir.

## Yapay zekâ ve üçüncü taraflar

- Modele yalnızca öneri üretmek için gerekli en az veri gönderilmelidir.
- Mümkün olduğunda ad, e-posta, okul ve doğrudan tanımlayıcılar çıkarılmalıdır.
- Sağlayıcının verileri model eğitimi için kullanıp kullanmadığı, saklama süresi, işleme bölgesi ve alt işleyenleri değerlendirilmelidir.
- Model istemleri ve yanıtları hassas öğrenci kayıtlarıyla birlikte varsayılan olarak saklanmamalıdır.
- Kullanıcıya yapay zekâ desteğinin kapsamı ve sınırlılıkları anlaşılır biçimde anlatılmalıdır.
- Yapay zekâ sağlayıcısı değiştirildiğinde veri akışı ve gizlilik değerlendirmesi yeniden yapılmalıdır.

## Saklama, dışa aktarma ve silme

- Her veri türü için gerekçeli saklama süresi belirlenmelidir; süresiz saklama varsayılan olmamalıdır.
- Hesap kapatma ve veri silme talebi için süreç oluşturulmalıdır.
- Yedeklerdeki verilerin silinme zamanlaması ve istisnaları belgelenmelidir.
- PDF/DOCX raporlarının geçici dosyaları güvenli biçimde ve belirlenen sürede temizlenmelidir. Haftalık PDF (Faz 11) herkese açık bir dosya yolu değildir; baytlar `report_jobs` içindedir ve en geç 24 saat sonra silinmek üzere işaretlenir. Veli paneli ve `purge_retained_rows()` süresi dolan satırı siler. DOCX henüz yoktur. Dışa aktarma `npm run data -- export` ile yapılır; dosya `backups/` altındadır ve depoya girmez. Tüm hesapları silmek `npm run data -- erase` ile olur ve müfredat kataloğunu silmez.
- İçe aktarılan ham dosyalar, amaç tamamlandıktan sonra saklanmaya devam edecekse bunun gerekçesi belirlenmelidir.
- Yasal saklama yükümlülükleri varsa, kapsam ve süre ayrıca belgelenmelidir.

## Çerezler, analitik ve bildirimler

- Zorunlu olmayan analitik/izleme teknolojileri için gereken tercih ve izin mekanizması değerlendirilmelidir.
- Reklam izleyicileri ve gereksiz üçüncü taraf betikleri eklenmemelidir.
- Bildirimler kapatılabilir ve sıklıkları sınırlandırılabilir olmalıdır.
- Kilit ekranında veya e-postada hassas sınav bilgileri gösterilmemelidir.
- Ortak cihazlarda oturum güvenliği ve otomatik çıkış davranışı değerlendirilmelidir.

## İlgili kişi hakları ve olay yönetimi

Veri sorumlusu, başvuru kanalı, başvurulara yanıt süreci, veri ihlali değerlendirmesi ve bildirim yükümlülükleri yayından önce belirlenmelidir. İhlal müdahale planı; kapsamı sınırlama, kanıtları koruma, etki değerlendirmesi, gerekli bildirimler ve düzeltici faaliyetleri kapsamalıdır.

## Yayın öncesi kontrol

- [ ] Veri envanteri ve veri akış haritası hazır.
- [ ] Gizlilik bildirimi ve kullanıcı aydınlatmaları hukuk incelemesinden geçti.
- [ ] Çocuk kullanıcılar ve veli onayı süreci değerlendirildi.
- [ ] Tüm üçüncü taraflar ve veri işleme koşulları kaydedildi.
- [x] Saklama/silme süreleri tanımlandı.
- [x] Veri dışa aktarma betiği yerel kurgusal veriyle denendi. Hesap silme betiği onay sözcüğü olmadan çalışmaz; production'da çalıştırılmadı.
- [ ] Log ve analitik sistemlerinde gereksiz kişisel veri bulunmuyor. Kod yolu test edildi. Sentry projesi henüz yok; DSN boşken gönderim olmaz.
- [x] Yapay zekâya giden veri, kural kartındaki sayılardan oluşan kısa bir özettir. Ad, e-posta ve hesap kimliği çıkarılır. Anahtar yoksa veya sıfır saklama onaylanmamışsa istek gitmez (22 Ekim 2026, karar 0.12).
