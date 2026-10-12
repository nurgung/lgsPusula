# Katkı ve Geliştirme İş Akışı

## Temel çalışma biçimi

- Her görev tek bir amaç etrafında sınırlandırılmalıdır.
- Değişiklikten önce ilgili README, roadmap ve güvenlik belgeleri okunmalıdır.
- Mimari veya veri modeli değişiklikleri ilgili dokümana yansıtılmalıdır.
- Gerçek öğrenci/veli verileri geliştirme ve test ortamlarında kullanılmamalıdır.
- Yeni bağımlılık eklemeden önce mevcut altyapıyla çözüm mümkün mü değerlendirilmelidir.

## Kod kalitesi

- TypeScript'te mümkün olduğunca kesin tipler kullanın; `any` kullanımını gerekçesiz yaygınlaştırmayın.
- İş kurallarını görsel bileşenlerin içine gömmeyin.
- Form ve API girdilerini sunucuda doğrulayın.
- Yetki kontrolünü ortak yardımcılarla standartlaştırın; fakat her işlemde kaynak sahipliği/ilişki kontrolünü koruyun.
- Hataları yakalayın ve kullanıcıya güvenli mesaj gösterin; hataları sessizce yutmayın.
- İsimlendirmede açık ve tutarlı İngilizce kod isimleri kullanılabilir; kullanıcıya görünen metinler Türkçe olmalıdır.

## Test beklentisi

- İş kuralları için birim testi.
- Kritik kullanıcı akışları için entegrasyon veya uçtan uca testi.
- Yetkisiz erişim senaryoları için negatif test.
- Veri modeli veya migration değişikliklerinde migration/geri dönüş planı.
- Hata, boş durum ve sınır değer testleri.

## Pull request / teslim kontrolü

- [ ] Değişikliğin amacı ve kapsamı açıklanmış.
- [ ] İlgili testler eklenmiş ve çalıştırılmış.
- [ ] Lint, tip kontrolü ve build sonucu raporlanmış.
- [ ] Güvenlik ve gizlilik etkisi değerlendirilmiş.
- [ ] Dokümantasyon güncellenmiş.
- [ ] Yeni ortam değişkenleri `.env.example` içine eklenmiş.
- [ ] Gerçek anahtar veya kişisel veri eklenmemiş.
- [ ] Tamamlanmayan işler açıkça belirtilmiş.

## Cursor kullanımı

Cursor'a verilen görevlerde önce plan üretmesini, belirsizlikleri ve etkilenebilecek dosyaları belirtmesini isteyin. Bir seferde çok sayıda ilgisiz dosyayı değiştirmesini istemeyin. Değişiklik sonrası test çıktısını kontrol edin; çalıştırılmamış testler başarılı olarak raporlanmamalıdır.
