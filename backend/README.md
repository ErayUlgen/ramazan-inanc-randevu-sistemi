# Ramazan İnanç Hair Art Studio API

NestJS, Prisma ve PostgreSQL tabanlı rezervasyon/operasyon API’sidir.

## Yerel geliştirme

```powershell
docker compose up -d postgres
cd backend
npm ci
npx prisma migrate deploy
npm run start:dev
```

API: `http://localhost:3000/api`  
Health: `/api/health`  
Readiness: `/api/ready`

## Yönetici hesabı

Production’da varsayılan parola üretilmez. İlk salon sahibi hesabını veya parola
değişikliğini tek kullanımlık ortam değişkenleriyle çalıştır:

```powershell
$env:BOOTSTRAP_ADMIN_USERNAME='owner'
$env:BOOTSTRAP_ADMIN_PASSWORD='uzun-ve-benzersiz-parola'
npm run admin:bootstrap
Remove-Item Env:BOOTSTRAP_ADMIN_PASSWORD
```

Komut mevcut oturumları iptal eder. Production’da `ADMIN_API_KEY` ve legacy
header erişimi kullanılamaz.

## SMS sağlayıcısı

`SMS_PROVIDER=http`, `SMS_API_URL`, `SMS_API_KEY`, `SMS_SENDER` ve
`SMS_WEBHOOK_SECRET` tanımlanır. Webhook:
`POST /api/notifications/sms/webhook`.

İmza `HMAC-SHA256(secret, "<unix_timestamp>.<raw_body>")` olup hex biçiminde
`x-sms-signature`, saniye zaman damgası `x-sms-timestamp` başlığında gönderilir.
Credential yokken development sağlayıcısı kullanılır; gerçek teslim yapılmış
sayılmaz.

## Yedekleme ve geri yükleme

```powershell
./scripts/backup.ps1 -OutputDirectory C:\secure-backups
./scripts/restore.ps1 -BackupFile C:\secure-backups\ramazan-inanc-....dump -ConfirmRestore
```

Geri yükleme mevcut veritabanı nesnelerini değiştirir; önce yeni bir backup al ve
staging ortamında doğrula.

## Production kontrolü

1. `.env.example` alanlarını secret store üzerinden doldur.
2. `npx prisma migrate deploy` çalıştır.
3. `npm test -- --runInBand`, `npm run lint`, `npm run build`.
4. `/api/ready` sonucunu load balancer health check olarak kullan.
5. SMS webhook imzasını ve test teslim raporunu sağlayıcı sandbox’ında doğrula.
