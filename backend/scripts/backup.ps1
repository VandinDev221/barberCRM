# Backup do banco PostgreSQL (Windows PowerShell).
# Uso: $env:DATABASE_URL = "postgresql://..."; .\scripts\backup.ps1
# Requer pg_dump no PATH. Gera: backups\barber-backup-YYYY-MM-DD-HHmm.sql

$outDir = "backups"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir }
$name = "barber-backup-$(Get-Date -Format 'yyyy-MM-dd-HHmm').sql"
$file = Join-Path $outDir $name
if (-not $env:DATABASE_URL) {
  Write-Error "Defina DATABASE_URL para fazer o backup."
  exit 1
}
& pg_dump $env:DATABASE_URL --no-owner --no-acl -f $file
Write-Host "Backup salvo: $file"
