Add-Type -AssemblyName System.Web

$tridy = [System.Web.HTTPUtility]::UrlEncode("@get;");
try {
    Invoke-WebRequest -Uri "http://localhost:54321/?type=verb&data=$tridy" -Method 'GET' -UseBasicParsing;
} catch {
    $out = $_.ErrorDetails.Message;
}
Write-Output $out;
