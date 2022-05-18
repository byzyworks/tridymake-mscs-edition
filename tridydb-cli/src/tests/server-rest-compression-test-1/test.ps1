Add-Type -AssemblyName System.Web

$port = 54321;

$json = [System.Web.HTTPUtility]::UrlEncode(@"
{
    "type": "hasfoo",
	"tags": [
		"a",
		"hasfoo"
	],
	"free": "foo",
	"tree": [
		{
			"type": "hasbar",
			"tags": [
				"b",
				"hasbar"
			],
			"free": "bar"
		},
		{
			"type": "hasbaz",
			"tags": [
				"c",
				"hasbaz"
			],
			"free": "baz"
		}
	]
}
"@);

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'DELETE' -UseBasicParsing;

$out = Invoke-WebRequest -Uri "http://localhost:$port/?format=json&data=$json" -Method 'POST' -UseBasicParsing;

$out = Invoke-WebRequest -Uri "http://localhost:$port/?compression=0" -Method 'GET' -UseBasicParsing;

Write-Output $out.Content;

$out = Invoke-WebRequest -Uri "http://localhost:$port/?compression=1" -Method 'GET' -UseBasicParsing;

Write-Output $out.Content;

$out = Invoke-WebRequest -Uri "http://localhost:$port/?compression=2" -Method 'GET' -UseBasicParsing;

Write-Output $out.Content;

$out = Invoke-WebRequest -Uri "http://localhost:$port/?compression=3" -Method 'GET' -UseBasicParsing;

Write-Output $out.Content;

$out = Invoke-WebRequest -Uri "http://localhost:$port/?compression=4" -Method 'GET' -UseBasicParsing;

Write-Output $out.Content;

$out = Invoke-WebRequest -Uri "http://localhost:$port/?compression=5" -Method 'GET' -UseBasicParsing;

Write-Output $out.Content;

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'DELETE' -UseBasicParsing;

exit 0;
