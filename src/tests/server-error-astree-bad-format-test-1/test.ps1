Add-Type -AssemblyName System.Web

$tridy = [System.Web.HTTPUtility]::UrlEncode("{`"tree`":[{`"context`":{`"expression`":{`"a`":`"a`",`"op`":`"/`",`"b`":`"b`"}}}]}");
try {
    $out = Invoke-WebRequest -Uri "http://localhost:54321/?format=astree&data=$tridy" -Method 'PUT' -UseBasicParsing;
} catch {
    $out = $_.ErrorDetails.Message;
}
Write-Output $out;
