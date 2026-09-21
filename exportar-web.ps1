# Genera la app web de Spark AI lista para subir a Netlify (Deploy manually).
# Uso:  & .\exportar-web.ps1
# La clave pública de Clerk (pk_...) se incluye dentro de la web, porque es pública;
# NUNCA uses aquí la clave secreta (sk_...).
param(
  [string]$Dominio = "spark-ai-api.onrender.com",
  [string]$ClavePublica = ""
)
$ErrorActionPreference = "Stop"

if (-not $ClavePublica) { $ClavePublica = (Read-Host "Clave PUBLICA de Clerk (empieza con pk_test_)").Trim() }
if (-not $ClavePublica.StartsWith("pk_")) { throw "Debe ser la clave PUBLICA, que empieza con pk_test_ o pk_live_ (no la secreta sk_)" }
$Dominio = $Dominio.Trim() -replace '^https?://', '' -replace '/.*$', ''

$app = Join-Path $PSScriptRoot "artifacts\spark-ai"
$salida = Join-Path $app "dist"

$env:EXPO_PUBLIC_DOMAIN = $Dominio
$env:EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = $ClavePublica

Push-Location $app
try {
  if (Test-Path $salida) { Remove-Item $salida -Recurse -Force }
  pnpm exec expo export --platform web --output-dir dist
  if ($LASTEXITCODE -ne 0) { throw "expo export fallo (codigo $LASTEXITCODE)" }
} finally { Pop-Location }

# La app es de una sola página: cualquier ruta debe servir index.html.
Set-Content -Path (Join-Path $salida "_redirects") -Value "/* /index.html 200" -Encoding ascii

Write-Host ""
Write-Host "Listo. Sube esta carpeta a Netlify (Deploy manually):"
Write-Host $salida
Start-Process explorer.exe $salida
