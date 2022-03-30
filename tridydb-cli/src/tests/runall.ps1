Get-ChildItem -Path "$PSScriptRoot" | ForEach-Object {
    if (Test-Path -Path $_.FullName -PathType Container) {
        if (Test-Path -Path "$($_.FullName)/run.ps1" -PathType Leaf) {
            Write-Host "Running $_...";
            & "$($_.FullName)/run.ps1";
        }
    }
}