$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Transcript = Join-Path $ProjectRoot 'postgres-install.log'
Start-Transcript -LiteralPath $Transcript -Force | Out-Null
$EnvFile = Join-Path $ProjectRoot '.env'
if (-not (Test-Path -LiteralPath $EnvFile)) { throw '.env tidak ditemukan.' }
Get-Content -LiteralPath $EnvFile | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') }
}

$Archive = Join-Path $env:TEMP 'postgresql-16.14-windows-x64-binaries.zip'
$Install = 'C:\Program Files\PostgreSQL\16'
$DataRoot = 'C:\ProgramData\MAT-ERP\PostgreSQL\16'
$Data = Join-Path $DataRoot 'data'
$Service = 'MAT-ERP-PostgreSQL-16'
$Bin = Join-Path $Install 'bin'

if (-not (Test-Path -LiteralPath $Archive)) { throw 'Archive PostgreSQL resmi tidak ditemukan.' }
if ((Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash -ne '8A7F54C1968D5D49BDCD3F66B1291F736C74B8CB6A26E9874771FCC7837DBF38') {
  throw 'Checksum archive PostgreSQL tidak cocok.'
}
if (Get-Service -Name $Service -ErrorAction SilentlyContinue) { throw "Service $Service sudah ada; instalasi dibatalkan." }
if ((Test-Path -LiteralPath $Install) -or (Test-Path -LiteralPath $DataRoot)) { throw 'Target instalasi/data sudah ada; instalasi dibatalkan agar tidak menimpa data lain.' }

New-Item -ItemType Directory -Path $Install -Force | Out-Null
New-Item -ItemType Directory -Path $DataRoot -Force | Out-Null
& tar.exe -xf $Archive -C $Install --strip-components=1
if ($LASTEXITCODE -ne 0) { throw 'Ekstraksi PostgreSQL gagal.' }

$PasswordFile = Join-Path $env:TEMP "mat-erp-pg-init-$PID.txt"
try {
  [IO.File]::WriteAllText($PasswordFile, $env:POSTGRES_SUPERPASSWORD, [Text.UTF8Encoding]::new($false))
  & (Join-Path $Bin 'initdb.exe') -D $Data -U postgres --encoding=UTF8 --locale=C --auth-local=scram-sha-256 --auth-host=scram-sha-256 --pwfile=$PasswordFile
  if ($LASTEXITCODE -ne 0) { throw 'initdb gagal.' }
} finally {
  Remove-Item -LiteralPath $PasswordFile -Force -ErrorAction SilentlyContinue
}

Add-Content -LiteralPath (Join-Path $Data 'postgresql.conf') -Value @"

# MAT ERP V2 security baseline — managed installation
listen_addresses = '127.0.0.1'
port = 5432
password_encryption = 'scram-sha-256'
ssl = off
log_connections = on
log_disconnections = on
log_line_prefix = '%m [%p] %u@%d %r '
"@

[IO.File]::WriteAllText((Join-Path $Data 'pg_hba.conf'), @"
# MAT ERP V2 — localhost only
local   all   all                          scram-sha-256
host    all   all   127.0.0.1/32           scram-sha-256
host    all   all   0.0.0.0/0              reject
host    all   all   ::0/0                   reject
"@, [Text.UTF8Encoding]::new($false))

& (Join-Path $Bin 'pg_ctl.exe') register -N $Service -D $Data -S auto
if ($LASTEXITCODE -ne 0) { throw 'Registrasi Windows Service gagal.' }
Start-Service -Name $Service
$ready = & (Join-Path $Bin 'pg_isready.exe') -h 127.0.0.1 -p 5432
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL belum ready: $ready" }

Write-Output "Installed PostgreSQL 16.14; service=$Service; listen=127.0.0.1:5432; auth=scram-sha-256"
Stop-Transcript | Out-Null
