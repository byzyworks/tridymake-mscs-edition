# Tridy

## Introduction

Tridy (pronounced "tree-dee") was formed as a response to common generalized data storage formats such as XML, JSON, or YAML that normally represent data 'as-is', meaning where an object (as a subcollection of data) is to be represented multiple times, it must also exist and be copied to the same number of locations. This is likely to create considerable redundancy, and while Tridy does not do away with it from the back-end (nor is it supposed to), it can at least do away with it from the front.

Notably, it is not intended to be as a replacement for SQL or even NoSQL as a general data storage solution, as while Tridy may solve some redundancies, it is not designed to be efficient. This is considering that it deals directly with, if not expects nested data, and still in the end would cause this data to being duplicated, which is wildly storage-inefficient if we compare this to referencing. That, of course, isn't mentioning the tons of other optimizations that so far exist in other SQL and NoSQL database systems.

As for what it *is* for, Tridy is designed to be a lightweight tool for lightweight, though-slightly-more-heavyweight-than-usual configuration data (usually because of redundancies), and that is organized in a tree or graph-like structure. This data is expected to be processed into a readable output that other applications are meant to interact with directly or, if needed, through a Tridy interface. It is extremely modular in the sense that (non-nested) data is never coupled together, as also an upside to the at-least redundant output. Without that, is is also ideal for creating DAG structures, given that, at the storage level at least, no referencing means no circular references either. Finally, as it creates and stores data in the form of a tree, it is also at a natural advantage when it comes to integrating with a filesystem, and is easily able to input and output to one.

To summarize, Tridy's aim is viewable, portable, modular, and acceptably-redundant data defined in an irredundant format.

<br>

## TridyDB

---

Tridy is a compiled data format, meaning that the data files aren't immediately useful for being read by an application. Instead, a Tridy **composer** needs to read the data files, parse the contained statements, and output in a common data format such as JSON first. This is because the output of a single statement in Tridy can appear in multiple places in the final output, relative to the output of previously-executed statements. To permit this, Tridy uses a system of *tagged modules* where a statement may be matched to an existing module so long as a boolean expression is satisfied. In particular, the operands of this expression are the tags themselves, and are either true if a tag is shared between both the expression and the given module, or false if not shared with the given module.

<!-- Imported from Overleaf, possibly to be expanded upon -->

TridyDB expects a kind of schema to foster it's capabilities and make it useful in a way that is as generalized as possible, but not as generalized as plain JSON or the like. These expectations are outlined below, and are automatically-enforced at least by the Tridy language:

1. At a minimum, every module should (but is not required to) consist of a **tags** array, which is an array of strings that each form the module's tags
2. In reality, a module may also have a **free** data structure, and a **tree** data structure.
3. A module should contain no other data items at the root of the module, not even metadata.
4. All identification of the module by TridyDB for queries must be done using tags located inside the tags array. TridyDB will not consider anything else.
5. A module may have zero to many tags, as an array of strings.
6. Tags have no requirements to be unique, but they may be made unique by design.
7. Tags are strings that may *only* contain lowercase letters, uppercase letters, numbers, dashes, or underscores.
8. *All* data that is organized in an arbitrary fashion must be stored under the free data structure. This should include an application's usable data.
9. There are no rules for how the free data structure should be composed, and it can be a primitive type, an array type, a mapped type, or any combination of all three. It is an application's job to control the schema or format of it.
10. *All* modules which are nested under the current module must be stored under the tree data structure, which must itself be an array.
11. A module may have zero to many nested modules inside the tree data structure.
12. Modules may recursively nest other modules to no limit in depth or number of modules otherwise.
13. The keys used as identifiers may change depending on the application.

By design, as there is no specialized output format or storage management, TridyDB is meant to be able to output to anywhere directly, whereby applications can read or write to the same storage files without ever touching TridyDB itself again more than once (albeit at a disadvantage). The database part of TridyDB is meant more as an option rather than a necessity.

To support its use for that, though, TridyDB is provided with three possible output paradigms.

1. For applications not interacting with TridyDB at all, there's the **filesystem**. Notably, when TridyDB imports existing data, it does so recursively with respect to the import folder's filesystem such that the structure of it gets placed with the data itself. This is then used to export the data in place.
2. For applications interacting with TridyDB locally, there's **standard output**, for which there are three possible modes under this setup. TridyDB supports use as an interactive terminal application, running commands inline, or by file import.
3. For applications interacting with TridyDB remotely (or persistently), there's a **RESTful web API**, though this expects a slightly different syntax as a result of working over an HTTP URI format. However, this API is extremely basic still if one already understands Tridy syntax at all, considering it has only four API endpoints and one route, and that is because Tridy's operational design is already highly analogous to the four commonly-used HTTP methods of RESTful APIs (GET, POST, PUT, and DELETE).

As seen later, Wingspan Habitat uses the third method of interaction, though also while doing so locally (so TridyDB can be utilized as a server, still).

### Input



### Output

AAA

### Modules

AAA

### Module Tags

AAA

### Module "Free" Data

AAA

### Module "Tree" Data

AAA

<br>

## Tridy (The Language/Input)

---

To show how Tridy actually works, suppose we have a snippet of Tridy code like the following:

```
@new a;
@new b;
@new a b;

@in a @xor b
@new c
@is @json { "letter":"true" } @end;
```

Tridy contains keywords, or **clauses**, that all begin with an `@` symbol.

