Add-Type -AssemblyName System.Web
$tridy = [System.Web.HTTPUtility]::UrlEncode("@del; @new verbatim; @get; @del;");
$out = Invoke-WebRequest -Uri "http://localhost:54321/?type=verb&data=$tridy" -Method 'PUT' -UseBasicParsing;
Write-Output $out.Content;

exit 0;
