Add-Type -AssemblyName System.Web

$port = 54321;

$json1 = [System.Web.HTTPUtility]::UrlEncode(@"
{
    "tags": [
		"a",
		"b"
	]
}
"@);

$json2 = [System.Web.HTTPUtility]::UrlEncode(@"
{
    "tags": [
		"a",
		"c"
	]
}
"@);

$string = [System.Web.HTTPUtility]::UrlEncode("This is a string.");

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'DELETE' -UseBasicParsing;

$out = Invoke-WebRequest -Uri "http://localhost:$port/?format=json&data=$json1"                      -Method 'PUT' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?mode=overwrite&format=json&data=$json2"         -Method 'PUT' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?mode=edit&freeformat=string&freedata=$string" -Method 'PUT' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?mode=tag&tags=d,e"                            -Method 'PUT' -UseBasicParsing;
$out = Invoke-WebRequest -Uri "http://localhost:$port/?mode=untag&tags=d"                            -Method 'PUT' -UseBasicParsing;

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'GET' -UseBasicParsing;

Write-Output $out.Content;

$out = Invoke-WebRequest -Uri "http://localhost:$port/" -Method 'DELETE' -UseBasicParsing;

exit 0;
