param([Parameter(Mandatory = $true)][ValidatePattern('^\d{1,3}(\.\d{1,3}){3}$')][string]$LanAddress)

$ErrorActionPreference = 'Stop'
$openssl = 'C:\Program Files\Git\usr\bin\openssl.exe'
if (-not (Test-Path -LiteralPath $openssl)) { throw 'No se encontró OpenSSL en la instalación de Git para Windows.' }
$certDirectory = Join-Path $PSScriptRoot '..\.local-cert'
New-Item -ItemType Directory -Force -Path $certDirectory | Out-Null
$caKey = Join-Path $certDirectory 'ca.key'
$caCert = Join-Path $certDirectory 'ca.crt'
$caForPhone = Join-Path $certDirectory 'ca.cer'
$serverKey = Join-Path $certDirectory 'server.key'
$serverCert = Join-Path $certDirectory 'server.crt'
$serverRequest = Join-Path $certDirectory 'server.csr'
$serverExtensions = Join-Path $certDirectory 'server.ext'

if (-not (Test-Path -LiteralPath $caKey)) {
  & $openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes -keyout $caKey -out $caCert -subj '/CN=RestoPOS Local CA' -addext 'basicConstraints=critical,CA:TRUE' -addext 'keyUsage=critical,keyCertSign,cRLSign' 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar la autoridad local.' }
}
& $openssl x509 -in $caCert -outform DER -out $caForPhone
if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar el certificado para el teléfono.' }

@"
subjectAltName=IP:$LanAddress,DNS:localhost
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
"@ | Set-Content -LiteralPath $serverExtensions -Encoding ascii

& $openssl req -newkey rsa:2048 -sha256 -nodes -keyout $serverKey -out $serverRequest -subj "/CN=$LanAddress" 2>$null
if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar la clave del servidor.' }
& $openssl x509 -req -in $serverRequest -CA $caCert -CAkey $caKey -CAcreateserial -out $serverCert -days 825 -sha256 -extfile $serverExtensions 2>$null
if ($LASTEXITCODE -ne 0) { throw 'No se pudo firmar el certificado local.' }
& $openssl verify -CAfile $caCert $serverCert
if ($LASTEXITCODE -ne 0) { throw 'No se pudo verificar el certificado local.' }
& $openssl x509 -in $serverCert -noout -checkip $LanAddress
if ($LASTEXITCODE -ne 0) { throw 'El certificado no cubre la IP indicada.' }
$LanAddress | Set-Content -LiteralPath (Join-Path $certDirectory 'address.txt') -NoNewline
Write-Output "Certificado listo para https://${LanAddress}:3443"
Write-Output "Importá solamente $caForPhone en el teléfono y activá su confianza. Nunca compartas los archivos .key."
