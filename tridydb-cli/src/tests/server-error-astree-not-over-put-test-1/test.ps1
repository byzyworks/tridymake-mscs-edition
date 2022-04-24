Add-Type -AssemblyName System.Web

$tridy = [System.Web.HTTPUtility]::UrlEncode("{`"tree`":[{`"operation`":`"print`"}]}");
try {
    Invoke-WebRequest -Uri "http://localhost:54321/?type=astree&data=$tridy" -Method 'GET' -UseBasicParsing;
} catch {
    $out = $_.ErrorDetails.Message;
}
Write-Output $out;
