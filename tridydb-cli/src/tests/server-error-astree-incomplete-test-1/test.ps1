Add-Type -AssemblyName System.Web

$tridy = [System.Web.HTTPUtility]::UrlEncode("{`"tree`":[{`"opera");
try {
    $out = Invoke-WebRequest -Uri "http://localhost:54321/?type=astree&data=$tridy" -Method 'PUT' -UseBasicParsing;
} catch {
    $out = $_.ErrorDetails.Message;
}
Write-Output $out;
