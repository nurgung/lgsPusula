# UI/UX Tasarım İlkeleri — LGS Pusula

## Tasarım hedefi

LGS Pusula; 8. sınıf öğrencileri için güven veren, modern, anlaşılır ve motive edici bir çalışma alanı olmalıdır. Görsel çekicilik; hareket, renk veya rozet yoğunluğundan değil, net bilgi hiyerarşisinden, karakter tasarımından ve ilerlemenin anlaşılır gösterilmesinden gelmelidir.

## Tasarım ilkeleri

1. Öğrenci önce bugünkü bir sonraki adımını görmelidir.
2. Akademik veriler görsel olarak sade ve karşılaştırılabilir olmalıdır.
3. Mobil kullanım birincil senaryolardan biridir.
4. Her etkileşimde yükleniyor, boş, başarı ve hata durumları tasarlanmalıdır.
5. Renk tek başına anlam taşımamalı; metin, ikon veya desenle desteklenmelidir.
6. Öğrenciler birbirleriyle sıralanmamalı; kişisel gelişim öne çıkarılmalıdır.
7. Bildirimler destekleyici olmalı; suçluluk, korku veya ceza dili içermemelidir.

## Görsel kimlik

- Genel his: temiz, modern ve profesyonel bir eğitim uygulaması; canlı ama aşırı çocukça değil.
- Renk yaklaşımı: açık mavi/beyaz yüzeyler; kontrollü turkuaz (marka) vurgu; başarı için ölçülü yeşil; dikkat için kehribar; hata için erişilebilir kırmızı; özet bloklarında kontrollü gök mavisi (accent).
- Arka plan: nötr açık canvas; geniş boşluklar ve düşük görsel gürültü.
- Kartlar: az sayıda anlamlı kart; her kart tek bir ana göreve veya ölçüme hizmet etmeli.
- Karakter: ana görsel odak; kritik bilgi yalnızca görselde bulunmamalı.
- Köşeler ve gölgeler: tutarlı, ölçülü ve performansı etkilemeyecek düzeyde.
- Tipografi: Nunito (latin + latin-ext); büyük, kolay okunan başlıklar; yardımcı metin gövdeden ayrılır.
- İllüstrasyonlar: özgün ve tutarlı karakter ailesi.

**Tek tasarım sistemi:** Tüm renk, tipografi, boşluk, yarıçap ve gölge değerleri `src/app/globals.css` içindeki `@theme` token'larından gelir. Bileşenlere rastgele hex dağılmaz. Yeni metin/zemin çifti `src/lib/contrast.test.ts` içine eklenir. Sonraki görsel fazlar bu token'lardan sapmaz; ikinci bir tema veya bileşen kütüphanesi açılmaz.

## Tasarım sistemi (token'lar)

Kaynak: `src/app/globals.css`. Ortak UI: `src/components/ui/*`.

### Renkler

| Rol | Token örnekleri | Kullanım |
| --- | --- | --- |
| Sayfa zemini | `canvas`, `canvas-soft` | Sayfa arka planı; yumuşak teal yıkama |
| Yüzey | `surface`, `surface-muted` | Kart; sessiz/ikincil panel |
| Kenarlık | `border`, `border-strong` | Kart ve ikincil düğme kenarı |
| Metin | `ink-900`, `ink-700`, `ink-600`, `ink-500` | Ana, ikincil, yardımcı, soluk yardımcı |
| Marka | `brand-50` … `brand-800` | Birincil işlem, vurgu, dolgu |
| İkincil vurgu | `accent-50`, `accent-100`, `accent-700` | Haftalık özet / deneme gibi farklılaştırılmış yüzey |
| Durum | `success-*`, `warning-*`, `danger-*`, `info-*` | Başarı, uyarı, hata, bilgi |
| Odak | `focus` | `:focus-visible` halkası |

### Tipografi

| Rol | Token / sınıf | Not |
| --- | --- | --- |
| Sayfa başlığı | `text-page-title` | `PageHeader` |
| Bölüm başlığı | `text-section` | Bant / bölüm |
| Kart başlığı | `text-card-title` | `Card` |
| Gövde | `text-body` | Varsayılan gövde |
| Yardımcı | `text-helper` | Açıklama, etiket |
| Sayısal | `text-metric`, `text-metric-lg` | İlerleme ve özet rakamları |

### Boşluk, yarıçap, gölge

- Boşluk: `spacing-card-x/y`, `spacing-section`, `spacing-band`, `spacing-touch` (min. dokunma ~44px).
- Yarıçap: `radius-control` (düğme/alan), `radius-card`, `radius-panel`, `radius-pill`.
- Gölge: `shadow-soft`, `shadow-card`, `shadow-raised` — hafif ve tutarlı.

### Kart ve düğme

