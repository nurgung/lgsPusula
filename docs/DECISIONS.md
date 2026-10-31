# Ürün ve Servis Kararları (Faz 0)

Bu belge Faz 0'da proje sahibinin verdiği kararları ve gerekçelerini tutar. Karar değişirse "Değişiklik kaydı" bölümüne tarihli bir satır eklenir ve ilgili belgeler güncellenir.

- Karar tarihi: 12 Ekim 2026
- Karar veren: proje sahibi
- Durum etiketleri: **Karar verildi**, **Taslak (onay bekliyor)**, **Ertelendi**, **Açık**

## Özet

| No   | Konu                            | Karar                                                                                 | Durum         |
| ---- | ------------------------------- | ------------------------------------------------------------------------------------- | ------------- |
| 0.13 | Kullanım kapsamı                | Yalnızca aile içi: proje sahibi (veli + yönetici) ve çocuğu (öğrenci)                 | Karar verildi |
| 0.1  | Veri tabanı ve kimlik doğrulama | Supabase (PostgreSQL, Auth, Storage, RLS), AB bölgesi, ücretsiz plan                  | Karar verildi |
| 0.2  | Barındırma                      | Vercel (Hobby plan); önizleme/staging ve production ayrı                              | Karar verildi |
| 0.3  | Kullanıcı akışları              | İki hesaplı aile akışları; herkese açık kayıt yok                                     | Karar verildi |
| 0.4  | Veli-öğrenci daveti             | Öğrenci kod üretir, veli kodu girer, öğrenci son onayı verir                          | Karar verildi |
| 0.5  | Veli onayı, saklama, KVKK       | Aile içi kullanım; uzman değerlendirmesi gerekmiyor, kapsam genişlerse yeniden açılır | Karar verildi |
| 0.6  | Kazanım veri kaynağı            | MEB güncel 8. sınıf öğretim programları + LGS kapsamı; proje sahibi girer             | Karar verildi |
| 0.7  | Deneme türleri ve net kuralı    | Tam LGS denemesi + branş denemesi; net = doğru − yanlış ÷ 3                           | Karar verildi |
| 0.8  | E-posta/bildirim                | Yalnızca uygulama içi bildirim; e-posta yok (alan adı yok)                            | Karar verildi |
| 0.9  | Hata izleme                     | Sentry (ücretsiz plan), AB veri bölgesi, kişisel veri maskeli                         | Karar verildi |
| 0.10 | Güvenlik açığı bildirimi        | GitHub özel güvenlik açığı bildirimi                                                  | Karar verildi |
| 0.11 | Lisans                          | Kapalı kaynak, tüm hakları saklı; depo herkese açık (kod görünür, kullanım hakkı yok) | Karar verildi |
| 0.12 | Yapay zekâ sağlayıcısı          | Groq ücretsiz plan, sıfır veri saklama açık; kullanım Faz 13'te (MVP sonrası)         | Karar verildi |

## Değişiklik kaydı

