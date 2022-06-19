# Change Log

Please use this document as a place to briefly re-iterate changes committed to the repository. Make sure to keep track of changes you make *while* you are modifying the codebase.

Use the version-numbering system below when identifying and committing changes.

(*major release/feature version #*).(*minor release/feature version #*).(*security/hotfix patch version #*)

Changes that have no effect on functionality (such as to documentation) do not need to be stated here, or have the version re-numbered.

Remember also to set the version number inside package.json and utility/common.

<br>

### 2022/04/29
## Version 1.0.0: Release

* TridyDB released.

## Version 1.0.1

* Fixed a bug that would cause `@del` to delete the entire tree an element is inside of if matched as also the first module in its the tree.

## Version 1.1.0

* Added clauses `@raw`, `@typeless`, `@tagless`, `@trimmed`, `@merged`, and `@final` as ending parameters to `@get` as a way to remove TridyDB metadata from the output (as a side effect making the output one-way / non-reusable by Tridy as input), and compress the remaining output down to varying degrees (`@raw` means no compression / the default behavior while `@final` has the greatest compression).
* Added type specifiers as the fourth piece of TridyDB modules, which is automatically determined from the last tag now when not using `@as` to provide tags.
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

## Version 1.2.0

* Improved TridyDB's flexibility when used as an NPM package; Tridy is now exported as a class as opposed to a singleton, so multiple Tridy instances are possible now.
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
* Fixed some incorrect documentation that wasn't updated.
* Fixed client mode using a standalone local session as opposed to a server like it's supposed to.
* Fixed `--client` option not conflicting with `--type-key`.
* Fixed client mode sending the syntax tree output of no-ops like `@tridy` to a server.
* Fixed bug where a custom tree key would lead to an infinite loop when using `@get` with `@typeless`, `@tagless`, or `@trimmed`.
* Improved behavior of server mode when receiving incorrectly-formatted abstract syntax trees.
