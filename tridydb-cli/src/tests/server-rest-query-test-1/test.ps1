Add-Type -AssemblyName System.Web

$port = 54321;

$json = [System.Web.HTTPUtility]::UrlEncode(@"
{
    "a": "This is a string.",
    "b": true,
    "c": {
        "d": 0,
        "e": "one"
    },
    "f": [
        "g",
        "h"
    ]
}
"@);

$yaml = [System.Web.HTTPUtility]::UrlEncode(@"
---
a: This is a string.
b: true
c:
    d: 0
    e: one
f:
  - g
  - h
i: [j, k]
"@);

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'DELETE' -UseBasicParsing;

$out = Invoke-WebRequest -Uri "http://localhost:$port/"                                                      -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?tags=a"                                               -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?tags=b"                                               -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?tags=a,b"                                             -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?context=a&greedy=true&tags=greedy"                    -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?context=a%26b&tags=freejson&freetype=json&free=$json" -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?context=a%26b&tags=freeyaml&freetype=yaml&free=$yaml" -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?tags=%40none&state=%40none"                           -Method 'POST' -UseBasicParsing;

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'GET' -UseBasicParsing;

Write-Output $out.Content;

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'DELETE' -UseBasicParsing;

exit 0;
