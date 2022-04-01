& node $PSScriptRoot/../../app.js file $PSScriptRoot/test.tri --log-level debug --pretty
if ($?) {
    exit 0;
}
exit 1;
