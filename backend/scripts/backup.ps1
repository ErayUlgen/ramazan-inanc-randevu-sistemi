param(
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory,
  [string]$DockerContainer = 'ramazan-inanc-postgres'
)

$ErrorActionPreference = 'Stop'

if (-not $env:DATABASE_URL) {
  throw 'DATABASE_URL tanımlı değil.'
}
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $resolvedOutput "ramazan-inanc-$timestamp.dump"
$checksumTarget = "$target.sha256"

$nativeTools = (Get-Command pg_dump -ErrorAction SilentlyContinue) -and (Get-Command pg_restore -ErrorAction SilentlyContinue)
if ($nativeTools) {
  & pg_dump --format=custom --no-owner --no-privileges --file=$target $env:DATABASE_URL
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $target)) {
    throw 'PostgreSQL yedeği oluşturulamadı.'
  }
  & pg_restore --list $target | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Remove-Item -LiteralPath $target -Force
    throw 'Oluşturulan yedek pg_restore tarafından doğrulanamadı.'
  }
}
else {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'pg_dump/pg_restore veya Docker bulunamadı.'
  }
  & docker inspect $DockerContainer | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL araçları bulunamadı ve Docker container erişilemiyor: $DockerContainer"
  }
  $containerFile = "/tmp/ramazan-inanc-$timestamp.dump"
  & docker exec $DockerContainer sh -c "pg_dump --format=custom --no-owner --no-privileges -U `"`$POSTGRES_USER`" -d `"`$POSTGRES_DB`" -f '$containerFile'"
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker içindeki pg_dump işlemi başarısız oldu.'
  }
  & docker exec $DockerContainer pg_restore --list $containerFile | Out-Null
  if ($LASTEXITCODE -ne 0) {
    & docker exec $DockerContainer rm -f $containerFile | Out-Null
    throw 'Docker içinde oluşturulan yedek doğrulanamadı.'
  }
  & docker cp "${DockerContainer}:$containerFile" $target
  $copyExitCode = $LASTEXITCODE
  & docker exec $DockerContainer rm -f $containerFile | Out-Null
  if ($copyExitCode -ne 0 -or -not (Test-Path -LiteralPath $target)) {
    throw 'Yedek Docker container dışına kopyalanamadı.'
  }
}

$checksum = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath $checksumTarget -Value "$checksum  $([System.IO.Path]::GetFileName($target))" -Encoding ascii

[pscustomobject]@{
  BackupFile = $target
  ChecksumFile = $checksumTarget
  Sha256 = $checksum
  SizeBytes = (Get-Item -LiteralPath $target).Length
  CreatedAt = (Get-Date).ToString('o')
} | ConvertTo-Json