- `Card` varyantları: `default` (standart), `feature` (vurgulu), `quiet` (ikincil panel), `accent` (farklılaştırılmış özet yüzeyi).
- `Button` / `ButtonLink`: `primary` (turkuaz dolgu, kolay ayırt edilir), `secondary` (kenarlıklı yüzey), `ghost` (metin bağlantısı). Hover / disabled durumları token'lıdır; odak `:focus-visible` ile görünür.
- İlerleme: `ProgressMeter` (`regular` / `strong` / `hero`; iz `brand` veya `quiet`).
- Durum yüzeyi: `StateMessage` (`loading` / `empty` / `error` / `success` / `info`) — anlam her zaman metinle gelir.

Bu fazda öğrenci ana sayfasının bölüm sırası ve kart yerleşimi değiştirilmez; sonraki fazlar aynı token ve bileşenleri kullanarak kompozisyonu yeniler.

## Bilgi mimarisi

### Öğrenci ana sayfası

Hedef yerleşim `roadmap.md` Faz 14'tedir. Örnek görseller dizilimin örneğidir; bölümleri birebir kopyalanmaz. Küçük ekranda bantlar alt alta iner. Menü değişmez.

- Üst yol: dört aşama durağı. Güncel durak, seçili karakterle işaretlenir. Karakter puanı, çalışma serisi, en uzun seri, sağlık durumu ve sonraki aşamanın eksik şartı yazıyla durur.
- Görünür aşama yalnızca puana bakmaz. Seri, farklı gün, geçerli soru ve mevcut puan eşiği birlikte gerekir. Bir günde en fazla bir aşama ilerler. Boş gün seriyi yeniden başlatır; kazanılan aşamayı, puanı ve rozeti silmez.
- Günlük hedefler: bugünkü kayıt, soru hedefi ve varsa kazanım işi. Açık görev, tamamlanandan daha belirgindir. Tamamlanan satır işaretlidir. Günlük ve haftalık soru hedefleri aynı bölümde, ayrı başlıklarla durur.
- Ders karoları: katalogdaki gerçek dersler. Kutuda bu haftanın soru sayısı ve varsa o derse ait hedef vardır. Veri yoksa boş durum gösterilir. Başarı yüzdesi, performans puanı veya sıralama üretilmez.
- Karakter bandı (`CharacterHero`) karşılamadan hemen sonra durur: figür, aşama, istatistikler, dört duraklı yol ve sonraki aşama.
- Seri / sağlık / hatırlatma duyuruları karakter bandı ile koç kartı arasında, koçtan daha hafif şeritler olarak durur; aynı görsel ağırlıkta kart olmazlar.
- Koç kartı (`RecommendationCard`) duyurulardan sonra gelir. Sıra: kısa başlık → öneri cümlesi (vurgulu yüzey) → kısa neden → birincil/ikincil işlem → isteğe bağlı "Neden bu öneri?" ve sade anlatım. Öneri metni kartın en belirgin satırıdır.
- Alt özet: haftalık soru ve dakika toplamı, son deneme neti, gizlilik ve veli bağlantısı.

Koçluk kartının ilk görünümünde kısa öneri, sıradaki işlem, kısa gerekçe ve bağlantı durur. Kazanım kodu, uzun açıklama, yanlış ve boş sayıları ile tarih aralığı "Neden bu öneri?" içindedir. Yapay zekâ cümlesi varsa "Sade anlatım" başlığıyla kural cümlesinden ayrı durur. Cümle yoksa sahte yanıt gösterilmez; kısa bir durum yazar. Sayfa zemini nötr kalır; kartlar yüzey rengindedir. Ders kutuları tek renktir.

Hedef, rozet veya görünür aşama bu kayıtta ilk kez tamamlanırsa bir pencere açılır. Aşama penceresi, seri ve soru şartları da tamamlanmadan açılmaz. Pencerede aynı yol, işaretli hedefler, madalya, kazanılanın gerçek adı ve "Tamam" düğmesi vardır. Ada haritası, İngilizce seviye adı, kelime kartı, NFT, jeton, ücretli plan, ruh hâli ve uydurma yüzde yoktur. Bir gün ara vermek puanı ve kazanılan aşamayı geri götürmez. Çalışma serisi o gün yeniden başlar. Karakterin dinlenmesi puanı ve rozeti silmez.

### Günlük çalışma

- Ders seçimi.
- Konu/kazanım seçimi isteğe bağlı ve aranabilir.
- Soru sayısı, doğru, yanlış, boş ve süre alanları.
- Anlaşılır doğrulama ve kayıt sonucu.
- Önceki kayıtları düzeltme imkânı.

### Deneme analizi

- Deneme adı/tarihi ve deneme türü.
- Ders bazında doğru, yanlış, boş ve net.
- Önceki denemelerle kıyaslama.
- Öncelikli kazanımlar ve önerilen tekrarlar.
- Grafik yanında erişilebilir tablo alternatifi.

### Veli paneli

- Bağlı öğrenci seçimi.
- Haftalık/aylık özet.
- Gelişim eğilimleri ve destekleyici öneriler.
- Rapor oluşturma.
- Bildirim ve ilişki ayarları.

### Ayarlar

- Profil ve hesap güvenliği.
- Veli-öğrenci bağlantıları.
- Bildirim sıklığı ve sessiz saatler.
- Karakter tercihleri.
- Veri dışa aktarma ve hesap kapatma başvurusu.