Similar to SQL, Tridy statements are also semicolon-delimited, where the semicolon is required at the end of the statement. This has at least the advantage of allowing the language to be whitespace-insensitive, allowing users to adopt their own indentation or presentation style.

The first statement, `@new a`, creates a new module tagged as *a*, and stores it at the root module inside a newly-created document. Since the document is likely stored as a JSON object, the root module would be whatever is *directly* under the opening `{` and closing `}` of the document.

`@new` is considered as the **operation** of the Tridy statement, which defines the action taken by it. `@new`, as the name implies, creates a new module, while the three other operations `@set`, `@get`, and `@del` can be used to change an existing module, print an existing module, and delete an existing module respectively.

The second statement, `@new b`, acts similarly, creating a new module tagged as `b` under the root module. More specifically, the last two statements (respectively) stored the modules tagged `a` and `b` under a named array inside the root module, of which the name of this array is consistent for all modules. That would imply that `a` and `b` can also store their own sub-modules, so it's worth noting that modules are such that they can be placed recursively at any possible depth.

The third statement creates a new module tagged as both `a` and `b`. Tags are such that individual modules can have multiple tags, and they do not have to be unique. Thus, TridyDB places no restrictions on how a module is identified, and uniqueness constraints are not meant to be enforced except at a higher level.

The fourth statement is meant to show some of where Tridy can be powerful. In any Tridy statement, `@in` is used to specify a **context**, which is the expression that any module is tested for before the statement can be applied to it. The operation always follows *after* the end of whatever the context expression is, so in this case, the context expression is `a @xor b`. Given this preceding expression, `@new c` will only be applied to an existing module if and only if it has the tags `a` or `b`, but never both at the same time. Only in the modules created by the first two statements would this evaluate as true, so only the first two modules are affected. However, they both receive a copy of the new module tagged as `c`, and the only change needed to make all three existing modules (under the root module) receive a copy would be to change `a @xor b` to `a @or b`.

Finally, the latter half of the statement contains an example bit of arbitrary data given in a JSON format, which is delimited by the `@json` and `@end` clauses, respectively. The `@is` clause to which those are given as arguments is used to provide the definition for the free data structure of the module, given (always) through a common format such as JSON or YAML.

If the output format is a JSON object, then the statements above might have the following as its output:

```
{
    "tree": [
        {
            "tags": ["a"],
            "tree": [
                {
                    "tags": ["c"]
                }
            ]
        },
        {
            "tags": ["b"],
            "tree": [
                {
                    "tags": ["c"]
                }
            ]
        },
        {
            "tags": ["a", "b"]
        }
    ]
}
```

This is only a small part of what Tridy is capable of. Operations in Tridy can, in fact, become considerably more complex to suit different purposes. As an example of one of these operations, here is one expression which only affects the deepest modules inside a homogeneously-tagged tree:

```
root-level-module >>> tree-node & !(tree-node << tree-node)
```

Here we also have an example of operators as punctuation, rather than clauses. In fact, there are various equivalences present for usability's sake.

In detail, the operation above searches for all modules tagged as `tree-node` that are nested inside of a module at the root tagged as `root-level-module`. The operator `>>>`, or `@toall`, applies to all modules inside another module (recursively) where the right-hand side of the expression evaluates as true. Understandably, this also has the lowest precedence out of all the operations due to its effectiveness, so it is determined last, while parentheses can be used to force a certain precedence.

<!--- Section below is to be removed from the readme, but not the report -->

The second half of the expression is true for all modules tagged as `tree-node` (and only modules tagged as `tree-node`, hence the `&`/`@and` in the middle there and the first `tree-node` immediately after `>>>`) so long as they are not descended by another module tagged as `tree-node`, at any level. The `<<`/`@ascend` operator searches modules similar to how `>>>` does, but backtracks when the right hand side becomes true such that the parenting module is affected as opposed to the child module(s). Note that beyond just the standard boolean operators, there are three more-limited versions of the operators just described, including `/`/`>`/`@to`, `>>`/`@toward`, and `<`/`@parent`, as well as various wildcard operands, including `*`/`@any`, `%`/`@leaf`, and `?`/`@random`. Hopefully, most of these are self-explanatory.

<br>

## Context

### Introduction

AAA

### Operand: Tags

AAA

### Operand: `@any` / "`*`"

AAA

### Operand: `@leaf` / "`%`"

AAA

### Operand: `@random` / "`?`"

AAA

### Operator: `@not` / "`!`"

AAA

### Operator: `@and` / "`&`" / " "

AAA

### Operator: `@xor` / "`^`"

AAA

### Operator: `@or` / "`|`" / "`,`"

AAA

### Operator: `@parent` / "`<`"

AAA

### Operator: `@ascend` / "`<<`"

AAA

### Operator: `@to` / "`/`" / "`>`"

AAA

### Operator: `@toward` / "`>>`"

AAA

### Operator: `@toall` / "`>>>`"

AAA

<br>

## Operations

### Introduction

AAA

### Meta-Operation: `@in`

AAA

### Operation: `@get`

AAA

### Operation: `@new`

AAA

### Operation: `@set`

AAA

### Operation: `@del`

AAA

<br>

## Modules

### Introduction

AAA

### Operation: `@as`

AAA

### Operation: `@is`

AAA

### Operation: `@has`

AAA

<br>

## Special Clauses

### `@tridy`

### `@exit`

### `@none`

### `@uuid`

## Glossary