$out = & node $PSScriptRoot/../../app.js inline --client --remote-host localhost --remote-port 0 --pretty --command "@get;" 2>&1;

Write-Output $out;
