param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$DockerContainer = 'ramazan-inanc-postgres'
)

$ErrorActionPreference = 'Stop'

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

$catalog = @()
if (Get-Command pg_restore -ErrorAction SilentlyContinue) {
  $catalog = & pg_restore --list $resolvedBackup
  if ($LASTEXITCODE -ne 0 -or -not $catalog) {
    throw 'Yedek kataloğu okunamadı.'
  }
}
else {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'pg_restore veya Docker bulunamadı.'
  }
  $containerFile = "/tmp/verify-$([System.IO.Path]::GetFileName($resolvedBackup))"
  & docker cp $resolvedBackup "${DockerContainer}:$containerFile"
  if ($LASTEXITCODE -ne 0) {
    throw 'Yedek doğrulama containerına kopyalanamadı.'
  }
  $catalog = & docker exec $DockerContainer pg_restore --list $containerFile
  $restoreExitCode = $LASTEXITCODE
  & docker exec $DockerContainer rm -f $containerFile | Out-Null
  if ($restoreExitCode -ne 0 -or -not $catalog) {
    throw 'Yedek kataloğu Docker içinde okunamadı.'
  }
}

[pscustomobject]@{
  Valid = $true
  BackupFile = $resolvedBackup
  Sha256 = $actualChecksum
  SizeBytes = (Get-Item -LiteralPath $resolvedBackup).Length
  CatalogEntries = @($catalog).Count
  VerifiedAt = (Get-Date).ToString('o')
} | ConvertTo-Json
