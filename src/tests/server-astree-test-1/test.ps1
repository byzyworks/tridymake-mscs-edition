Add-Type -AssemblyName System.Web

$port = 54321;

$tridy = [System.Web.HTTPUtility]::UrlEncode("{`"tree`":[{`"operation`":`"delete`"}]}");
$out = Invoke-WebRequest -Uri "http://localhost:$port/?format=astree&data=$tridy" -Method 'PUT' -UseBasicParsing;

$tridy = [System.Web.HTTPUtility]::UrlEncode("{`"tree`":[{`"operation`":`"compose`",`"definition`":{`"tags`":[`"astree`"]}}]}");
$out = Invoke-WebRequest -Uri "http://localhost:$port/?format=astree&data=$tridy" -Method 'PUT' -UseBasicParsing;

$tridy = [System.Web.HTTPUtility]::UrlEncode("{`"tree`":[{`"operation`":`"print`"}]}");
$out = Invoke-WebRequest -Uri "http://localhost:$port/?format=astree&data=$tridy" -Method 'PUT' -UseBasicParsing;

Write-Output $out.Content;

$tridy = [System.Web.HTTPUtility]::UrlEncode("{`"tree`":[{`"operation`":`"delete`"}]}");
$out = Invoke-WebRequest -Uri "http://localhost:$port/?format=astree&data=$tridy" -Method 'PUT' -UseBasicParsing;

exit 0;
