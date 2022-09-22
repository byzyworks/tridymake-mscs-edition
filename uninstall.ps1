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

$bin = "$PSScriptRoot\bin";

if (Is-Administrator) {
    $scope = 'Machine';
} else {
    $scope = 'User';
}

$current = [Environment]::GetEnvironmentVariable("PATH", $scope);
if ($current -like "*$bin*") {
    $new = ($current.Split(';') | Where-Object { $_ -ne "$bin" }) -join ';'
    [Environment]::SetEnvironmentVariable("PATH", "$new", $scope);
}

Write-Host "> Tridymake was successfully uninstalled."
Write-Host;
