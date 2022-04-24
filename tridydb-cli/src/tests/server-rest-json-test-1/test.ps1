Add-Type -AssemblyName System.Web

$port = 54321;

$json = [System.Web.HTTPUtility]::UrlEncode(@"
{
    "tags": [
        "d"
    ],
    "free": { },
    "tree": [
        {
            "tags": [
                "e"
            ]
        }
    ]
}
"@);

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'DELETE' -UseBasicParsing;

$out = Invoke-WebRequest -Uri "http://localhost:$port/?type=json&data=$json" -Method 'PUT'  -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?type=json&data=$json" -Method 'POST' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/"                      -Method 'GET'  -UseBasicParsing;

Write-Output $out.Content;

$out = Invoke-WebRequest -Uri "http://localhost:$port/?context=d" -Method 'DELETE' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/"           -Method 'GET'    -UseBasicParsing;

Write-Output $out.Content;

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'DELETE' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'GET'    -UseBasicParsing;

Write-Output $out.Content;

exit 0;
