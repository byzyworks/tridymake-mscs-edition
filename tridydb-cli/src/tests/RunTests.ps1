param (
    [string] $Test
)

$invoke = "node $PSScriptRoot/../app.js file"

if (!$Test) {
    $total_tests                                = 0;
    $successful_tests                           = 0;
    [System.Collections.ArrayList]$failed_tests = @();

    Get-ChildItem -Path "$PSScriptRoot" | ForEach-Object {
        $testname = "$_"
        $testfile = "$($_.FullName)/test.tri";
        
        if (Test-Path -Path "$testfile" -PathType Leaf) {
            Invoke-Expression -Command ($PSCommandPath + ' -Test $testname');
            
            $total_tests++;
            if ($?) {
                $successful_tests++;
            } else {
                $failed_tests.Add($_);
            }
        }
    }
    
    Write-Host
    Write-Host "$successful_tests out of the $total_tests tests were successful";
    if ($successful_tests -lt $total_tests) {
        Write-Host 'Of the tests that failed were:';
        foreach($test_name in $failed_tests) {
            Write-Host "> $test_name";
        }
    }
    Write-Host
} else {
    $testname = "$Test"
    $testfile = "$PSScriptRoot/$testname/test.tri";
        
    if (Test-Path -Path "$testfile" -PathType Leaf) {
        Write-Host;
        Write-Host "Running $testname...";

        if ($Test -like 'error-*') {
            $out = Invoke-Expression "$invoke $testfile --log-level info" 2>&1;
            Write-Output $out;
            
            if ($out -like "*Syntax Error*") {
                Write-Host 'Test successful.';
                exit 0;
            } else {
                Write-Host 'Test failed.';
                exit 1;
            }
        } else {
            $out = Invoke-Expression "$invoke $testfile --log-level debug --pretty";
            Write-Output $out;
            
            if ($?) {
                Write-Host 'Test successful.';
                exit 0;
            } else {
                Write-Host 'Test failed.';
                exit 1;
            }
        }
    }
}
