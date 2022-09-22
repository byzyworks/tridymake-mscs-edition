& node $PSScriptRoot/../../app.js inline --type-key 'foo' --tags-key 'bar' --free-key 'baz' --tree-key 'qux' --pretty --command @"

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
