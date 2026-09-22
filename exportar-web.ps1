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
  # --clear: Expo cachea los valores EXPO_PUBLIC_*; sin esto puede reutilizar una clave o dominio antiguos.
  pnpm exec expo export --platform web --output-dir dist --clear
  if ($LASTEXITCODE -ne 0) { throw "expo export fallo (codigo $LASTEXITCODE)" }
} finally { Pop-Location }

# La app es de una sola página: cualquier ruta debe servir index.html.
Set-Content -Path (Join-Path $salida "_redirects") -Value "/* /index.html 200" -Encoding ascii

# Se prepara la copia que se sube a Netlify, sin modificar "dist":
#  - Windows no puede leer archivos con rutas de más de 260 caracteres y el navegador falla
#    al subirlos, así que la copia va en una ruta corta.
#  - Netlify (subida manual) ignora las carpetas que empiezan con punto y las llamadas
#    node_modules, y Expo guarda las fuentes de íconos e imágenes en
#    assets\__node_modules\.pnpm\<paquete>\node_modules\... Se copian a assets\vendor\<paquete>\nm\...
#    y se corrigen las referencias del código; si no, los íconos salen como cuadros con una x.
$copia = "C:\spark-dist"
# Se vacía el destino primero (robocopy no borra en él las carpetas que se excluyen del origen).
$vacio = Join-Path $env:TEMP "spark-vacio"
New-Item -ItemType Directory -Force $vacio | Out-Null
robocopy $vacio $copia /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
robocopy $salida $copia /MIR /XD "__node_modules" /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "No se pudo copiar a $copia (robocopy codigo $LASTEXITCODE)" }

$origenPnpm = Join-Path $salida "assets\__node_modules\.pnpm"
if (Test-Path -LiteralPath $origenPnpm) {
  $destinoVendor = Join-Path $copia "assets\vendor"
  Get-ChildItem -LiteralPath $origenPnpm -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($origenPnpm.Length + 1)
    $rel = (($rel -split '\\') | ForEach-Object { if ($_ -eq 'node_modules') { 'nm' } else { $_ } }) -join '\'
    $dest = Join-Path $destinoVendor $rel
    New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $dest
  }
  # Referencias del código: /assets/__node_modules/.pnpm/<paquete>/node_modules/... -> /assets/vendor/<paquete>/nm/...
  $patron = '/assets/__node_modules/\.pnpm/[^"''\s]*'
  Get-ChildItem $copia -Recurse -File -Include *.js, *.html, *.json | ForEach-Object {
    $texto = [IO.File]::ReadAllText($_.FullName)
    if ($texto.Contains("__node_modules/.pnpm/")) {
      $nuevo = [regex]::Replace($texto, $patron, {
        param($m)
        $m.Value.Replace('/assets/__node_modules/.pnpm/', '/assets/vendor/').Replace('/node_modules/', '/nm/')
      })
      [IO.File]::WriteAllText($_.FullName, $nuevo)
    }
  }
}

Write-Host ""
Write-Host "Listo. Sube esta carpeta a Netlify (Deploys > arrastrar y soltar):"
Write-Host $copia
Start-Process explorer.exe $copia
