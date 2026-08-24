# Yedekleme ve geri yükleme

## Hedef

Veritabanı kaybında yalnız yedek dosyasına değil, doğrulanmış geri dönüş yoluna sahip olmak.

## Yedek alma

`DATABASE_URL` ortamda tanımlıyken:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File backend/scripts/backup.ps1 `
  -OutputDirectory artifacts/backups
```

Makinede `pg_dump/pg_restore` yoksa script yerel `ramazan-inanc-postgres` container’ını kullanır. Çıktı:

- PostgreSQL custom-format `.dump`;
- aynı adla `.dump.sha256`;
- boyut, tarih ve SHA‑256 içeren JSON sonuç.

Yedekler repository dışında, erişimi sınırlı ve şifreli bir depoda tutulmalıdır. Önerilen politika: 7 günlük, 4 haftalık, 3 aylık kopya.

## Salt okunur doğrulama

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File backend/scripts/verify-backup.ps1 `
  -BackupFile artifacts/backups/<dosya>.dump
```

Checksum ve `pg_restore --list` birlikte geçmeden dosya geçerli sayılmaz.

## Geri yükleme provası

Yerel Docker veritabanında geçici ve izole bir veritabanı oluşturur; ana veritabanına dokunmaz:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File backend/scripts/restore-rehearsal.ps1 `
  -BackupFile artifacts/backups/<dosya>.dump `
  -ConfirmRehearsal
```

Script şube sayısını ve tamamlanmış Prisma migration’larını doğrular, ardından geçici veritabanını kaldırır.

## Test/staging geri yükleme

`restore.ps1` production hedefini kabul etmez. Açık kilit ve açık onay ister:

```powershell
$env:NODE_ENV = 'staging'
$env:ALLOW_DATABASE_RESTORE = 'true'
$env:DATABASE_URL = '<staging bağlantısı>'
powershell -NoProfile -ExecutionPolicy Bypass -File backend/scripts/restore.ps1 `
  -BackupFile <dosya>.dump `
  -TargetEnvironment staging `
  -ConfirmRestore
```

## Canlı olay prosedürü

1. Yazma trafiğini durdur.
2. Hasarlı veritabanından ayrıca olay yedeği al.
3. Son geçerli checksum’lı yedeği seç.
4. Önce staging’e yükle ve `npm run readiness` çalıştır.
5. Yetkili onayıyla hosting sağlayıcısının kontrollü restore mekanizmasını kullan.
6. Migration durumu, katalog, örnek müşteri ve randevu sayıları doğrulanmadan trafiği açma.
7. Olay zaman çizelgesini ve kullanılan checksum’ı kaydet.

29 Temmuz 2026 provası: 237404 baytlık yedek, 419 katalog girdisi, 1 şube ve 18 migration ile başarıyla geri yüklendi.
