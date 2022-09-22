# Change Log

Please use this document as a place to briefly re-iterate changes committed to the repository. Make sure to keep track of changes you make *while* you are modifying the codebase.

Use the version-numbering system below when identifying and committing changes.

(*major release/feature version #*).(*minor release/feature version #*).(*security/hotfix patch version #*)

Changes that have no effect on functionality (such as to documentation) do not need to be stated here, or have the version re-numbered.

Remember also to set the version number inside package.json and utility/common.

<br>

### 2022/04/29
##  Version 0.1.0: Baseline

* Tridymake released in-house; changelog introduced.

<br>

### 2022/04/29
##  Version 0.1.1

* Fixed a bug that would cause `@del` to delete the entire tree an element is inside of if matched as also the first module in its the tree.

<br>

### 2022/05/24
##  Version 0.2.0: Superset

* Added clauses `@raw`, `@typeless`, `@tagless`, `@trimmed`, `@merged`, and `@final` as ending parameters to `@get` as a way to remove Tridymake metadata from the output (as a side effect making the output one-way / non-reusable by Tridy as input), and compress the remaining output down to varying degrees (`@raw` means no compression / the default behavior while `@final` has the greatest compression).
* Added type specifiers as the fourth piece of Tridymake modules, which is automatically determined from the last tag now when not using `@as` to provide tags.
* Added clause `@of` to specify a module's type in the form of a double-quoted string, used by `@merged` and `@final`'s reduced output as the module's key. If not given, the final tag in the module's tagset (when given without `@as`) will be used.
* Added `--type-key` program argument (and argument to `tridy.query(...)`) to control the name of the type specifier's own key in storage.
* Added (multi-line) raw string/primitive input with either single quotation, double quotation, or grave accent marks, for `@is`, `@of`, and module raw input.
* Added REST mode server query parameter `compression` for output compression level.
* Changed REST mode server query parameter `type` to `format`.
* Added REST mode server query parameter `type` for type specifier.
* Changed REST mode server query parameter `freetype` to `freeformat`.
* Changed REST mode server query parameter `free` to `freedata`.
* Added `@put` operation for editing module elements without deleting ommitted elements.
* Added `@tag` operation for appending new tags to a module.
* Added `@untag` operation for deleting specific tags from a module.
* Added "multi-statements" ("`@in` expression { statement 1; statement 2; ... }") to not have to repeatedly type context expressions over and over again.
* The input buffer / carry is now cleared when pressing Ctrl+C while inside console mode.
* Fixed a bug where the database would attempt to check the tags of a primitive raw input module.
* Fixed a bug where the database would fail to catch errors when attempting `@new` against a root module already changed to a primitive type using `@set` with raw input.
* Fixed a bug where (in particular) empty strings entered as module raw input would be converted to map objects.
* Fixed a series of bugs affecting how expressions with more than one branch coming out at different levels would evaluate when combined using operators such as `@or`.
* Fixed a bug where incomplete statements containing brackets wouldn't be carried correctly.

<br>

### 2022/06/20
##  Version 0.3.0: Variation

* Improved Tridymake's flexibility when used as an NPM package; Tridy is now exported as a class as opposed to a singleton, so multiple Tridy instances are possible now.
* Changed `@random` to use a seeded random number generator, as opposed to (as previously used) `Math.random()`.
* Added `--random-seed` program argument (and argument to `Tridy.query(...)`) to force a random seed.
* Added `Tridy.setRandomSeed(...)` instance method, to force a random seed.
* Added `Tridy.getRandomSeed()` instance method, to get the current seed.
* Added `Tridy.clearCarry()` instance method, to reset the parser state.
* Added `Tridy.isCarrying()` instance method, to check if there are incomplete statements.
* Changed `Tridy.stringify(...)` to a static method.
* Changed `Tridy.objectify(...)` to a static method.
* Added the plus symbol (`+`) as an acceptable tag character.
* Removed variables (as in the non-functional way they were implemented prior).
* Made it acceptable syntax for tag definitions (following `@as` or an operation clause) to be comma-separated (`a,b,...`).
* Added number-mapped tags by allowing tag identifiers to be assigned a number by being on the left-hand side of an equal sign (`=`) followed by a number.
* Added context operations (against literal numbers only) for number-mapped tags that resemble basic comparison operators like `==` and `>=`.
* Added context ternary operator `?` paired with `:` for doing if-else context expressions.
* Re-purposed `$` with parentheses for identifying and containing numeric comparisons.
* Removed `%` / `@leaf` wildcard context operand.
* Removed `~` / `@root` wildcard context operand.
* Removed `?` / `@random` wildcard context operand.
* Added `@depth` / `@d` built-in context variable for number comparison operations.
* Added `@children` / `@c` built-in context variable for number comparison operations.
* Added `@index` / `@i` built-in context variable for number comparison operations.
* Added `@siblings` / `@n` built-in context variable for number comparison operations.
* Added `@random` / `@q` built-in context variable for number comparison operations.
* Added `@shuffled` / `@s` built-in context variable for number comparison operations.
* Added `@iterandom` / `@r` built-in context variable for number comparison operations.
* Removed the `@once` and `@many` clauses.
* Removed the `greedy` query parameter.
* Added `@limit` clause with integer argument.
* Added `limit` query parameter based on `@limit` clause.
* Added `mode` query parameter to PUT method so that `@put`, `@tag`, and `@untag` can be used in RESTful mode.
* Added XML raw input support in the form of `@xml` raw input tag.
* Added `--format` program argument (and argument to `Tridy.stringify()`) to control output format.
* Added YAML output format support.
* Added (limited) XML output format support.
* Added `--root-key` program argument (and argument to `Tridy.stringify()`) to control the root tag name when outputting to XML.
* Added `spaces` argument to `Tridy.stringify()` to control indent.
* Fixed some incorrect documentation that wasn't updated.
* Fixed client mode using a standalone local session as opposed to a server like it's supposed to.
* Fixed `--client` option not conflicting with `--type-key`.
* Fixed client mode sending the syntax tree output of no-ops like `@tridy` to a server.
* Fixed bug where a custom tree key would lead to an infinite loop when using `@get` with `@typeless`, `@tagless`, or `@trimmed`.
* Fixed comments being dysfunctional in console mode.
* Improved behavior of server mode when receiving incorrectly-formatted abstract syntax trees.
* Fixed bug where different forms of raw input could be intermixed in some situations, with unexpected behavior.

<br>

### Release Date TBD
##  Version 0.4.0: Architect

* Added `@offset` clause to complement `@limit` and ignore the first *n* *successfully* tested modules.
* Added `@repeat` clause to complement `@limit` and retry every module again for the same statement *n* times.
* Added `@stat` operation clause for counting modules.
* Added statistic output for non-`@get` operations when log level >= verbose.
* Added `@import` operation clause for importing Tridy scripts (client-side by default).
* Added `@file` raw input clause for importing non-Tridy markdown data from files.
* Added `@text` raw input clause as placeholder for literal strings and file imports.
* Added `@cut` operation clause.
* Added `@copy` operation clause.
* Added "functions" for (server-side) user-generated input in place of literal input (requires user-placed JavaScript code).
* Added `@function` raw input clause with string or primitive arguments.
* Added functions as possible raw module input.
* Added functions as possible free data structure input.
* Changed tags to now accept primitive values of any type, including strings.
* Changed tags with values to now be internally-represented by single-key objects rather than colon-delimited strings.
* Changed no-value tags to be matched with `$(<tag> <operator> @none)` since `null` actually maps to JavaScript's `null` now.
* Added functions as possible tag value input (coerced to primitive).
* Added functions as possible type key input (coerced to primitive).
* Added functions as possible context variable (coerced to primitive).
* Added multi-seed input for `--seed` (for passing to functions).
* Added "test.hello" default function.
* Added "test.params" default function.
* Added "time.timestamp" default function.
* Added "time.year" default function.
* Added "time.month" default function.
* Added "time.month.string" default function.
* Added "time.day" default function.
* Added "time.hour" default function.
* Added "time.minute" default function.
* Added "time.second" default function.
* Added "time.dow" default function.
* Added "time.dow.string" default function.
* Added "uuid" default function.
* Added "random.dictionary" default function.
* Added "random.select" default function.
* Added "random.string.seeded" default function.
* Added "random.string.secure" default function.
* Added "tag.increment" default function.
* Added "tag.decrement" default function.
* Added "tag.concat" default function.
* Added "tag.add" default function.
* Added "tag.multiply" default function.
* Added "tag.not" default function.
* Added "tag.set.concat" default function.
* Added "tag.set.sum" default function.
* Added "tag.set.product" default function.
* Added "tag.set.and" default function.
* Added "tag.set.or" default function.
* Added "tag.series.concat" default function.
* Added "tag.series.sum" default function.
* Added "tag.series.product" default function.
* Added "tag.series.and" default function.
* Added "tag.series.or" default function.
* Removed `@end` raw input end delimiter clause.
* Re-added `%` as new raw input delimiter (for non-strings).
* Added `@indent` `@get` parameter clause with integer argument.
* Added `@json` `@get` parameter output format clause.
* Added `@yaml` `@get` parameter output format clause.
* Added `@xml` `@get` parameter output format clause.
* Added `@simple` `@get` parameter output format clause (for arbitrary simple text output).
* Added `@nested` `@get` parameter output format clause (for arbitrary nested text output).
* Added `@text` `@get` parameter output format clause for simple or nested arbitrary text output.
* Added `@list` `@get` parameter and list-controlling clause (forces a list/array to be output, even when there's only one module).
* Added `@items` `@get` parameter and list-controlling clause (forces modules to output individually, even when there are more than one).
* Added `@create` `@get` parameter and file export clause (tries to write to a new file or fails).
* Added `@append` `@get` parameter and file export clause (tries to create or append a file).
* Added `@replace` `@get` parameter and file export clause (tries to create or overwrite a file).
* Added `@file` `@get` parameter clause for exporting markdown data to files.
* Added `@quiet` `@get` parameter clause for stopping file export from throwing errors if it can't export.
* Added `@split` (list-controlling) control clause.
* Removed context-locking.
* Removed `--pretty` program option (this is now the default).
* Removed need for semicolon after ending brackets with `@has` or multi-statements.
* Fixed bug where line number (displayed debugging information) wouldn't increment in multi-line console mode input.
* Added file path to displayed debugging information.
* Added `--server-preformat` program option.
* Added `--server-allow-verbatim` program option.
* Added `--server-deny-syntax-tree` program option.
* Limited functionality of `@clear` and `@exit` to console mode.
* Removed `@none` as argument to `@tag` and `@untag`.
* Removed the RESTful server sub-mode.
* Changed syntax tree and verbatim server sub-modes to no longer force use of PUT method.
* Redesigned syntax and verbatim server sub-modes to set acceptable method calls based on query contents.
* Changed ternary operator (`?` + `:`) precedence to be below the nested operators.
* Added client-side validation of server output.
* Reworked output behavior around aliases; server now forwards its aliases used with output.
* `@of` re-placed to be required after `@as`.
* Changed `@final` with XML output to replace the root element with its contents if the root contains only one element.
* Added shorthand inclusive recursive transitive nested operator `&//` / `@catchall` (faster equivalent to `(exp1 & exp2) | (exp1 // exp2)`).
* Added shorthand recursive wilcard `**` / `@all` (equivalent to `* &// *`).
* Added shorthand inverted lookahead nested operator `!>` / `@nonparent` (faster equivalent to `exp1 & !(exp1 > exp2)`).
* Added shorthand inverted lookahead nested operator `!>>` / `@nonascend` (faster equivalent to `exp1 & !(exp1 >> exp2)`).
* Added shorthand inverted lookbehind nested operator `!<` / `@nonchild` (faster equivalent to `exp1 & !(exp1 < exp2)`).
* Added shorthand inverted lookbehind nested operator `!<<` / `@nondescend` (faster equivalent to `exp1 & !(exp1 << exp2)`).
* Changed `@tag` so that it will re-assign new values that are given instead of ignoring the tags if they are duplicates.
* Changed `@untag` so that it now has a syntax different from `@tag`, and no longer takes values needlessly (use context value expressions for discriminating).
* Renamed `--root-key` to `--list-key` and fixed potential bug over confusion.
* Fixed bug output where output from file or command import (with respect to the program) wouldn't display/export outside of inline mode.
* Added `@if` and `@else` (and `@else @if`) as alternative to `@in` that doesn't raise the context level (and only executes once).

<br>

### Release Date TBD
##  Version 1.0.0: Public Release

* TBD