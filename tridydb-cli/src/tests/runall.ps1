$total_tests                                = 0;
$successful_tests                           = 0;
[System.Collections.ArrayList]$failed_tests = @();

Get-ChildItem -Path "$PSScriptRoot" | ForEach-Object {
    if (Test-Path -Path $_.FullName -PathType Container) {
        if (Test-Path -Path "$($_.FullName)/run.ps1" -PathType Leaf) {
            Write-Host
            Write-Host "Running $_...";
            & "$($_.FullName)/run.ps1";
            
            $total_tests++;
            if ($?) {
                Write-Host 'Test successful.';
                $successful_tests++;
            } else {
                Write-Host 'Test failed.';
                $failed_tests.Add($_);
            }
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