| Tarih        | Değişiklik                                                                                                                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12 Ekim 2026 | İlk kararlar verildi.                                                                                                                                                                                                                  |
| 12 Ekim 2026 | Kullanım kapsamı aile içi olarak belirlendi (0.13); 0.1, 0.2, 0.3, 0.4, 0.5, 0.8, 0.9 ve 0.11 buna göre sadeleşti.                                                                                                                     |
| 12 Ekim 2026 | Negatif net kuralı belirlendi (0.7): ders neti eksi olabilir, toplam net eksiyse 0 alınır.                                                                                                                                             |
| 12 Ekim 2026 | Kullanıcı akışları onaylandı (0.3); LGS soru dağılımı proje sahibince doğrulandı (0.7); alan adı olmadığı için e-posta kapsam dışı (0.8); yapay zekâ sağlayıcısı Groq seçildi (0.12).                                                  |
| 12 Ekim 2026 | Depo herkese açık yapıldı (0.11); GitHub özel güvenlik açığı bildirimi açıldı (0.10).                                                                                                                                                  |
| 12 Ekim 2026 | Faz 3 için: giriş kullanıcı adıyla yapılır, yerel geliştirme Docker'da yerel Supabase ile yapılır; `@supabase/supabase-js`, `@supabase/ssr` ve `supabase` CLI eklenmesi onaylandı (0.1).                                               |
| 13 Ekim 2026 | Faz 4 uygulaması: bekleyen veli isteği 24 saat içinde yanıtlanmazsa süresi dolar; öğrenci başına aynı anda en fazla bir bekleyen bağlantı vardır (0.4). Yönetici MFA'sı TOTP'dir; MFA'sız oturum veli sayfalarını kullanabilir (0.13). |
| 22 Ekim 2026 | Bu uygulamanın tek bulut veri tabanı `lgs-pusula-prod`. Dokuz migration uzak projeyle aynı. İkinci ücretsiz proje yeri başka bir uygulamada; o proje duraklatılmaz. Staging ertelenmiş kalır (0.1). |
| 22 Ekim 2026 | Groq şartları 0.12 ölçütleriyle yeniden bakıldı. Eğitim yasağı duruyor. Sıfır saklama panelden açılır; açılmadan kod istek atmaz. Konsol kullanıcısı 18 yaşından büyük olmalıdır. Bölge ABD. |
| 22 Ekim 2026 | Ayrı staging Supabase projesi açılmadı. Proje sahibi, önizleme ortamının bu uygulamanın bulut veritabanı `lgs-pusula-prod` üzerinde çalışmasına karar verdi. `velitakipnew` duraklatılmaz. |
| 24 Ekim 2026 | Görünür karakter aşaması yalnızca puana bağlanmaz. `mascot-v1` puan tablosu durur. `growth-v1` seri, farklı gün, soru ve mevcut puan eşiğini birlikte ister; bir günde bir aşama ilerler. Boş gün seriyi yeniden başlatır, kazanılan aşamayı silmez. Sağlık görünümü kayıt silmez. Bildirim uygulama içidir. |
| 29 Ekim 2026 | Deneme kaydına isteğe bağlı `score` (deneme puanı, 0–500) eklendi. Öğrenci sonuç kağıdından yazar; uygulamada netten puan üretilmez. Haftalık raporda gösterilir; yazılmamışsa "Kayıt yok". |
| 30 Ekim 2026 | Deneme puanı virgülle en fazla 3 ondalık basamak kabul eder (`numeric(8, 3)`). |
| 31 Ekim 2026 | Veli-öğrenci bağlama: yalnızca öğrenci kod üretir. MFA kurulum anahtarı davet kodu değildir. Aynı Supabase projesini paylaşan ortamlarda davet özeti `FAMILY_INVITE_SECRET` ile ortak tutulur. |
| 31 Ekim 2026 | Veli akademik gelişim raporu: haftalık PDF içeriği genişletildi (grafikler, bağlı kazanım eksikleri, ders bazlı net değişimi). Aynı kriterlerle aylık PDF/Word de üretilir. Dönem yine sunucuda İstanbul aralığıdır; istemci yalnızca `scope` + `current`/`previous` gönderir. Tek denemede gelişim yorumu yok. Puan netten üretilmez. |

---

## 0.13 Kullanım kapsamı — Aile içi

**Karar:** Uygulamayı yalnızca proje sahibi ve çocuğu kullanır. Uygulama herkese açık bir hizmet değildir.

| Hesap                  | Roller          | Not                                                           |
| ---------------------- | --------------- | ------------------------------------------------------------- |
| Proje sahibi           | Veli + yönetici | Yönetici yetkisi nedeniyle iki adımlı doğrulama (MFA) zorunlu |
| Proje sahibinin çocuğu | Öğrenci         | Kendi kayıtlarını girer ve düzenler                           |

**Sonuçları:**

- Herkese açık kayıt **kapalıdır**. Uygulamada kayıt sayfası yoktur; iki hesabı proje sahibi bir kurulum betiğiyle oluşturur.
- Veli yalnızca görür; çocuğun kayıtlarını giremez ve değiştiremez.
- Uygulama yine internete açık olduğu için güvenlik kuralları gevşetilmez: kimlik doğrulama, sunucu tarafı yetki kontrolü, RLS, oran sınırlaması ve yetki testleri aynen uygulanır.
- Yönetici yetkisi, veli bağlantısının verdiğinden fazla öğrenci verisi erişimi sağlamaz.
- Kullanım aile dışına açılmak istenirse (başka öğrenciler/veliler) bu karar yeniden açılır. O zaman 0.5'teki uzman değerlendirmesi, açık kayıt akışı, gizlilik bildirimi ve hesap kapatma ekranları yeniden kapsama girer.

