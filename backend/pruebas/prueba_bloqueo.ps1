# Prueba del control de intentos de inicio de sesion.
#
# Acumula 15 intentos fallidos repartidos en tres usuarios distintos, con un
# inicio de sesion correcto en medio. Ese login valido es el punto de la
# prueba: antes de la correccion reiniciaba el contador por origen, asi que el
# intento final habria devuelto 401. Si devuelve 429, la correccion funciona.
#
# Los intentos ya bloqueados no suman al contador, porque el backend responde
# 429 antes de registrar el fallo. Por eso son cinco por usuario y no seis.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\prueba_bloqueo.ps1
#   powershell -ExecutionPolicy Bypass -File .\prueba_bloqueo.ps1 -Url "https://sistema-villeda-backend-v2.onrender.com/api/v1/auth/login"

param(
  [string]$Url = "http://localhost:5000/api/v1/auth/login"
)

function Intento($u, $p) {
  $cuerpo = @{ nombre_usuario = $u; contrasena = $p } | ConvertTo-Json -Compress
  try {
    $r = Invoke-WebRequest -Uri $Url -Method Post -ContentType "application/json" `
         -Body $cuerpo -UseBasicParsing
    return $r.StatusCode
  } catch {
    if ($_.Exception.Response) { return $_.Exception.Response.StatusCode.value__ }
    Write-Host "  No se pudo contactar al servidor: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
}

function Tanda($usuario, $veces) {
  Write-Host ""
  Write-Host "--- $veces intentos fallidos con '$usuario' ---" -ForegroundColor Cyan
  1..$veces | ForEach-Object {
    $c = Intento $usuario "contrasena_mala"
    $color = if ($c -eq 429) { "Yellow" } else { "Gray" }
    Write-Host ("  intento {0,2}: HTTP {1}" -f $_, $c) -ForegroundColor $color
  }
}

Write-Host "Objetivo: $Url" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Credenciales REALES de cualquier usuario valido" -ForegroundColor Green
$usuarioOk = Read-Host "  Usuario"
$seguro    = Read-Host "  Contrasena" -AsSecureString
$claveOk   = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
               [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro))

Tanda "prueba_uno" 5

Write-Host ""
Write-Host "--- login correcto en medio de la prueba ---" -ForegroundColor Cyan
$c = Intento $usuarioOk $claveOk
if ($c -eq 200) {
  Write-Host "  HTTP 200 - entro bien" -ForegroundColor Green
} elseif ($c -eq 429) {
  Write-Host "  HTTP 429 - ese usuario quedo bloqueado de una corrida anterior." -ForegroundColor Red
  Write-Host "  Reinicia el backend y volve a correr la prueba." -ForegroundColor Red
  exit 1
} else {
  Write-Host "  HTTP $c - revisa el usuario y la contrasena" -ForegroundColor Red
  exit 1
}

Tanda "prueba_dos" 5
Tanda "prueba_tres" 5

Write-Host ""
Write-Host "--- prueba final: un usuario nuevo, nunca usado ---" -ForegroundColor Cyan
$final = Intento "prueba_final" "contrasena_mala"
Write-Host ""
if ($final -eq 429) {
  Write-Host "  HTTP 429  ->  CORRECTO. El login valido NO reinicio el contador por origen." -ForegroundColor Green
} else {
  Write-Host "  HTTP $final  ->  FALLA. El contador por origen se reinicio." -ForegroundColor Red
}
Write-Host ""
