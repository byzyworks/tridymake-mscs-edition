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
* The input buffer / carry is now cleared when pressing Ctrl+C while inside console mode.
* Fixed a bug where the database would attempt to check the tags of a primitive raw input module.
* Fixed a bug where the database would fail to catch errors when attempting `@new` against a root module already changed to a primitive type using `@set` with raw input.
* Fixed a bug where (in particular) empty strings entered as module raw input would be converted to map objects.
