& node $PSScriptRoot/../../app.js inline --random-seed '0123456789' --pretty --command @"

@new;
@in ? @new 1;
@in ? @new 2;
@in ? @new 3;
@in ? @new 4;
@in ? @new 5;
@in ? @new 6;
@in ? @new 7;
@in ? @new 8;
@in ? @new 9;
@in ? @new 10;
@in ? @new 11;
@in ? @new 12;
@in ? @new 13;
@in ? @new 14;
@in ? @new 15;

@get;

"@

exit 0;
