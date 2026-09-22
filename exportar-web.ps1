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
#    assets\__node_modules\.pnpm\<paquete>\node_modules\... Se copian a assets\vendor\vN
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
  # Además, Netlify rechaza rutas muy largas (fallan a partir de ~180 caracteres), así que
  # cada carpeta de origen se sustituye por un nombre corto: /assets/vendor/v1, v2, ...
  $mapa = @{}   # ruta original (URL) -> ruta corta (URL)
  $n = 0
  foreach ($f in Get-ChildItem -LiteralPath $origenPnpm -Recurse -File) {
    $relDir = (Split-Path $f.FullName.Substring($origenPnpm.Length + 1) -Parent).Replace('\', '/')
    $urlOriginal = "/assets/__node_modules/.pnpm/$relDir"
    if (-not $mapa.ContainsKey($urlOriginal)) { $n++; $mapa[$urlOriginal] = "/assets/vendor/v$n" }
    $destDir = Join-Path $copia ($mapa[$urlOriginal].TrimStart('/').Replace('/', '\'))
    New-Item -ItemType Directory -Force $destDir | Out-Null
    Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $destDir $f.Name)
  }
  # Referencias del código: cada archivo aparece como una cadena entre comillas con su ruta
  # completa (carpeta + nombre). Se sustituye la carpeta y se conserva el nombre.
  $claves = @($mapa.Keys | Sort-Object Length -Descending)
  Get-ChildItem $copia -Recurse -File -Include *.js, *.html, *.json | ForEach-Object {
    $texto = [IO.File]::ReadAllText($_.FullName)
    if ($texto.Contains("__node_modules")) {
      $texto = [regex]::Replace($texto, '"(/assets/__node_modules/\.pnpm/[^"]*)"', {
        param($m)
        $s = $m.Groups[1].Value
        foreach ($k in $claves) {
          if ($s.StartsWith($k + '/')) { return '"' + $mapa[$k] + $s.Substring($k.Length) + '"' }
        }
        return $m.Value
      })
      if ($texto.Contains("__node_modules")) { Write-Warning "Quedan referencias a __node_modules en $($_.Name)" }
      [IO.File]::WriteAllText($_.FullName, $texto)
    }
  }
}

Write-Host ""
Write-Host "Listo. Sube esta carpeta a Netlify (Deploys > arrastrar y soltar):"
Write-Host $copia
Start-Process explorer.exe $copia
