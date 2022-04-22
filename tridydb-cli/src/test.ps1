param (
    [string] $Test
)

$invoke = "node $PSScriptRoot/app.js inline";

if (!$Test) {
    $total_tests                                = 0;
    $successful_tests                           = 0;
    [System.Collections.ArrayList]$failed_tests = @();

    Get-ChildItem -Path "$PSScriptRoot/tests" | ForEach-Object {
        $test_name = "$_";
        $test_file = "$($_.FullName)/test";
        
        if ((Test-Path -Path "$test_file.tri" -PathType Leaf) -or (Test-Path -Path "$test_file.ps1" -PathType Leaf)) {
            Invoke-Expression -Command ($PSCommandPath + ' -Test $test_name');
            
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

        if ($Test -like 'error-*') {
            if (Test-Path -Path "$test_file.tri" -PathType Leaf) {
                $out = Invoke-Expression "$invoke --file $test_file.tri --log-level info" 2>&1;
            } else {
                $out = Invoke-Expression "$test_file.ps1" 2>&1;
            }
            Write-Output $out;
            
            if ($out -like "*Syntax Error*") {
                Write-Host 'Test successful.';
                Write-Host;
                exit 0;
            } else {
                Write-Host 'Test failed.';
                Write-Host;
                exit 1;
            }
        } else {
            if (Test-Path -Path "$test_file.tri" -PathType Leaf) {
                $out = Invoke-Expression "$invoke --file $test_file.tri --log-level info --pretty";
            } else {
                $out = Invoke-Expression "$test_file.ps1";
            }
            Write-Output $out;
            
            if ($LastExitCode -eq 0) {
                $test_outfile = "$PSScriptRoot/tests/$test_name/out.json"
                
                if (Test-Path -Path "$test_outfile" -PathType Leaf) {
                    $expected = (Get-Content -Path "$test_outfile") -Replace '\s+','' -Join '';
                    $actual   = $out -Replace '\s+','' -Join '';

                    if ($actual -eq $expected) {
                        Write-Host 'Test successful.';
                        Write-Host;
                        exit 0;
                    } else {
                        Write-Host 'Test failed.';
                        Write-Host;
                        exit 1;
                    }
                } else {
                    Write-Host 'Test successful.';
                    Write-Host;
                    exit 0;
                }
            } else {
                Write-Host 'Test failed.';
                Write-Host;
                exit 1;
            }
        }
    }
}
