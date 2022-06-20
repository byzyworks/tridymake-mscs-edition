param (
    [string] $Test,
    [switch] $Invoked
)

$invoke = "node $PSScriptRoot/app.js inline";
$port   = 54321;
$seed   = '2Tridy4U';

if (!$Test -or (!$Invoked -and ($Test -match '(?:^|-)server-'))) {
    Write-Host 'Starting server...';
    Write-Host;
    
    $server_job = Start-Process -FilePath node -ArgumentList "$PSScriptRoot/app.js",'server','--localhost','--server-port',"$port","--random-seed","$seed","--log-level","debug" -WorkingDirectory "$PSScriptRoot" -PassThru;
    Start-Sleep -Seconds 2;
}

if (!$Test) {
    $total_tests                                = 0;
    $successful_tests                           = 0;
    [System.Collections.ArrayList]$failed_tests = @();

    Get-ChildItem -Path "$PSScriptRoot/tests" | ForEach-Object {
        $test_name = "$_";
        $test_file = "$($_.FullName)/test";
        
        if ((Test-Path -Path "$test_file.tri" -PathType Leaf) -or (Test-Path -Path "$test_file.ps1" -PathType Leaf)) {
            Invoke-Expression -Command ($PSCommandPath + ' -Test $test_name -Invoked');
            
            $total_tests++;
            if ($LastExitCode -eq 0) {
                $successful_tests++;
            } else {
                $failed_tests.Add($_) > $null;
            }
        }
    }
    
    Write-Host "$successful_tests out of the $total_tests tests were successful";
    if ($successful_tests -lt $total_tests) {
        Write-Host 'Of the tests that failed were:';
        foreach($test_name in $failed_tests) {
            Write-Host "> $test_name";
        }
    }
    Write-Host;
} else {
    $test_name = "$Test";
    $test_file = "$PSScriptRoot/tests/$test_name/test";
        
    if ((Test-Path -Path "$test_file.tri" -PathType Leaf) -or (Test-Path -Path "$test_file.ps1" -PathType Leaf)) {
        Write-Host "Running $test_name...";
        
        if (Test-Path -Path "$test_file.tri" -PathType Leaf) {
            $invoke = "$invoke --file $test_file.tri --random-seed $seed --log-level info --pretty";
            if ($Test -match '(?:^|-)server-') {
                $invoke += " --client --remote-port $port";
            }
			if ($Test -match '(?:^|-)json-output-') {
				$invoke += " --format json";
			} elseif ($Test -match '(?:^|-)yaml-output-') {
				$invoke += " --format yaml";
			} elseif ($Test -match '(?:^|-)xml-output-') {
				if ($Test -match '(?:^|-)server-') {
					$invoke += " --format xml";
				} else {
					$invoke += " --format xml --tags-key tag --tree-key module";
				}
			}
        } else {
            $invoke = "$test_file.ps1";
        }
        if ($Test -match '(?:^|-)error-') {
            $invoke += " 2>&1";
        }
        
        $out = Invoke-Expression $invoke;
        Write-Output $out;

        if ($Test -match '(?:^|-)error-') {
            if ($out -like "*Syntax Error*") {
                Write-Host 'Test successful.';
                Write-Host;
                exit 0;
            }
            
            if ($Test -match '(?:^|-)server-') {
                $status = (Write-Output $out | ConvertFrom-Json).status;
                if (($status -ge 400) -and ($status -lt 500)) {
                    Write-Host 'Test successful.';
                    Write-Host;
                    exit 0;
                }
            }
			
			if ($out -like "*Error 404*") {
                Write-Host 'Test successful.';
                Write-Host;
                exit 0;
            }
            
            Write-Host 'Test failed.';
            Write-Host;
            exit 1;
        } elseif ($LastExitCode -eq 0) {
			if ($Test -match '(?:^|-)json-output-') {
				$test_outfile = "$PSScriptRoot/tests/$test_name/out.json";
			} elseif ($Test -match '(?:^|-)yaml-output-') {
				$test_outfile = "$PSScriptRoot/tests/$test_name/out.yaml";
			} elseif ($Test -match '(?:^|-)xml-output-') {
				$test_outfile = "$PSScriptRoot/tests/$test_name/out.xml";
			} else {
				$test_outfile = "$PSScriptRoot/tests/$test_name/out.json";
			}
            
            if (Test-Path -Path "$test_outfile" -PathType Leaf) {
                $expected = (Get-Content -Path "$test_outfile") -Replace '\s+','' -Join '';
                $actual   = $out -Replace '\s+','' -Join '';
                
                if ($actual -eq $expected) {
                    Write-Host 'Test successful.';
                    Write-Host;
                    exit 0;
                }
                
                Write-Host 'Test failed.';
                Write-Host;
                exit 1;
            }
            
            Write-Host 'Test successful.';
            Write-Host;
            exit 0;
        }
        
        Write-Host 'Test failed.';
        Write-Host;
        exit 1;
    }
}