## 0.1 Veri tabanı ve kimlik doğrulama — Supabase

**Karar:** Supabase (yönetilen PostgreSQL, Supabase Auth, Storage ve Satır Düzeyi Güvenlik / RLS), ücretsiz plan.

**Gerekçe:** PostgreSQL, kanıtlanmış kimlik doğrulama, özel dosya depolama ve RLS tek yerde gelir. Böylece parola/oturum mekanizmasını sıfırdan yazmayız (`SECURITY.md`). İki kullanıcı için ücretsiz plan yeterlidir.

**Uygulama notları (Faz 3'te uygulanacak):**

- Bölge: AB (Frankfurt, `eu-central-1`).
- Ortamlar: geliştirme yerelde Supabase CLI ile (Docker gerekir); staging ve production bulutta iki ayrı ücretsiz proje. Docker kullanılmak istenmezse geliştirme de staging projesini kurgusal veriyle kullanır. Production verisi başka ortama kopyalanmaz.
- Herkese açık kayıt (sign-up) Supabase ayarlarından kapatılır. Hesaplar `service_role` anahtarıyla çalışan yerel bir kurulum betiğiyle oluşturulur.
- `service_role` anahtarı yalnızca sunucuda ve yerel betikte kullanılır; `NEXT_PUBLIC_` değişkenine konmaz.
- RLS ek savunma katmanıdır; uygulama katmanındaki yetki kontrolünün yerine geçmez (`AUTHORIZATION.md`).
- Sağlayıcıya özgü çağrılar `src/services` altındaki adaptörlerde tutulur; iş kuralları Supabase'e doğrudan bağlanmaz.
- Migration'lar Supabase CLI ile depoda tutulur.
- Giriş **kullanıcı adı + parola** ile yapılır (proje sahibi kararı, 12 Ekim 2026). E-posta gönderilmediği için (0.8) gerçek e-posta istenmez; Supabase Auth'un istediği adres, teslim edilemeyen `<kullanıcı_adı>@users.lgs-pusula.invalid` biçiminde iç bir değerdir.
- Yerel geliştirme ve uçtan uca testler Docker'da çalışan yerel Supabase ile yapılır (proje sahibi kararı, 12 Ekim 2026); CI da aynı yerel ortamı kullanır.
- Bu uygulamanın tek bulut veri tabanı `lgs-pusula-prod` (Frankfurt). Ayrı staging projesi açılmadı (proje sahibi kararı, 13 Ekim 2026; 22 Ekim 2026'da yenilendi): ücretsiz planda hesap başına en fazla 2 aktif proje var ve ikinci yer başka bir uygulamada. O proje duraklatılmaz. 22 Ekim 2026'da proje sahibi, Vercel önizlemesinin de `lgs-pusula-prod` kullanmasına karar verdi. Önizleme bu yüzden production ile aynı verilere yazar. Ayrı proje, yer açıldığında ya da ücretli plana geçilince açılır.

**Ücretsiz planın sınırları:**

- Proje bir hafta kullanılmazsa duraklatılır; panelden tek tıkla yeniden açılır. Veri silinmez.
- Ücretsiz planda otomatik yedek indirme yoktur. Bu yüzden Faz 12.7'deki yedekleme `pg_dump` ile düzenli, şifreli bir yedek alacak şekilde planlanır.

## 0.2 Barındırma — Vercel

**Karar:** Vercel, Hobby (ücretsiz) plan. Hobby plan kişisel ve ticari olmayan kullanım içindir; aile içi kullanım bu kapsama girer. Uygulama ticari hale gelirse ücretli plana geçilmelidir.

| Ortam              | Kaynak dal | Veri tabanı                                      | Amaç                     |
| ------------------ | ---------- | ------------------------------------------------ | ------------------------ |
| Önizleme / staging | Her PR     | Staging Supabase projesi, yalnızca kurgusal veri | Kod incelemesi ve deneme |
| Production         | `main`     | Production Supabase projesi                      | Aile kullanımı           |

**Uygulama notları (Faz 2'de uygulanacak):**

- Sunucu fonksiyonları veri tabanına yakın bölgede çalışır (Frankfurt, `fra1`).
- Gizli değerler Vercel ortam değişkenlerinde, ortam bazında ayrı tutulur.
- Önizleme ortamları production anahtarlarına erişemez.

## 0.3 Kullanıcı akışları

Bu akışlar MVP'nin (Faz 1–12) kapsamını tanımlar ve proje sahibi tarafından onaylandı (12 Ekim 2026). Ekran adları kesin değildir.

### Kurulum (bir kez, proje sahibi yapar)

1. Proje sahibi kurulum betiğini çalıştırır: kendi hesabı (veli + yönetici) ve çocuğunun hesabı (öğrenci) oluşturulur. Geçici parolalar yalnızca betiği çalıştıran kişinin ekranında gösterilir, hiçbir yere kaydedilmez.
2. Proje sahibi ilk girişte MFA'yı kurar.
3. Çocuk ilk girişte parolasını değiştirir.
4. Çocuk veli bağlantısı için kod üretir; veli kodu girer; çocuk onaylar (0.4).

### Ortak: hesap

1. Giriş, çıkış, parola değiştirme, tüm oturumları kapatma.
2. Parolayı unutma: proje sahibi kurulum betiğiyle yeni geçici parola verir (e-posta yok, 0.8).
3. Profil: görünen ad (takma ad olabilir). Ad-soyad, okul, T.C. kimlik numarası, telefon **istenmez**.

### Öğrenci

1. İlk giriş: kısa tanıtım, uygulamanın hangi bilgileri tuttuğunun ve velinin neleri görebildiğinin sade dille anlatımı, karakter seçimi (karakter Faz 10'da gelir).
2. Hedef belirleme: günlük/haftalık soru veya süre hedefi.
3. Günlük kayıt: ders, isteğe bağlı konu/kazanım, soru, doğru, yanlış, boş, süre.
4. Deneme girişi: deneme türü (0.7), tarih, ders bazında doğru/yanlış/boş. İsteğe bağlı olarak yanlış/boş soruları kazanımla eşleştirme.
5. Ana sayfa: bugünün hedefi, ilerleme, öncelikli öneri ve nedeni.
6. Geçmiş ve grafikler: tarih aralığı ve birim gösterilir, her grafiğin tablo karşılığı vardır.
7. Veli bağlantısı: kod üretme, bekleyen isteği onaylama/reddetme, bağlı veliyi görme ve bağlantıyı kaldırma (0.4).
8. Bildirim tercihleri: açma/kapama, sessiz saatler.

### Veli

1. Giriş (MFA ile).
2. Öğrenci bağlama: çocuğun verdiği kodu girer, onayını bekler (0.4).
3. Yalnızca okuma: hedef ilerlemesi, haftalık/aylık özet, deneme sonuçları, öneriler.
4. Haftalık PDF raporu indirme (Faz 11).
5. Bağlantıyı kaldırma.
6. Veli, öğrenci adına kayıt **giremez** ve kaydı değiştiremez.

### Yönetici (aynı veli hesabı)

1. Yönetici yetkisi kayıtla veya profil ekranından alınamaz; yalnızca kurulum betiği/veri tabanı işlemiyle atanır.
2. Yönetici sayfaları MFA doğrulanmış oturum ister.
3. Müfredat kataloğu: ders, konu, kazanım ekleme/düzenleme ve kaynak sürümü girme (Faz 5).
4. Tüm yönetici işlemleri `audit_events` tablosuna yazılır.

### Kapsam dışı (aile kullanımı nedeniyle)

- Herkese açık kayıt ve e-posta doğrulamalı hesap açma.
- Hesap devre dışı bırakma ekranı ve kullanıcı desteği araçları.
- Uygulama içi hesap kapatma ekranı ve resmî gizlilik bildirimi. Yerine verileri dışa aktarma ve tüm verileri silme betiği yazılır (Faz 12).

## 0.4 Veli-öğrenci bağlantısı

**Karar:** Daveti öğrenci başlatır, veli kabul eder, son onayı öğrenci verir. Aile içi kullanımda da bu akış korunur; çocuk, velinin neyi görebildiğini bilerek onay verir.

**Akış:**

1. Öğrenci **Veli bağla** düğmesine basar. Sistem kısa ömürlü, tek kullanımlık bir davet kodu üretir.
2. Öğrenci kodu veliye kendisi iletir. Sistem kodu e-postayla göndermez.
3. Veli kendi hesabıyla giriş yapıp kodu girer. Bağlantı `pending` durumuna geçer.
4. Öğrenci uygulamada "**[görünen ad]** velin olarak bağlanmak istiyor" isteğini görür; **Onayla** veya **Reddet** seçer.
5. Onaylanırsa `active`, reddedilirse `declined` olur. Süre dolan kod `expired` olur.
6. İki taraf da istediği zaman bağlantıyı kaldırabilir (`revoked`). Erişim bir sonraki istekte kalkar.

**Güvenli varsayımlar (değiştirilebilir):**

- Kod geçerlilik süresi: 24 saat. Aynı anda öğrenci başına en fazla bir geçerli kod bulunur; yeni kod eskisini geçersiz kılar.
- Kod tahmin edilmesi zor olmalı (en az ~50 bit rastgelelik, karışması kolay karakterler olmadan). Veri tabanında yalnızca özeti (hash) tutulur, loglara yazılmaz.
- Kod girme denemelerinde hesap ve IP başına oran sınırlaması uygulanır.
- Öğrenci başına en fazla 1 aktif veli bağlantısı.
- Kod girmek tek başına erişim vermez; öğrencinin onayı zorunludur.
- Bekleyen istek de 24 saat içinde yanıtlanmazsa `expired` olur. Öğrenci başına aynı anda en fazla bir bekleyen bağlantı vardır.

## 0.5 Veli onayı, veri saklama ve KVKK — Aile içi kullanım

**Karar:** Uygulama yalnızca aile içinde kullanıldığı için hukuk/gizlilik uzmanı değerlendirmesi yapılmayacak. Bu bölüm hukuki görüş değildir.

**Gerekçe:** KVKK md. 28/1-a, kişisel verilerin üçüncü kişilere verilmemesi ve veri güvenliği yükümlülüklerine uyulması şartıyla, kişinin yalnızca kendisi veya aynı konutta yaşayan aile bireyleriyle ilgili faaliyetler kapsamında işlenmesini kanun kapsamı dışında tutar. Bu istisnanın şartlarını korumak için:

- Veriler aile dışındaki kimseyle paylaşılmaz; dışa aktarılan raporlar da aile içinde kalır.
- Yalnızca gerekli veri tutulur (ad-soyad, okul, kimlik numarası, telefon yok).
- Veri güvenliği kuralları (`SECURITY.md`) aynen uygulanır.
- Bulut hizmetleri (Supabase, Vercel, Sentry, varsa Resend) verileri yalnızca hizmeti sunmak için işler. Sentry'ye ve yapay zekâ sağlayıcısına kişisel veri gönderilmez.

**Veli onayı:** Veli, kurulumu yapan kişidir. Öğrenci, ilk girişte uygulamanın neleri tuttuğunu ve velinin neleri görebildiğini sade dille görür.

**Saklama süreleri (aile kararı, değiştirilebilir):**

| Veri                                    | Saklama                                                      |
| --------------------------------------- | ------------------------------------------------------------ |
| Hesap, çalışma kayıtları, denemeler     | Aile silmek isteyene kadar; silme betiği tüm veriyi kaldırır |
| Davet kodları                           | 24 saat geçerli; kullanılmayanlar 7 gün içinde silinir       |
| Bitmiş/iptal edilmiş bağlantı kayıtları | 1 yıl                                                        |
| `audit_events`                          | 1 yıl                                                        |
| Geçici PDF rapor dosyaları              | 24 saat                                                      |
| Yedekler                                | Son 30 günün yedekleri                                       |
| Hata izleme kayıtları                   | 30 gün, kişisel veri maskeli                                 |

**Kapsam genişlerse:** Uygulama aile dışından kullanıcılara açılırsa bu madde yeniden açılır ve aşağıdaki sorular bir hukuk/gizlilik uzmanına sorulur:

1. 13–14 yaşındaki öğrencinin kendi hesabını açması için veli açık rızası gerekir mi; nasıl alınmalı ve kayıt altına alınmalı?
2. Veri sorumlusu kim olacak; VERBİS kaydı gerekir mi?
3. Aydınlatma metni öğrenci ve veli için ayrı mı olmalı?
4. Yurt dışındaki servis sağlayıcılara veri aktarımı için hangi yöntem gerekir?
5. Deneme sonuçları ve çalışma kayıtları hangi veri kategorisine girer?
6. Saklama süreleri uygun mu?
7. İlgili kişi başvuruları için kanal ve yanıt süresi nasıl olmalı?
8. Veri ihlali durumunda bildirim süreci ve sorumluları?

## 0.6 Ders ve kazanım veri kaynağı

**Karar:** Kaynak, MEB'in güncel 8. sınıf öğretim programları ve MEB'in yayımladığı LGS kapsamıdır. Veriyi proje sahibi yönetici olarak elle girer ve günceller.

- Her ders, konu ve kazanım kaydında **kaynak adı, kaynak sürümü/yılı ve giriş tarihi** tutulur (`learning_outcomes.source_version`).
- MEB programı veya LGS kapsamı değişince proje sahibi yeni sürümü girer. Eski kazanımlar silinmez, "eski sürüm" olarak işaretlenir; böylece geçmiş deneme eşleştirmeleri bozulmaz.
- Kontrol dönemi: her eğitim-öğretim yılının başında ve MEB LGS duyurularından sonra.
- Kazanım verisi girilmemiş bir ders için kazanım analizi gösterilmez.

## 0.7 Deneme türleri ve net kuralı

**Karar:** İki deneme türü vardır. İkisinde de ders bazında net = doğru − (yanlış ÷ 3). Boş soru neti etkilemez.

| Tür              | Kod        | Dersler ve soru sayıları                                                                                                                       |
| ---------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Tam LGS denemesi | `lgs_full` | Türkçe 20, Matematik 20, Fen Bilimleri 20, T.C. İnkılap Tarihi ve Atatürkçülük 10, Din Kültürü ve Ahlak Bilgisi 10, Yabancı Dil 10 (toplam 90) |
| Branş denemesi   | `branch`   | Tek ders; soru sayısını öğrenci girer (1–100 arası)                                                                                            |

**Kurallar:**

- Doğru, yanlış ve boş negatif olamaz; doğru + yanlış + boş = o dersin soru sayısı.
- Net önce her ders için hesaplanır. **Ders neti eksi olabilir** ve eksi değeriyle saklanıp gösterilir (ör. 0 doğru, 3 yanlış → −1).
- Toplam net, eksi olanlar dahil ders netlerinin toplamıdır. **Toplam net eksi çıkarsa 0 alınır.**
- Branş denemesinde tek ders olduğu için ders neti eksi gösterilebilir, toplam net ise en az 0 olur.
- Ortalama ve gelişim grafikleri bu kurala göre hesaplanmış toplam neti kullanır; ders grafikleri ders netini kullanır.
- Net hesabı tek merkezi fonksiyonda yapılır ve deneme türünün kural ayarını kullanır. Her denemeyle birlikte kural sürümü kaydedilir (ör. `lgs-v1`).
- Net değeri kesirli saklanır; ekranda iki ondalık basamakla gösterilir.
- Uygulama **LGS puanı hesaplamaz**. Puan, MEB'in katsayılı ve standart puana dayalı yöntemiyle hesaplanır; yanıltıcı olmaması için yalnızca net gösterilir.

**Örnek (tam LGS denemesi):** Türkçe 15 D / 3 Y → 14; Matematik 0 D / 6 Y → −2; diğer dersler 0 → toplam net 12. Bütün derslerin netleri toplamı −2 olsaydı toplam net 0 alınırdı.

**Soru dağılımı:** Proje sahibi tarafından doğrulandı (12 Ekim 2026). MEB yeni bir kılavuzla dağılımı değiştirirse yeni kural sürümü (ör. `lgs-v2`) eklenir; eski denemeler kendi sürümüyle hesaplanmaya devam eder. Soru sayıları kod içine dağılmaz; tek bir kural ayarında tutulur.

## 0.8 E-posta ve bildirim servisi — Yalnızca uygulama içi

**Karar:** Proje sahibinin alan adı (domain) olmadığı için e-posta gönderilmez. Resend, alan adı doğrulanmadan başkasına e-posta göndermez; bu yüzden kurulmaz. Hatırlatmalar uygulama içinde gösterilir. Web push MVP sonrasına bırakıldı.

- Parola sıfırlamayı proje sahibi kurulum betiğiyle yapar (yeni geçici parola, ilk girişte değiştirilir).
- Supabase Auth'un e-posta doğrulama ve e-postayla parola sıfırlama özellikleri kapalı tutulur; hesaplar betikle "doğrulanmış" olarak oluşturulur.
- İleride alan adı alınırsa Resend eklenebilir: Supabase Auth'un özel SMTP ayarı Resend'e yönlendirilir; SPF, DKIM ve DMARC kayıtları ayarlanır.
- Bildirimlerde sınav sonucu, net veya başka hassas bilgi yer almaz.

## 0.9 Hata izleme — Sentry

**Karar:** Sentry, ücretsiz plan, AB veri bölgesi.

- `sendDefaultPii` kapalı; e-posta, IP, istek gövdesi ve çerezler gönderilmez.
- Oturum tekrarı (session replay) kapalı.
- Kayıt saklama süresi 30 gün.
- Kurulum Faz 12'dedir; o zamana kadar yalnızca platform logları kullanılır ve bunlarda da kişisel veri tutulmaz.

## 0.10 Güvenlik açığı bildirimi

**Karar:** Bildirimler GitHub'ın özel güvenlik açığı bildirimi (Private vulnerability reporting) özelliğiyle alınır. Aile içi kullanımda ayrı bir e-posta adresi gerekmez.

- Özellik 12 Ekim 2026'da açıldı. GitHub bu özelliği yalnızca herkese açık depolarda sunar; depo yeniden gizli yapılırsa bildirim kanalı proje sahibinin kendisi olur.

## 0.11 Lisans

**Karar:** Kapalı kaynak, tüm hakları saklı. Açık kaynak lisansı verilmez.

- Depo kökünde `LICENSE` dosyası bu kararı belirtir.
- GitHub deposu herkese açıktır (12 Ekim 2026, proje sahibi kararı). Kod görülebilir ama `LICENSE` gereği kullanım hakkı verilmez.
- Depo herkese açık olduğu için depoya ve Git geçmişine hiçbir zaman gizli anahtar, `.env.local`, gerçek öğrenci verisi, yedek veya rapor dosyası eklenmez. Yanlışlıkla eklenen bir anahtar hemen iptal edilip yenilenir; yalnızca silmek yetmez.
- Kullanılan açık kaynak bağımlılıkların lisans yükümlülükleri kontrol edilir.

## 0.12 Yapay zekâ sağlayıcısı — Groq

**Karar:** Groq, ücretsiz plan, panelde sıfır veri saklama (ZDR) açık. Yapay zekâ Faz 13'te (MVP sonrası) eklenir; MVP yalnızca kural tabanlı koçluk kullanır. Faz 13'e başlarken Groq'un şartları aşağıdaki ölçütlerle yeniden kontrol edilir.

**Seçim yapılırken kullanılacak ölçütler:**

1. Gönderilen verinin model eğitiminde kullanılmaması (sözleşmeyle güvence).
2. Veri saklama süresi; mümkünse sıfır saklama seçeneği.
3. İşleme bölgesi (AB tercih edilir) ve alt işleyenler.
4. Çocuk kullanıcılarla ilgili kullanım şartları.
5. Yapılandırılmış (şemalı) çıktı desteği.
6. Türkçe metin kalitesi (8. sınıf seviyesinde sade dil).
7. Aylık tahmini maliyet ve harcama sınırı koyabilme.
8. Hata, zaman aşımı ve kota davranışı.

Seçim yapıldığında en az iki sağlayıcı bu ölçütlerle karşılaştırılıp sonuç bu bölüme yazılır.

### Ön karşılaştırma: ücretsiz seçenekler (12 Ekim 2026)

Proje sahibi ücretsiz bir sağlayıcı istedi. Ücretsiz planların koşulları sık değişir; Faz 13'e başlarken bu tablo sağlayıcıların güncel şartlarıyla yeniden kontrol edilmelidir.

| Sağlayıcı (ücretsiz plan) | Veri eğitimde kullanılır mı?                                                          | Saklama                                                     | Bölge       | Değerlendirme                                                           |
| ------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| Groq                      | Hayır; sözleşmeyle yasak, ücretsiz planda da                                          | Varsayılan saklamaz; sıfır saklama (ZDR) ayarı herkese açık | ABD         | **Önerilen.** Açık kaynak modeller; hız ve kota sınırı var              |
| Mistral                   | Ücretsiz planda varsayılan olarak evet; panelden kapatılabilir                        | Ücretsiz planda sıfır saklama yok                           | AB (Fransa) | Yedek seçenek; eğitim izni mutlaka kapatılmalı                          |
| Google Gemini             | Evet; Türkiye AB/AEA dışında olduğu için ücretsiz planda insan incelemesi de olabilir | Ücretsiz planda kontrol yok                                 | Küresel     | **Önerilmez:** Google çocuğa ait/kişisel veri gönderilmemesini söylüyor |

**Seçim (proje sahibi onayladı, 12 Ekim 2026):** Groq ücretsiz plan, panelde sıfır veri saklama (ZDR) açık. Model `llama-3.3-70b-versatile` (22 Ekim 2026). Başka model kimliği kodda reddedilir.

### Yeniden kontrol (22 Ekim 2026)

Kaynaklar: [Groq hizmet sözleşmesi](https://console.groq.com/docs/legal/services-agreement/) (belgeler 22 Haziran 2026'da güncellenmiş) ve [Your Data in GroqCloud](https://console.groq.com/docs/your-data).

| Ölçüt | Durum |
| --- | --- |
| Eğitimde kullanılmama | Sözleşmede yasak. Müşteri açıkça izin vermedikçe girdi ve çıktı eğitimde kullanılmaz. Ücretsiz kullanım da bu maddeye girer. |
| Saklama | Çıkarım varsayılan olarak saklanmaz. Güvenilirlik ve kötüye kullanım kaydı 30 güne kadar tutulabilir. Sıfır saklama (ZDR) herkese açık; panelden açılır. Açılınca bu kayıt ve saklama isteyen özellikler kapanır. |
| Bölge | Müşteri verisi ABD'deki Google Cloud kovalarında durur. AB bölgesi yok. |
| Çocuk | Konsolu kullanan kişi 18 yaşından büyük olmalıdır. Hizmet çocuklara yönelik değildir. Bu yüzden çocuk Groq hesabı açmaz; istek yalnızca veli hesabındaki anahtarla, sunucudan, adsız özetle gider. |
| Şemalı çıktı | Sohbet ucu JSON nesnesi isteyebilir. Kod tek alan kabul eder: `text`. |
| Türkçe | Model kimliği sabitlendi. Cümle kural kartının yanındadır; kural metni durur. |
| Maliyet | Ücretsiz kullanım sınırı vardır. Günlük istek tavanı `AI_DAILY_REQUEST_LIMIT` (varsayılan 20, en fazla 100). |
| Hata ve kota | Zaman aşımı, kota ve bozuk gövde kural kartına döner. |

**Sıfır saklama:** Proje sahibi 22 Ekim 2026'da Groq Data Controls içinde kuruluş için Zero Data Retention açtığını bildirdi. `AI_ZDR_CONFIRMED=true` Vercel Production ve yerel `.env.local` içindedir. `AI_ENABLED=true` ve `AI_PROVIDER=groq` de oradadır. `AI_API_KEY` yerel `.env.local` ve Vercel Production gizli değişkenindedir; depoda yoktur. Yerel öğrenci anahtarı `ogrenci` hesabında açıktır. Production'da aile hesabı olmadığı için orada anahtar satırı yoktur. Depodaki örnek değerler `false` kalır.

**Koşullar:**

- Sağlayıcıya ad, e-posta, okul veya kimlik bilgisi gönderilmez; yalnızca kural motorunun ürettiği özet metrikler gider (ör. "Matematik doğruluk oranı son iki haftada %55'ten %62'ye çıktı").
- Ücretsiz kota dolduğunda veya servis yanıt vermediğinde kural tabanlı öneri gösterilir; uygulama yapay zekâya bağımlı olmaz.
- Sağlayıcı adaptör arkasında olduğu için Groq'un koşulları değişirse kod değişmeden başka sağlayıcıya geçilebilir.
- Yapay zekâ ayarlardan tamamen kapatılabilir.
