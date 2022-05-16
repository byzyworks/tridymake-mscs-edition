Add-Type -AssemblyName System.Web

$port = 54321;

$string = [System.Web.HTTPUtility]::UrlEncode("Hello, I'm an ordinary module. Nothing to see here...");

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'DELETE' -UseBasicParsing;

$out = Invoke-WebRequest -Uri "http://localhost:$port/?format=string&data=$string" -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/"                            -Method 'GET'  -UseBasicParsing;

Write-Output $out.Content;

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'DELETE' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'GET'    -UseBasicParsing;

Write-Output $out.Content;

exit 0;
