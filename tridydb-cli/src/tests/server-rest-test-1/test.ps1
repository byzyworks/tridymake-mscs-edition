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

$string = [System.Web.HTTPUtility]::UrlEncode("This is a string.");

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'DELETE' -UseBasicParsing;

$out = Invoke-WebRequest -Uri "http://localhost:$port/"                                                                              -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?tags=a"                                                                       -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?tags=b"                                                                       -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?tags=a,b"                                                                     -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?context=a&greedy=true&tags=greedy"                                            -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?context=a%26b&type=json&tags=freejson&freeformat=json&freedata=$json"         -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?context=a%26b&type=yaml&tags=freeyaml&freeformat=yaml&freedata=$yaml"         -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?context=a%26b&type=string&tags=freestring&freeformat=string&freedata=$string" -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?context=a%26b&type=dynamic&tags=freedynamic&freeformat=dynamic&freedata=null" -Method 'POST' -UseBasicParsing;

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'GET' -UseBasicParsing;

Write-Output $out.Content;

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'DELETE' -UseBasicParsing;

exit 0;
