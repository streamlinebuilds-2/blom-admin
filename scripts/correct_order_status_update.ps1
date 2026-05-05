# Order Status Update Script for PowerShell
# This script updates ONLY the status field, leaving payment_status unchanged

$OrderId = "4fc6796e-3b62-4890-8d8d-0e645f6599a3"
$NewStatus = "packed"
$SupabaseUrl = "https://yvmnedjybrpvlupygusf.supabase.co"
$ServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI"

Write-Host "🔧 Updating order status correctly..." -ForegroundColor Green
Write-Host "Order ID: $OrderId" -ForegroundColor Yellow
Write-Host "New Status: $NewStatus" -ForegroundColor Yellow
Write-Host ""

# Create the request body
$RequestBody = @{
    status = $NewStatus
    updated_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
    order_packed_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
}
$JsonBody = $RequestBody | ConvertTo-Json

# Create headers
$Headers = @{
    "Authorization" = "Bearer $ServiceRoleKey"
    "apikey" = $ServiceRoleKey
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

# Make the API call
$Uri = "$SupabaseUrl/rest/v1/orders?id=eq.$OrderId"
Write-Host "Making API call to: $Uri" -ForegroundColor Cyan

try {
    $Response = Invoke-RestMethod -Uri $Uri -Method PATCH -Headers $Headers -Body $JsonBody
    Write-Host "✅ Status update completed successfully!" -ForegroundColor Green
    Write-Host "📝 Note: payment_status was NOT changed - it should remain as 'paid', 'unpaid', or 'pending'" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}