param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$DockerContainer = 'ramazan-inanc-postgres',
  [Parameter(Mandatory = $true)]
  [switch]$ConfirmRehearsal
)

$ErrorActionPreference = 'Stop'

if (-not $ConfirmRehearsal) {
  throw 'Geçici geri yükleme provası için -ConfirmRehearsal zorunludur.'
}
if ($env:NODE_ENV -eq 'production') {
  throw 'Geri yükleme provası production modunda çalıştırılamaz.'
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker bulunamadı.'
}

$resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path
$checksumFile = "$resolvedBackup.sha256"
if (-not (Test-Path -LiteralPath $checksumFile)) {
  throw 'Yedeğin .sha256 doğrulama dosyası bulunamadı.'
}
$expectedChecksum = ((Get-Content -LiteralPath $checksumFile -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
$actualChecksum = (Get-FileHash -LiteralPath $resolvedBackup -Algorithm SHA256).Hash.ToLowerInvariant()
if ($expectedChecksum -ne $actualChecksum) {
  throw 'Yedek SHA-256 doğrulamasından geçemedi.'
}

$suffix = Get-Date -Format 'yyyyMMddHHmmss'
$temporaryDatabase = "ri_restore_test_$suffix"
$containerFile = "/tmp/$([System.IO.Path]::GetFileName($resolvedBackup))"
$created = $false

try {
  & docker inspect $DockerContainer | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker container erişilemiyor: $DockerContainer"
  }

  & docker cp $resolvedBackup "${DockerContainer}:$containerFile"
  if ($LASTEXITCODE -ne 0) {
    throw 'Yedek container içine kopyalanamadı.'
  }

  & docker exec $DockerContainer sh -c "createdb -U `"`$POSTGRES_USER`" '$temporaryDatabase'"
  if ($LASTEXITCODE -ne 0) {
    throw 'Geçici prova veritabanı oluşturulamadı.'
  }
  $created = $true

  & docker exec $DockerContainer sh -c "pg_restore --exit-on-error --no-owner --no-privileges -U `"`$POSTGRES_USER`" -d '$temporaryDatabase' '$containerFile'"
  if ($LASTEXITCODE -ne 0) {
    throw 'Yedek geçici prova veritabanına geri yüklenemedi.'
  }

  $branchCount = (& docker exec $DockerContainer sh -c "psql -U `"`$POSTGRES_USER`" -d '$temporaryDatabase' -tAc 'SELECT COUNT(*) FROM branches;'").Trim()
  $migrationCount = (& docker exec $DockerContainer sh -c "psql -U `"`$POSTGRES_USER`" -d '$temporaryDatabase' -tAc 'SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;'").Trim()
  if ($LASTEXITCODE -ne 0 -or [int]$migrationCount -lt 1) {
    throw 'Geri yüklenen veritabanının migration bütünlüğü doğrulanamadı.'
  }

  [pscustomobject]@{
    Valid = $true
    TemporaryDatabase = $temporaryDatabase
    BranchCount = [int]$branchCount
    AppliedMigrations = [int]$migrationCount
    Sha256 = $actualChecksum
    RehearsedAt = (Get-Date).ToString('o')
  } | ConvertTo-Json
}
finally {
  if ($created) {
    & docker exec $DockerContainer sh -c "dropdb --if-exists --force -U `"`$POSTGRES_USER`" '$temporaryDatabase'" | Out-Null
  }
  & docker exec $DockerContainer rm -f $containerFile | Out-Null
}