## Mobil ve duyarlı tasarım

- Önce küçük ekranlar tasarlanmalı; masaüstü yerleşimi daha sonra genişletilmeli.
- Temel içerik 320 CSS piksel genişliğinde yatay kaydırma gerektirmemelidir.
- Dokunma hedefleri tercihen en az 44×44 CSS piksel olmalıdır.
- Mobilde önemli işlemler başparmakla erişilebilir konumda olmalıdır.
- Büyük tablolar mobilde kartlara veya kontrollü yatay kaydırmaya dönüştürülmeli; kritik veriler kaybolmamalıdır.
- Formlarda uygun mobil klavye türleri kullanılmalıdır.
- PWA çevrimdışı durumu ve senkronizasyon durumu açıkça belirtilmelidir.

## Erişilebilirlik

WCAG 2.2 AA hedeflenmelidir; otomatik araçlar tek başına yeterli değildir.

- Semantik HTML ve doğru başlık hiyerarşisi.
- Klavye ile tüm işlemlere erişim ve görünür odak.
- Form alanlarında görünür etiketler ve açıklayıcı hata mesajları.
- Metin ve arayüz kontrastının doğrulanması.
- Grafikler için metinsel özet veya tablo.
- Hareket azaltma tercihini destekleme.
- Otomatik hareketleri durdurma veya kapatma.
- Ekran okuyucuya uygun canlı bildirimler.
- Yalnızca renk ile başarı/hata anlatmama.

## Karakter ve oyunlaştırma

- Karakterin büyümesi istikrarlı çalışma, tekrar ve hedefe uygun davranışlarla ilişkilendirilmelidir.
- Tek bir gün çalışmamak karakteri geriye götürmemeli veya karakteri üzgün/cezalandırıcı hale getirmemelidir.
- Rozetler öğrenme davranışlarını ödüllendirmeli; yalnızca ham soru sayısına bağlı olmamalıdır.
- Rekabetçi liderlik tabloları ve sınıf arkadaşlarıyla karşılaştırmalar MVP kapsamına alınmamalıdır.
- Karakter mesajları kısa, saygılı, yaşa uygun ve eylem öneren nitelikte olmalıdır.
- Animasyonlar hafif olmalı; performans ve erişilebilirlik tercihlerini bozmasın.

## İçerik ve mikro metin

Tercih edilen:

- “Bugün için 10 soruluk küçük bir hedef belirleyebilirsin.”
- “Fen Bilimleri dersinde F.8.1.1.1 kazanımı şunu söyler: Mevsimlerin oluşumuna yönelik tahminlerde bulunur. Bu kazanım için 10 soru çöz. Bitirince Tamamlandı düğmesine bas; sıradaki yanlış veya boş kazanıma geçilir.”
- “Çalışma kaydını henüz eklemedin. İstersen şimdi kaydedebilirsin.”
- “Bu öneri, son deneme kayıtlarına dayanıyor.”

Kaçınılması gereken:

- “Yine çalışmadın!”
- “Herkes senden daha iyi.”
- “Bu tempoyla kazanamazsın.”
- “Kesin başaracaksın.”
- Veriler yetersizken kesin akademik çıkarımlar.

## Grafik ve veri sunumu

- Her grafik başlık, ölçü birimi ve tarih aralığı göstermelidir.
- Renklerin anlamı tutarlı olmalıdır.
- Kullanıcı doğru/yanlış/net gibi metrikleri birbirine karıştırmamalıdır.
- Veri yoksa boş grafik yerine neden veri bulunmadığını açıklayan boş durum gösterilmelidir.
- Küçük örneklem veya eksik kayıtlar varsa eğilimler kesin sonuç gibi sunulmamalıdır.

## Formlar ve hata durumları

- Alanlar açık etiketlere ve örnek formatlara sahip olmalıdır.
- Hatalar alanın yanında açıklanmalı ve ekran okuyucuya duyurulmalıdır.
- Kullanıcı girdi kaybetmeden düzeltme yapabilmelidir.
- Kaydetme sırasında tekrar tıklama çift kayıt oluşturmamalıdır.
- Silme gibi yıkıcı işlemler onay ve gerektiğinde geri alma imkânı sunmalıdır.
- Sunucu hataları teknik ayrıntı yerine anlaşılır bir mesaj ve tekrar deneme seçeneği sunmalıdır.

## UI kalite kontrolü

- [ ] Mobil, tablet ve masaüstü görünümü kontrol edildi.
- [ ] Boş, yükleniyor, hata ve başarı durumları hazır.
- [ ] Klavye ve ekran okuyucu ile temel akışlar denendi.
- [ ] Kontrast ve odak görünürlüğü kontrol edildi.
- [ ] Grafikler için tablo/metin alternatifi var.
- [ ] Karakter mesajları destekleyici ve cezalandırıcı olmayan dilde.
- [ ] Görsel varlıkların lisans ve kullanım hakları doğrulandı.
- [ ] Gereksiz animasyon ve büyük görsel dosyalar performans açısından gözden geçirildi.
