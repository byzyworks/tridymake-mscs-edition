& node $PSScriptRoot/../../app.js inline --tags-key 'foo' --free-key 'bar' --tree-key 'baz' --pretty --command @"

@new a
@is @json [
    \"easy\",
    \"medium\",
    \"hard\",
    \"impossible\"
] @end;

@in a
@new b;

@get;

"@

exit 0;
