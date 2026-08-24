param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [Parameter(Mandatory = $true)]
  [ValidateSet('test', 'staging')]
  [string]$TargetEnvironment,
  [Parameter(Mandatory = $true)]
  [switch]$ConfirmRestore
)

$ErrorActionPreference = 'Stop'

if (-not $ConfirmRestore) {
  throw 'Geri yükleme için -ConfirmRestore zorunludur.'
}
if ($env:ALLOW_DATABASE_RESTORE -ne 'true') {
  throw 'Geri yükleme kilidi kapalıdır. Geçici test/staging hedefi için ALLOW_DATABASE_RESTORE=true ayarlayın.'
}
if (-not $env:DATABASE_URL) {
  throw 'DATABASE_URL tanımlı değil.'
}
if ($env:NODE_ENV -eq 'production' -or $TargetEnvironment -eq 'production') {
  throw 'Bu araç production veritabanına geri yükleme yapmaz.'
}
if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
  throw 'pg_restore bulunamadı.'
}

$resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path
if (-not $resolvedBackup.EndsWith('.dump')) {
  throw 'Yalnız .dump uzantılı yedekler geri yüklenebilir.'
}

$checksumFile = "$resolvedBackup.sha256"
if (-not (Test-Path -LiteralPath $checksumFile)) {
  throw 'Yedeğin .sha256 doğrulama dosyası bulunamadı.'
}
$expectedChecksum = ((Get-Content -LiteralPath $checksumFile -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
$actualChecksum = (Get-FileHash -LiteralPath $resolvedBackup -Algorithm SHA256).Hash.ToLowerInvariant()
if ($expectedChecksum -ne $actualChecksum) {
  throw 'Yedek SHA-256 doğrulamasından geçemedi.'
}

& pg_restore --list $resolvedBackup | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'Yedek kataloğu okunamadı.'
}

& pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname=$env:DATABASE_URL $resolvedBackup
if ($LASTEXITCODE -ne 0) {
  throw 'PostgreSQL geri yükleme işlemi başarısız oldu.'
}

[pscustomobject]@{
  Restored = $true
  TargetEnvironment = $TargetEnvironment
  BackupFile = $resolvedBackup
  Sha256 = $actualChecksum
  RestoredAt = (Get-Date).ToString('o')
} | ConvertTo-Json
