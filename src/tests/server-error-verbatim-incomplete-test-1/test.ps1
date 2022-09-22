Add-Type -AssemblyName System.Web

$tridy = [System.Web.HTTPUtility]::UrlEncode("@new");
try {
    Invoke-WebRequest -Uri "http://localhost:54321/?format=verb&data=$tridy" -Method 'PUT' -UseBasicParsing;
} catch {
    $out = $_.ErrorDetails.Message;
}
Write-Output $out;
