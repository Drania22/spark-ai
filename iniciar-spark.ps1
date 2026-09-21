# Arranca el backend y la app web de Spark AI en dos ventanas con nombre.
# Las claves se piden por teclado y no se guardan en ningún archivo.
$ErrorActionPreference = "Stop"
$repo = $PSScriptRoot

# Los campos son visibles a propósito: en algunas terminales el pegado en campos
# ocultos solo recibe un carácter. Al terminar se limpia la pantalla.
$gemini = (Read-Host "Clave de Gemini").Trim()
$pk = (Read-Host "Clave PUBLICA de Clerk (empieza con pk_test_)").Trim()
$sk = (Read-Host "Clave SECRETA de Clerk (empieza con sk_test_)").Trim()

if ($gemini.Length -lt 20) { throw "La clave de Gemini parece incompleta ($($gemini.Length) caracteres)" }
if (-not $pk.StartsWith("pk_")) { throw "La clave publica debe empezar con pk_test_ o pk_live_" }
if (-not $sk.StartsWith("sk_") -or $sk.Length -lt 30) { throw "La clave secreta debe empezar con sk_test_ o sk_live_ y estar completa" }
Clear-Host

# Dirección que muestra cloudflared al abrir el túnel (cambia cada vez).
$dominio = (Read-Host "Dominio del tunel sin https:// (ej. algo.trycloudflare.com)").Trim() -replace '^https?://', '' -replace '/.*$', ''
if (-not $dominio) { throw "Falta el dominio del tunel" }

$ip = (Get-NetIPAddress -InterfaceAlias "Wi-Fi" -AddressFamily IPv4 | Select-Object -First 1).IPAddress
Write-Host "IP de tu PC en la Wi-Fi: $ip"

# Backend
$env:PORT = "5000"
$env:GEMINI_API_KEY = $gemini
$env:CLERK_PUBLISHABLE_KEY = $pk
$env:CLERK_SECRET_KEY = $sk
$env:ALLOWED_ORIGINS = "http://${ip}:8081"
Start-Process pwsh -WorkingDirectory $repo -ArgumentList "-NoExit", "-Command", '$Host.UI.RawUI.WindowTitle=''SPARK-BACKEND''; pnpm --filter @workspace/api-server run start'

# App (versión web)
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip
$env:EXPO_PUBLIC_DOMAIN = $dominio
$env:EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = $pk
Start-Process pwsh -WorkingDirectory "$repo\artifacts\spark-ai" -ArgumentList "-NoExit", "-Command", '$Host.UI.RawUI.WindowTitle=''SPARK-EXPO''; pnpm exec expo start --clear --web'

Write-Host ""
Write-Host "Listo. Cuando la ventana SPARK-EXPO termine de compilar, abre en el celular:"
Write-Host "http://${ip}:8081"
