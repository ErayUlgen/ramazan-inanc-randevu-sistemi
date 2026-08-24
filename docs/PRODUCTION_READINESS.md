# Production readiness

Bu dosya canlıya çıkış karar kapısıdır. “Kod derleniyor” ile “salon gerçek müşteri kabul etmeye hazır” aynı şey değildir.

## Otomatik karar kapısı

```powershell
npm run db:status
npm run readiness
```

`readiness` salt okunurdur ve şu alanları kontrol eder:

- aktif şube, doğrulanmış adres, iletişim telefonu ve harita bağlantısı;
- çalışma saatleri ile haftalık salon aralıkları;
- aktif hizmetlerin pozitif süre/fiyat değerleri ve uygun uzman eşlemeleri;
- online randevuya açık uzmanlar ve ortak salon programı tutarlılığı;
- aktif yönetici hesabı;
- ücret istenen bir politika varsa `DEVELOPMENT` ödeme sağlayıcısının kapalı olması;
- production secret uzunlukları, HTTPS URL’leri ve gerçek SMS sağlayıcısı.

Bloker varken canlıya çıkılmaz. Development ortamında gerçek SMS ve production modu uyarı olarak kalır; bunlar ücretli dış bağımlılıklar tamamlandığında production koşusunda kapanır.

## Çalışma zamanı kontrolleri

- `GET /api/health` ve `GET /api/health/live`: süreç ayakta mı?
- `GET /api/ready`: veritabanı bağlantısı, SMS modu ve bildirim kuyruğu özeti.
- Her yanıtta `x-correlation-id` bulunur.
- İstek kayıtları method, route, durum, süre ve correlation ID içerir; telefon, OTP, cookie, body ve query kaydetmez.
- Production’da oturum cookie’si taşıyan yazma isteklerinde `Origin/Referer` izin listesi doğrulanır.
- Beklenmeyen 500 hataları kullanıcıya stack trace vermeden correlation ID ile kaydedilir.

## Veri doğrulama

Canlı öncesi yönetici ekranından aşağıdakiler Ramazan İnanç yetkilisiyle birlikte onaylanır:

- 7 hizmetin adı, kategorisi, fiyatı, süresi ve online durumu;
- 5 uzmanın adı, unvanı, hizmetleri ve online randevu durumu;
- 10.00–21.00 çalışma düzeni, özel günler ve molalar;
- telefon, WhatsApp, harita, erken geliş ve hatırlatma metinleri;
- iptal/değişiklik süreleri ve yönetici onay kuralı.

## Güvenlik kapısı

- Production secret değerleri birbirinden farklı ve en az 32 rastgele karakterdir.
- `replace`, `change`, `example`, `placeholder` içeren veya çok düşük karakter
  çeşitliliğine sahip sözde secret değerleri başlangıçta reddedilir.
- `ADMIN_API_KEY` ve legacy header erişimi kapalıdır.
- Admin ve müşteri cookie’leri bağımsız, HttpOnly, SameSite=Strict ve production’da Secure’dur.
- Demo OTP kodları production değerlerinde bulunmaz.
- JSON ve form istekleri `REQUEST_BODY_LIMIT` ile sınırlandırılır; varsayılan
  değer `256kb`’dır.
- Veritabanı yalnız özel ağdan erişilebilir.
- TLS ters proxy/CDN katmanında zorunludur.
- Son bağımlılık taramaları QA raporunda kayıtlıdır.

## Bilinçli olarak haricî kalanlar

- Netgsm paketi ve canlı anahtarları;
- ödeme kuruluşu sözleşmesi/anahtarları;
- ücretli sunucu, domain, TLS/CDN hesabı;
- KVKK/hukuk metinlerinin yetkili hukukçu onayı.

Bu maddeler kodda sahte başarıyla geçilmez; [dış servis kontrol listesinde](./EXTERNAL_SERVICES_CHECKLIST.md) “bekliyor” kalır.
