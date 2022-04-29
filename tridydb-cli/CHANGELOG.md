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
