Set-Location $PSScriptRoot

function Is-Administrator {
    $user      = [System.Security.Principal.WindowsIdentity]::GetCurrent();
    $principal = New-Object System.Security.Principal.WindowsPrincipal($user);
    if ($principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)) {
        return $true;
    } else {
        return $false;
    }
}

Write-Host "> Checking to see if NodeJS is installed...";
try {
    & node -v >$null;
} catch {
    Write-Host "> NodeJS does not appear to be installed. NodeJS is required.";
    exit 1;
}
Write-Host "> NodeJS appears to be installed.";
Write-Host;

Write-Host "> Checking to see if NPM is installed...";
try {
    & npm -v >$null;
} catch {
    Write-Host "> NPM does not appear to be installed. NPM is required.";
    exit 1;
}
Write-Host "> NPM appears to be installed.";
Write-Host;

Write-Host "> Installing required frameworks/libraries...";
& npm install;
Write-Host;
Write-Host "> Required frameworks/libraries installed.";
Write-Host;

$bin           = "$PSScriptRoot\bin";
$make_shortcut = Read-Host "> Would you like to make $bin\tridydb.bat callable from everywhere? [Y/n]";
Write-Host;
if ($make_shortcut -eq 'Y') {
    if (Is-Administrator) {
        $system_shortcut = Read-Host "> Would you like this to be true for all users on the system? [Y/n]";
        Write-Host;
        if ($system_shortcut -eq 'Y') {
            $current = [Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::Machine);
            if (!($current -like "*$bin*")) {
                [Environment]::SetEnvironmentVariable("PATH", "$current;$bin", [System.EnvironmentVariableTarget]::Machine);
            }
        } else {
            $current = [Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::User);
            if (!($current -like "*$bin*")) {
                [Environment]::SetEnvironmentVariable("PATH", "$current;$bin", [System.EnvironmentVariableTarget]::User);
            }
        }
    } else {
        $current = [Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::User);
        if (!($current -like "*$bin*")) {
            [Environment]::SetEnvironmentVariable("PATH", "$current;$bin", [System.EnvironmentVariableTarget]::User);
        }
    }
}

Write-Host "> Running a test...";
try {
    if ($make_shortcut -eq 'Y') {
        bin/tridydb file ../src/tests/hello-world/test.tri --pretty;
    } else {
        bin/tridydb file ../src/tests/hello-world/test.tri --pretty;
    }
} catch {
    Write-Host "> Uh oh. That wasn't supposed to happen.";
    Write-Host "> Here's what went wrong:";
    throw;
}

Write-Host "> Everything looks good.";
Write-Host "> TridyDB was successfully installed."
Write-Host;
