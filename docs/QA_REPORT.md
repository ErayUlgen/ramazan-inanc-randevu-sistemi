# Sprint 13 QA raporu

Tarih: 29 Temmuz 2026  
Kapsam: production hardening, veri readiness, yedek/restore, public-müşteri-admin responsive smoke.

## Geçen kontroller

- Prisma: 18 migration, bekleyen migration yok.
- Production readiness: 0 bloker; 1 şube, 7 hizmet, 5 uzman doğrulandı.
- Backend unit/service/güvenlik: 33 suite / 107 test geçti.
- Backend API E2E: 2 suite / 6 test geçti.
- Frontend unit/component: 9 dosya / 13 test geçti.
- Playwright: desktop ve mobile Chromium üzerinde 14/14 senaryo geçti.
- Playwright her senaryoda `pageerror` ve console `error` yakalıyor; girişsiz
  oturum keşfi 200/`authenticated:false` sözleşmesine alınarak konsol temizlendi.
- Public responsive taşma: 320, 390, 627, 768, 1024 ve 1440 genişlikleri.
- Public gerçek katalog, müşteri telefon girişi ve bağımsız admin girişi doğrulandı.
- Frontend lint ve production build geçti.
- Backend production build geçti.
- Prisma schema validation ve client üretimi geçti.
- 256 KB istek gövdesi sınırı gerçek 300 KB istekle doğrulandı; güvenli `413`
  yanıtı üretildi.
- Production benzeri Docker ortamında API ve unprivileged Nginx healthcheck’leri
  `healthy`; doğrudan ve `/api` proxy readiness yanıtları `ready`.
- SPA deep-link (`/hesabim`) production Nginx üzerinden `200` döndü.
- Pilot seed dry-run geçti; production ortamında çalışma kilidi doğrulandı.
- Gerçek veritabanından SHA‑256 yedek alındı ve katalog doğrulandı.
- Ayrı geçici DB’ye restore provası: 1 şube ve 18 migration; geçici DB temizlendi.

## Eklenen korumalar

- Production ortam değişkeni/secret/HTTPS/SMS sağlayıcısı doğrulaması.
- Uzun fakat tahmin edilebilir placeholder secret değerlerini reddeden kontrol.
- JSON ve form istekleri için yapılandırılabilir 256 KB gövde sınırı.
- Oturum cookie’si taşıyan mutasyonlarda same-origin kontrolü.
- Hassas veri içermeyen correlation ID’li yapılandırılmış HTTP logları.
- Liveness/readiness ayrımı ve bildirim kuyruğu ölçüleri.
- Global React error boundary ve kurtarma ekranı.
- Production seed kilidi.
- Unprivileged Nginx frontend, güvenlik header’ları, SPA fallback ve `/api` proxy.

## Açık fakat bilinçli dış bağımlılıklar

- Gerçek Netgsm paketi ve gönderici başlığı.
- Ödeme kuruluşu üyeliği/anahtarları.
- Hosting, domain, TLS ve yönetilen PostgreSQL.
- Hukuk metni onayı.

## Bağımlılık notu

Backend production bağımlılık taraması 0 açık verdi. Frontend’in güncel React Router sürümünde yalnız RSC/Server Action modunu etkileyen yüksek seviye bir advisory görünmektedir. Uygulama RSC, SSR veya server action kullanmaz; yalnız `BrowserRouter` SPA modundadır. Daha eski sürümler çok sayıda XSS/open-redirect advisory taşıdığı için güncel 7.18.2 korunmuştur. Advisory upstream düzeltildiğinde patch yükseltmesi tekrar yapılacaktır.

## Görsel kanıt

Temiz QA görüntüleri `artifacts/sprint-13-visual-qa` altında saklanır:

- `public-booking.png`
- `expert-step.png`
- `time-step.png`
- `confirmation-step.png`
- `customer-account.png`
- `admin-login.png`

## Tekrar komutları

```powershell
npm run readiness
npm --prefix backend run test -- --runInBand
npm --prefix backend run test:e2e
npm --prefix backend run build
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run test:e2e
npm --prefix frontend run build
```
