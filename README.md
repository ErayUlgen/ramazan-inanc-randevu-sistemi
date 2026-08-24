# Ramazan İnanç Hair Art Studio — Randevu Sistemi

Web-first, tek markalı, başlangıçta tek şubeli ve çok şubeye hazır salon rezervasyon/operasyon ürünü.

## Ürün alanları

- `/`: üyelik zorlamadan hizmet, uzman, tarih/saat ve OTP ile randevu talebi.
- `/hesabim`: müşterinin bekleyen, yaklaşan ve geçmiş randevuları; iptal/değişiklik, form, katılım ve değerlendirme akışları.
- `/admin`: talep kuyruğu, günlük/haftalık takvim, müşteri/hizmet/uzman yönetimi, çalışma düzeni, bildirim, rapor ve ayarlar.

Randevu motoru 10.00–21.00 çalışma düzenini, gerçek hizmet süresini, `[start, end)` çakışma mantığını, beş dakikalık hold’u, yönetici onayını ve “ilk müsait uzman” seçiminin atomik kalmasını korur.

## Teknoloji

- Frontend: React 19, TypeScript, Vite, Framer Motion.
- Backend: NestJS 11, TypeScript, Prisma.
- Veritabanı: PostgreSQL 16.
- QA: Jest, Vitest, Testing Library, Playwright.

## Yerel başlangıç

```powershell
Copy-Item .env.example .env
npm run db:up
npm run db:migrate
npm run db:seed
```

Kapalı pilot senaryolarını veri yazmadan doğrulamak için:

```powershell
$env:PILOT_SEED_DRY_RUN='true'
npm --prefix backend run pilot:seed
Remove-Item Env:PILOT_SEED_DRY_RUN
```

İki ayrı terminal:

```powershell
npm run dev:backend
npm run dev:frontend
```

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3000/api`
- Liveness: `http://127.0.0.1:3000/api/health/live`
- Readiness: `http://127.0.0.1:3000/api/ready`

Development OTP kodu `111111` değeridir. Production doğrulaması development SMS sağlayıcısıyla açılmayı reddeder.

## Karar kapısı ve testler

```powershell
npm run db:status
npm run readiness
npm --prefix backend run test -- --runInBand
npm --prefix backend run test:e2e
npm --prefix backend run build
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run test:e2e
npm --prefix frontend run build
```

## Canlıya hazırlık

- [Production readiness](docs/PRODUCTION_READINESS.md)
- [Deployment ve rollback](docs/DEPLOYMENT_RUNBOOK.md)
- [Yedekleme ve geri yükleme](docs/BACKUP_RESTORE.md)
- [Kapalı pilot](docs/PILOT_CHECKLIST.md)
- [Dış servisler](docs/EXTERNAL_SERVICES_CHECKLIST.md)
- [QA raporu](docs/QA_REPORT.md)

Ücretli SMS, ödeme kuruluşu, hosting/domain ve hukuk onayı kod tarafından yapılmış gibi gösterilmez; dış servis listesinde açık kalır.
