# Deployment ve rollback runbook

## Ön koşullar

1. `backend/.env.production.example` dosyasını secret manager üzerinden gerçek değerlere dönüştür; repository’ye production `.env` ekleme.
2. Ücretli dış servisler hazır değilse ilgili özelliği kapalı tut.
3. Veritabanı yedeği al ve `verify-backup.ps1` ile doğrula.
4. Aşağıdaki karar kapısını çalıştır:

```powershell
npm run db:status
npm run readiness
npm run test
npm --prefix backend run test:e2e
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run test:e2e
npm run build
```

## Container yapısı

- `api`: NestJS, localhost:3000, salt okunur dosya sistemi.
- `web`: derlenmiş React + unprivileged Nginx, localhost:8080; `/api` çağrılarını API container’ına proxy eder.
- PostgreSQL üretimde yönetilen/haricî servis olmalıdır; compose production dosyası veritabanı yaratmaz.

```powershell
$env:BACKEND_ENV_FILE = './backend/.env.production'
docker compose -f docker-compose.production.yml config
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml ps
```

Public erişim ters proxy üzerinden yalnız `web:8080` hedefine verilir. API 3000 ve veritabanı portu internete açılmaz.

## Migration sırası

1. Bakım/yazma penceresini ilan et.
2. Checksum’lı yedek al.
3. `prisma migrate status` çalıştır.
4. `prisma migrate deploy` çalıştır.
5. `/api/ready` ve `npm run readiness` kontrol et.
6. Uygulama container’larını güncelle.
7. Public rezervasyon → müşteri hesabı → admin smoke testini yap.

Eski migration dosyaları değiştirilmez; ileri yönlü yeni migration oluşturulur.

## Smoke test

- ana sayfada gerçek hizmetler görünür;
- hizmet → uzman → tarih/saat alanına ulaşılır;
- müşteri hesabı telefon giriş ekranı açılır;
- admin bağımsız giriş ekranı açılır;
- `/api/health/live` ve `/api/ready` 200 döner;
- bildirim kuyruğunda stale processing artmaz;
- 320, 390, 627, 768, 1024 ve 1440 px’te yatay taşma yoktur.

## Rollback

1. Yeni container’lara trafiği kes.
2. Önceki immutable image etiketini yeniden ayağa kaldır.
3. Migration geriye uyumluysa veritabanını olduğu gibi bırak.
4. Geriye uyumsuz veri değişikliği varsa yalnız yetkili onayıyla doğrulanmış yedeği staging’de prova ettikten sonra hosting restore’u uygula.
5. `/api/ready`, kritik rotalar ve veri örnekleri doğrulanınca trafiği aç.
6. Correlation ID’leriyle olay kaydı oluştur.

Deploy asla seed çalıştırmaz. Production seed varsayılan olarak kod seviyesinde engellidir.
