# Script para probar el endpoint POST /api/auth/login
# Cambiar email y password según tus datos en la BD

$email = "tu@ejemplo.com"  # ⚠️ Cambiar aquí
$password = "tuPass"       # ⚠️ Cambiar aquí
$backendUrl = "http://localhost:4000"

Write-Host "🔐 Probando login en: $backendUrl/api/auth/login" -ForegroundColor Cyan
Write-Host "📧 Email: $email" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod `
        -Method POST `
        -Uri "$backendUrl/api/auth/login" `
        -ContentType 'application/json' `
        -Body (@{
            email = $email
            password = $password
        } | ConvertTo-Json)
    
    Write-Host "✅ Login exitoso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Respuesta del servidor:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    # Guardar token si existe
    if ($response.token) {
        Write-Host ""
        Write-Host "🔑 Token: $($response.token.Substring(0, 20))..." -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error en la petición:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        Write-Host ""
        Write-Host "📊 Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
        try {
            $errorContent = $_.Exception.Response.Content.ReadAsStream() | % { $_ }
            Write-Host "Detalle: $(ConvertFrom-Json $([System.Text.Encoding]::UTF8.GetString($errorContent)))" -ForegroundColor Yellow
        } catch {
            Write-Host "No se pudo parsear la respuesta de error"
        }
    }
}
