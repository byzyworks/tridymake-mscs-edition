& node $PSScriptRoot/../../app.js file $PSScriptRoot/test.tri --log-level info
if ($?) {
    exit 1;
}
exit 0;
