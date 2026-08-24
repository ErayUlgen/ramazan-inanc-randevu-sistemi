# Dış servis kontrol listesi

Bu listedeki “bekliyor” maddeleri ücretli üyelik veya gerçek hesap yetkisi gerektirir. Kod bunları yapılmış gibi göstermez.

## Netgsm — bekliyor

- [ ] OTP ve normal SMS paketi satın alındı.
- [ ] Gönderici başlığı onaylandı.
- [ ] `NETGSM_USERCODE`, `NETGSM_PASSWORD`, `NETGSM_HEADER` secret store’a girildi.
- [ ] `SMS_PROVIDER=netgsm` ayarlandı.
- [ ] Gerçek telefonda OTP, onay, ret, iptal, değişiklik, katılım ve hatırlatma mesajları denendi.
- [ ] Hata kodu, timeout, tekrar deneme ve webhook teslim durumu doğrulandı.
- [ ] Netgsm panelinde harcama alarmı tanımlandı.

Development ortamında ücretsiz `111111` kodu kullanılabilir; production doğrulaması development sağlayıcısını reddeder.

## Ödeme kuruluşu — üyelik öncesi hazır

- [ ] Sağlayıcı ve sözleşme seçildi.
- [ ] API anahtarları secret store’a girildi.
- [ ] Webhook imzası ve idempotency anahtarı sağlayıcı dokümanıyla doğrulandı.
- [ ] Başarılı, başarısız, süresi dolmuş, iade ve yeniden planlama senaryoları sandbox’ta test edildi.
- [ ] Muhasebe ve iade politikası salon yetkilisince onaylandı.

Canlı sağlayıcı seçilene kadar depozito politikası `NONE` veya `MANUAL` kalmalıdır. Production readiness, aktif ücret politikasında `DEVELOPMENT` sağlayıcısını bloker sayar.

## Hosting, domain ve TLS — bekliyor

- [ ] Yönetilen PostgreSQL yedek/point-in-time recovery özelliği doğrulandı.
- [ ] Uygulama sunucusu özel ağ ve en az ayrı staging ortamıyla kuruldu.
- [ ] Domain DNS kayıtları ve TLS sertifikası tamamlandı.
- [ ] `FRONTEND_URL` ve `PUBLIC_APP_URL` gerçek HTTPS adresi oldu.
- [ ] API/veritabanı doğrudan internete açılmadı.
- [ ] Log saklama, disk/CPU/DB bağlantı ve `/api/ready` alarmı tanımlandı.

## Hukuk ve işletme onayı — bekliyor

- [ ] Gizlilik, kullanım, iptal/değişiklik ve açık rıza metinleri yetkili kişi tarafından onaylandı.
- [ ] Veri saklama ve silme süreleri kararlaştırıldı.
- [ ] Müşteri notlarında hassas veri yazılmaması için salon ekibi bilgilendirildi.
- [ ] Personel rolleri ve hesap sahipleri isim bazında onaylandı.
