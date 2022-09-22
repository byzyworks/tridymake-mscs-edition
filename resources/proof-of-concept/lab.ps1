Param(
	[Parameter(Mandatory=$true)]  [double] $SecurityCoefficient,
	[Parameter(Mandatory=$false)] [string] $RandomSeed,
	                              [switch] $NoVagrantUp
)

$params = @"
@in base                  @tag security = $SecurityCoefficient;
@in base `$(security > 6) @tag security = 6;
@in base `$(security < 0) @tag security = 0;
"@
$params | Out-File -FilePath "tridy/params.tri" -Encoding 'UTF8'

if ($RandomSeed) {
	tridymake inline --file "tridy/bootstrap.tri" --random-seed $RandomSeed
} else {
	tridymake inline --file "tridy/bootstrap.tri"
}

if ($NoVagrantUp) {
	exit
}

vagrant up
