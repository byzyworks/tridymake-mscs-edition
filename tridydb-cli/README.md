<div id="tridy"/>

# Tridy

<div id="intro"/>

## Introduction

Tridy (pronounced "tree-dee") was formed as a response to common generalized data storage formats such as XML, JSON, or YAML that normally represent data 'as-is', meaning where an object (as a subcollection of data) is to be represented multiple times, it must also exist and be copied to the same number of locations. This is likely to create considerable redundancy, and while Tridy does not do away with it from the back-end (nor is it supposed to), it can at least do away with it from the front.

Notably, it is not intended to be as a replacement for SQL or even NoSQL as a general data storage solution, as while Tridy may solve some redundancies, it is not designed to be efficient. This is considering that it deals directly with, if not expects nested data, and still in the end would cause this data to being duplicated, which is wildly storage-inefficient if we compare this to referencing. That, of course, isn't mentioning the tons of other optimizations that so far exist in other SQL and NoSQL database systems.

As for what it *is* for, Tridy is designed to be a lightweight tool for lightweight, though-slightly-more-heavyweight-than-usual configuration data (usually because of redundancies), and that is organized in a tree or graph-like structure. This data is expected to be processed into a readable output that other applications are meant to interact with directly or, if needed, through a Tridy interface. It is extremely modular in the sense that (non-nested) data is never coupled together, as also an upside to the at-least redundant output. Without that, is is also ideal for creating DAG structures, given that, at the storage level at least, no referencing means no circular references either. Finally, as it creates and stores data in the form of a tree, it is also at a natural advantage when it comes to integrating with a filesystem, and is easily able to input and output to one.

To summarize, Tridy's aim is viewable, portable, modular, and acceptably-redundant data defined in an irredundant format.

<br>

## Table of Contents

---

1. [Tridy](#tridy)
    1. [Introduction](#intro)
    2. [TridyDB](#tridydb)
        1. [Format](#tridydb-form)
        2. [Schemas](#tridydb-schema)
        3. [Security](#tridydb-sec)
    3. [Tridy (the Language)](#tridylang)
        1. [Modules](#modules)
        2. [Context](#context)
            1. [Introduction](#context-intro)
            2. [Empty Expressions](#context-empty)
            3. [Context Terminals](#context-terminals)
                1. [Tags](#context-tags)
                2. [@any](#context-any)
                3. [@root](#context-root)
                4. [@leaf](#context-leaf)
                5. [@random](#context-random)
            4. [Context Operators](#context-operators)
                1. [@not](#context-not)
                2.  [@and](#context-and)
                3.  [@xor](#context-xor)
                4.  [@or](#context-or)
                5.  [@parent](#context-parent)
                6.  [@ascend](#context-ascend)
                7.  [@child](#context-child)
                8.  [@descend](#context-descend)
                9.  [@to](#context-to)
                10. [@toward](#context-toward)
                11. [Parentheses](#context-parenth)
            5. [Summary](#context-summary)
        3.  [Syntax](#syntax)
            1.  [Introduction](#syntax-intro)
            2.  [Comments](#syntax-comments)
            3.  [Clauses](#syntax-clauses)
                1.  [@tridy](#syntax-tridy)
                2.  [@clear](#syntax-clear)
                3.  [@exit](#syntax-exit)
                4.  [@in](#syntax-in)
                5.  [@get](#syntax-get)
                6.  [@new](#syntax-new)
                7.  [@set](#syntax-set)
                8.  [@del](#syntax-del)
                9.  [@as](#syntax-as)
                10. [@uuid](#syntax-uuid)
                11. [@is](#syntax-is)
                12. [@json](#syntax-json)
                13. [@yaml](#syntax-yaml)
                14. [@end](#syntax-end)
                15. [@has](#syntax-has)
                16. [@many](#syntax-none)
                17. [@once](#syntax-once)
                18. [@many](#syntax-many)
            4.  [Summary](#syntax-summary)
    4.  [Glossary](#glossary)

<br>

<div id="tridydb"/>

## TridyDB

---

Tridy is a compiled data format, meaning that the data files aren't immediately useful for being read by an application. Instead, a Tridy **composer** needs to read the data files, parse the contained statements, and output in a common data format such as JSON first. This is because the output of a single statement in Tridy can appear in multiple places in the final output, relative to the output of previously-executed statements. To permit this, Tridy uses a system of *tagged modules* where a statement may be matched to an existing module so long as a boolean expression that a Tridy statement is addressed with is satisfied. In particular, the terminals of this expression are the tags themselves, and are either true if a tag is shared between both the expression and the given module, or false if not shared with the given module. This is explained in greater detail below where the Tridy language is explained.

By design, as there is no specialized output format or storage management, TridyDB is meant to be able to output to anywhere directly, whereby applications can read or write to the same storage files without ever touching TridyDB itself again more than once (albeit at a disadvantage). The database part of TridyDB is meant more as an option rather than a necessity.

To support its use for that, though, TridyDB is provided with three possible output paradigms.

<!-- Note about option 1 below: option 1 is currently not implemented, but the similarity of a Tridy module to a filesystem makes it easy to add an extra bit of middleware that will simply map one to the other. -->

1. For applications not interacting with TridyDB at all, there's the **filesystem**. Notably, when TridyDB imports existing data, it does so recursively with respect to the import folder's filesystem such that the structure of it gets placed with the data itself. This is then used to export the data in place.
2. For applications interacting with TridyDB locally, there's **standard output**, for which there are three possible modes under this setup. TridyDB supports use as an interactive terminal application, running commands inline, or by file import.
3. For applications interacting with TridyDB remotely (or persistently), there's a **RESTful web API**, though this expects a slightly different syntax as a result of working over an HTTP URI format. However, this API is extremely basic still if one already understands Tridy syntax at all, considering it has only four API endpoints and one route, and that is because Tridy's operational design is already highly analogous to the four commonly-used HTTP methods of RESTful APIs (GET, POST, PUT, and DELETE).

<br>

<div id="tridydb-form"/>

### Format

<!-- Note about XML: not yet. -->

TridyDB supports importing JSON-formatted as well as YAML-formatted data. As output, export to JSON and XML is supported.

<br>

<div id="tridydb-schema"/>

### Schemas

TridyDB does not support the use of or creation or validation of schemas at this point in time.

<br>

<div id="tridydb-sec"/>

### Security

As far as security goes, it is not recommended to use TridyDB except locally right now. While a user system is planned for the future, and TridyDB's nested architecture and context system are ripe for having granularized access controls, TridyDB is currently single-user. In addition, the web-based API shouldn't be used in a secure context either, since it is at risk for command injection in the same manner that SQL or other database engines are. In addition, this port should *never* be opened to the internet for the same reason that you shouldn't open MySQL port 3306 to the internet, even once a user system is built-in. To that end, any accesses to TridyDB should be regulated through another application stacked between the user and the database.

<br>

<div id="tridylang"/>

## Tridy (The Language)

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

Finally, the latter half of the statement contains an example bit of arbitrary data given in a JSON format, which is delimited by the `@json` and `@end` clauses, respectively. The `@is` clause to which those are given as arguments is part of the statement **definition**, and is used to define the **free** data structure of the module, given (always) through a common format such as JSON or YAML. There are three other clauses which pertain to the module's definition: `@as`, which defines the module's tags (this is implicitly given after the operation if not stated directly such that tags can be given after the operation even without `@as`). Then there's `@has` for executing Tridy statements *inside* the tree of another module. Then finally, there's `@once`/`@many` for statement to be greedy (returning after only one module matches the context expression) or non-greedy, respectively (the default is non-greedy).

If the output format is a JSON object, then the statements above might have the following as its output:

```diff
{
    "tree": [
        {
            "tags": ["a"],
            "tree": [
+               {
+                   "tags": ["c"]
+               }
            ]
        },
        {
            "tags": ["b"],
            "tree": [
+               {
+                   "tags": ["c"]
+               }
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
root-level-module // tree-node & !(tree-node >> tree-node)
```

Here we also have an example of operators as punctuation, rather than clauses. In fact, there are various equivalences present for usability's sake.

In detail, the operation above searches for all modules tagged as `tree-node` that are nested inside of a module at the root tagged as `root-level-module`. The operator `//`, or `@toward`, applies to all modules inside another module (recursively) where the right-hand side of the expression evaluates as true. Understandably, this has a lower precedence than the other operations due to its effect of moving the entire context forward (everything to the right-hand side is determined relative to *everywhere* in the tree descending from `root-level-module` now as opposed to just the root), so it is determined last, while parentheses can be used to force a certain precedence alternatively.

The second half of the expression is true for all modules tagged as `tree-node` (and only modules tagged as `tree-node`, hence the `&`/`@and` in the middle there and the first `tree-node` immediately after `//`) so long as they are not descended by another module tagged as `tree-node`, at any level. The `>>`/`@ascend` operator searches modules similar to how `//` does, but backtracks when the right hand side becomes true such that the parenting module is affected as opposed to the child module(s). Additionally, the reason this is AND'ed with `tree-node` is because `>>`, like the other nested operators, does `a & b` under the surface (minus the level switching), meaning that inverting the final result make it return true also for `a & !b` as well as `!a & b`, and we limit that by giving `tree-node` again.

Tridy is designed especially for these high-power operations, in a sense creating something akin to a filesystem where the single-name barrier is removed, and allowing for pathing to expand to include boolean operations done over these multiple names ("tags").

<br>

<div id="modules"/>

## Modules

---

TridyDB expects a kind of schema to foster it's capabilities and make it useful in a way that is as generalized as possible, but not so generalized that it can't offer anything over directly working with JSON, YAML, or similar. As part of this compromise, Tridy works with self-contained units of information that are collectively termed as **modules**. What actually makes a module a module is outlined in the list below:

1. At a minimum, every module should (but is not required to) have of an array of strings that each individually form the module's **tags**.
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
13. The keys used as identifiers may change depending on the application (TridyDB allows renaming these via. arguments).

Every module in an instance of Tridy is also a descendant of the **root module**, of which there is only one, and which is always used as a reference point for Tridy statements. Essentially, the root module is also equivalent to the entire database and its contents since nothing can exist outside of it. Thus, throughout this manual, what is referred to as the Tridy **database** is interchangable with the root module.

<br>

<div id="context"/>

## Context

---

<div id="context-intro"/>

### Introduction

In Tridy, **context** refers to the pathing situation of a module. In particular, it denotes what the tags of the module are, as well as the tags of its parent and all of its ascendents in order, also denoting where the module may be nested and how deeply it happens to also be nested. Assuming a database like the following:

```json
{
    "tree": [
        {
            "tags": ["a", "b"],
            "tree": [
                {
                    "tags": ["e"],
                    "tree": [
                        {
                            "tags": ["h", "i"]
                        }
                    ]
                }
            ]
        },
        {
            "tags": ["a"]
        },
        {
            "tags": ["c", "d"],
            "tree": [
                {
                    "tags": ["f", "g"]
                }
            ]
        }
    ]
}
```

Then the context of the particular module above having the tag `e` would have the context `[[a, b], [e]]`, though notably as well, it may not be the only module with that context, as part of how Tridy is meant to work.

TridyDB uses the information contained in the context of existing modules and evaluates it against a **context expression**, a string of operators and operands in which the operands are other context expressions, which themselves are either terminal (as tags) or non-terminal. Terminals/tags evaluate to true if they're present in the module being evaluated, and evaluate to false if they are not. Non-terminals/expressions allow combining the results of terminals, which notably include the commonplace boolean operators `@not`/`!`, `@and`/`&`/(whitespace), `@or`/`|`/`,`, and `@xor`/`^`.

Note that beyond just the standard boolean operators, there are six different versions of the so-called *nested* operators, which are divided into lookahead, lookbehind, and transitive types. `@parent`/`>` and `@ascend`/`>>` are lookahead operators since they match a child on the right-hand side and affect the parent. `@child`/`<` and `@descend`/`<<` are lookbehind operators since they match a parent on the right-hand side and affect the child. Finally, `@to`/`/` and `@toward`/`//` are transitive operators since they match a child on the right-hand side and affect the same child, while parentheses also play a role in reversing the transitions they cause. In addition are various wildcard operands, including `@any`/`*`, `@root`/`~`, `@leaf`/`%`, and `@random`/`?`. These are all explained in greater detail below.

<br>

<div id="context-empty"/>

### Empty Expressions

Tridy allows users to forego giving context expressions at all, either by leaving out `@in`, or at least in the case of the affective operations `@get` and `@del`, proceeding it without a context expression. In other words, the following examples are all statements with empty expressions:

```
@del;
@set @json { "free": { "root": "true" } } @end;
@new @is @json { "child": "true" } @end;
@get;
```

```diff
[
-   { }
+   {
+       "free": { "root": "true" },
+       "tree": [
+           {
+               "free": { "child": "true" }
+           }
+       ]
+   }
]
```

If an expression is not given, then the operation is applied to the root/top-level module, whereby only it is affected.

<br>

<div id="context-terminals"/>

## Context Terminals

<div id="context-tags"/>

### Operand: Tags

In Tridy, tags are the alphanumeric identifiers used to identify a module. More specifically a tag is always a string composed of either lowercase letters, uppercase letter, numbers, dashes, or underscores, and to which is case sensitive. Additionally, a tag can also contain variable identifiers that begin with `$` and are enclosed with zero to one pairs of brackets to allow nesting, and which TridyDB automatically enforces the closure of. However, during composition, variables are treated much the same as other tags.

Examples of (single) tag expressions include:

```
@get abc;
@get X-Y-Z_123;
@get $d;
@get ${e${f}};
```

As an example that is not read-only:

```
# Before
@new a;

# After
@in a @new b;
```

```diff
[
    {
        "tags": ["a"],
        "tree": [
+           {
+               "tags": ["b"]
+           }
        ]
    }
]
```

A stated previously, an individual tag evaluates to true if a module contains the same tag that a context expression expects, so long as it is at the nesting level expected, which can be controlled by the nested operators below. Otherwise, the tags are evaluated at the level of the root/top-level module.

Per why they're called tags, TribyDB places no restrictions on uniqueness or how many tags a module can have, and a module may even contain no tags at all where only wildcard operands can affect it. The only thing TridyDB does restrict are duplicate tags in the same module, but this is simply because including them multiple times in the same module has no effective purpose, and it's better to enforce this as a rule for best practice reasons.

<br>

<div id="context-any"/>

### Wildcard Operand: `@any` / "`*`"

The `@any` operand is used in a way that is analogous to a tautology in the Tridy language, meaning when `@any` is used, all sub-modules of a module are matched, though notably, this still applies only at the current nesting level unless a transitive nested operator is used with it. Combining this with `@descend` or `@toward` (both explained below) will do the job of matching all modules at all levels.

```
# Before
@new;
@new a;
@new b;
@new a b;

# After
@in * @new c;
```

```diff
[
    {
        "tree": [
            {
                "tags": [ ],
                "tree": [
+                   {
+                       "tags": ["c"]
+                   }
                ]
            },
            {
                "tags": ["a"],
                "tree": [
+                   {
+                       "tags": ["c"]
+                   }
                ]
            },
            {
                "tags": ["b"],
                "tree": [
+                   {
+                       "tags": ["c"]
+                   }
                ]
            },
            {
                "tags": ["a", "b"],
                "tree": [
+                   {
+                       "tags": ["c"]
+                   }
                ]
            }
        ]
    }
]
```

<br>

<div id="context-root"/>

### Wildcard Operand: `@root` / "`~`"

The `@root` operand applies if and only if the module being evaluated is a direct descendant of the root module. This operator would have not much of a use (since expressions already starting from the root module anyway) if not for the introduction of @child and @descend, which are normally greedy and do not otherwise have a way to determine their absolute position in the database.

```
# Before
@new a;
@in a @new b;
@in a/b @new b;
@in a/b/b @new c;
@in a @new d;
@in a/d @new b;
@in a/d/b @new c;

# After
@in a // c << b < ~ @new e;
```

```diff
[
    {
        "tree": [
            {
                "tags": ["a"],
                "tree": [
                    {
                        "tags": ["b"],
                        "tree": [
                            {
                                "tags": ["b"],
                                "tree": [
                                    {
                                        "tags": ["c"]
                                        "tree": [
+                                           {
+                                               "tags": ["e"]
+                                           }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "tags": ["d"],
                        "tree": [
                            {
                                "tags": ["b"],
                                "tree": [
                                    {
                                        "tags": ["c"]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
]
```

<br>

<div id="context-leaf"/>

### Wildcard Operand: `@leaf` / "`%`"

The `@leaf` operand applies if and only if the module being evaluated is a leaf, meaning that it contains no sub-modules of its own. In more detail, that either it has no nested tree data structure, or this structure is as an empty array. As is typical, the free data structure is not evaluated when making this decision.

```
# Before
@new a;
@in a @new b;
@in a/b @new b;
@in a @new b;

# After
@in a // % @new c;
```

```diff
[
    {
        "tree": [
            {
                "tags": ["a"],
                "tree": [
                    {
                        "tags": ["b"],
                        "tree": [
                            {
                                "tags": ["b"],
                                "tree": [
+                                   {
+                                       "tags": ["c"]
+                                   }
                                ]
                            }
                        ]
                    },
                    {
                        "tags": ["b"],
                        "tree": [
+                           {
+                               "tags": ["c"]
+                           }
                        ]
                    }
                ]
            }
        ]
    }
]
```

<br>

<div id="context-random"/>

### Wildcard Operand: `@random` / "`?`"

The `@random` operand forms one of the few non-deterministic operands included with the Tridy language. This operand effectively operates like a coin flip, where it has a 50% chance of evaluating to true, and a 50% chance of evaluating to false. The chances of the operand coming out as either can be raised or lowered by chaining multiple `@random` clauses together with either `@and` or `@or` (for instance, as "`? & ?`" or "`? | ?`"), respectively. That is, following statistic reasoning, the probability of success, and therefore, a module being affected, can then be controlled like that of a binomial distribution, allowing for a lot of interesting combinations of modules to be created.

<br>

<div id="context-operators"/>

## Context Operators

<div id="context-not"/>

### Basic Operator: `@not` / "`!`"

The `@not` operator forms the only unary operator in Tridy's expressional syntax, and either returns true if its operand is false, or false if its operand is true. If the operand is just a single tag, then only modules which lack the given tag will be affected.

```
# Before
@new;
@new a;
@new b;
@new a b;

# After
@in !a @new c;
```

```diff
[
    {
        "tree": [
            {
                "tags": [ ],
                "tree": [
+                   {
+                       "tags": ["c"]
+                   }
                ]
            },
            {
                "tags": ["a"]
            },
            {
                "tags": ["b"],
                "tree": [
+                   {
+                       "tags": ["c"]
+                   }
                ]
            },
            {
                "tags": ["a", "b"]
            }
        ]
    }
]
```

If not including parantheses, `@not` has the highest precedence out of all the operators given.

<br>

<div id="context-and"/>

### Basic Operator: `@and` / "`&`" / " "

The `@and` operator evaluates as true if and only if the operands on both sides of the operator are true. Otherwise, it evaluates as false. This can be used if you wish only for a module that has two or more particular tags at the same time to be affected.

Worth noting is that `@and` is also considered as the "implicit" operation, meaning that if two tags are separated only by whitespace characters without an explicit operator, such as "`@in a b`", then this has the exact same effect as "`@in a & b`".

```
# Before
@new;
@new a;
@new b;
@new a b;

# After
@in a & b @new c;
```

```diff
[
    {
        "tree": [
            {
                "tags": [ ]
            },
            {
                "tags": ["a"]
            },
            {
                "tags": ["b"]
            },
            {
                "tags": ["a", "b"],
                "tree": [
+                   {
+                       "tags": ["c"]
+                   }
                ]
            }
        ]
    }
]
```

`@and`'s precedence is higher than that of `@not` and lower than that of `@xor`.

<br>

<div id="context-xor"/>

### Basic Operator: `@xor` / "`^`"

The `@xor` operator evaluates as true if and only if an operand on one side of the operator or the other evaluates as true, but never both at the same time. It is one of the few operators that is effectively a shorthand for a more complex expression using other, more simplistic operators.

```
# Before
@new;
@new a;
@new b;
@new a b;

# After
@in a ^ b @new c;
```

```diff
[
    {
        "tree": [
            {
                "tags": [ ]
            },
            {
                "tags": ["a"],
                "tree": [
+                   {
+                       "tags": ["c"]
+                   }
                ]
            },
            {
                "tags": ["b"],
                "tree": [
+                   {
+                       "tags": ["c"]
+                   }
                ]
            },
            {
                "tags": ["a", "b"]
            }
        ]
    }
]
```

`@xor`'s precedence is higher than that of `@and` and lower than that of `@or`.

<br>

<div id="context-or"/>

### Basic Operator: `@or` / "`|`" / "`,`"

The `@or` operator evaluates as true if either side of the operator evaluates as true, and stopping at that. Use this to attach a module to another with tags that do not exclusively have to be together in the same module.

```
# Before
@new;
@new a;
@new b;
@new a b;

# After
@in a | b @new c;
```

```diff
[
    {
        "tree": [
            {
                "tags": [ ]
            },
            {
                "tags": ["a"],
                "tree": [
+                   {
+                       "tags": ["c"]
+                   }
                ]
            },
            {
                "tags": ["b"],
                "tree": [
+                   {
+                       "tags": ["c"]
+                   }
                ]
            },
            {
                "tags": ["a", "b"],
                "tree": [
+                   {
+                       "tags": ["c"]
+                   }
                ]
            }
        ]
    }
]
```

`@or`'s precedence is higher than that of `@xor` and lower than that of any of the non-transitive nested operators.

<br>

<div id="context-parent"/>

### Lookahead Nested Operator: `@parent` / "`>`"

The `@parent` operator returns true only if the right side of the operator is true for a child of a module for which the left side of the operator is true. For instance, in the case where a module tagged as `apple` has one or more sub-modules with the `seed` tag, then the expression "`apple > seed`" will only apply to those `apple` modules that have at least one of these sub-modules tagged with `seed`. In essence, the parent module is thus affected as the result of a property that one or more of its child modules have.

```
# Before
@new apple;
@new apple;
@in apple @new seed @once;

# After
@in apple > seed @new reproductive;
```

```diff
[
    {
        "tree": [
            {
                "tags": ["apple"],
                "tree": [
                    {
                        "tags": ["seed"]
                    },
+                   {
+                       "tags": ["reproductive"]
+                   }
                ]
            },
            {
                "tags": ["apple"]
            }
        ]
    }
]
```

`@parent`'s precedence is the same as all of the non-transitive nested operators, being higher than that of `@or` and lower than the transitive nested operators.

<br>

<div id="context-ascend"/>

### Lookahead Nested Operator: `@ascend` / "`>>`"

The `@ascend` operator extends `@parent` to recursively look for sub-modules where the right side of the expression is true, such if you had the expression "`orchard >> seed`" instead, then any `orchard` modules would be affected so long as they had modules tagged `seed` anywhere in its subtree, even if not directly under the affected module. Effectively, this would be same as indiscriminately looping `@parent` over and over again as "`orchard > * > seed`", "`orchard > * > * > seed`", and so forth until the deepest level of nesting is reached for a `seed` module.

```
# Before
@new orchard;
@new orchard;
@in orchard new apple;
@in orchard/apple @new seed @once;

# After
@in orchard >> seed @new regrowable;
```

```diff
[
    {
        "tree": [
            {
                "tags": ["orchard"],
                "tree": [
                    {
                        "tags": ["apple"],
                        "tree": [
                            {
                                "tags": ["seed"]
                            }
                        ]
                    },
+                   {
+                       "tags": ["regrowable"]
+                   }
                ]
            },
            {
                "tags": ["orchard"],
                "tree": [
                    {
                        "tags": ["apple"]
                    }
                ]
            }
        ]
    }
]
```

`@ascend`'s precedence is the same as all of the non-transitive nested operators, being higher than that of `@or` and lower than the transitive nested operators.

<br>

<div id="context-child"/>

### Lookbehind Nested Operator: `@child` / "`<`"

The `@child` operator returns true only if the left side of the operator is true for a child of a module for which the right side of the operator is true. While it effectively just reverses directions from `@parent` (and because the two sides are AND'ed together in the end, the final outcome would happen to be pretty much or nearly the same), it differs rather in the module that gets affected when the result is true. Since `@parent` affects the parent, obviously this would affect the child instead, i.e. still the left-hand side of the operator.

```
# Before
@new orchard;
@new trashcan;
@in orchard | trashcan @new apple;

# After
@in * / apple < orchard @new fresh;
```

```diff
[
    {
        "tree": [
            {
                "tags": ["orchard"],
                "tree": [
                    {
                        "tags": ["apple"],
                        "tree": [
+                           {
+                               "tags": ["fresh"]
+                           }
                        ]
                    }
                ]
            },
            {
                "tags": ["trashcan"],
                "tree": [
                    {
                        "tags": ["apple"]
                    }
                ]
            }
        ]
    }
]
```

`@child`'s precedence is the same as all of the non-transitive nested operators, being higher than that of `@or` and lower than the transitive nested operators.

<br>

<div id="context-descend"/>

### Lookbehind Nested Operator: `@descend` / "`<<`"

The `@descend` operator extends `@child` similar to the way `@ascend` extends `@parent` by recursively searching the child module's context to see if at any point the right side of the operator is true for any module that it is nested under. Thus, it works in a way like looping indiscriminately looping `@child` over and over again like "`seed < orchard`", "`seed < * < orchard`", and so forth until after the right-hand side has reached the root module.

```
# Before
@new year 1961 1960s;
@in 1961 @new month October;
@in 1961/October @new day 30;
@in 1961/October/30 @new event tsar-bomba-dropped;
@new year 1989 1980s;
@in 1989 @new month November;
@in 1989/November @new day 9;
@in 1989/November/9 @new event fall-of-berlin-wall;

# After
@in * // event << 1980s @new period late-soviet;
```

```diff
[
    {
        "tree": [
            {
                "tags": ["year", "1961", "1960s"],
                "tree": [
                    {
                        "tags": ["month", "October"],
                        "tree": [
                            {
                                "tags": ["day", "30"],
                                "tree": [
                                    {
                                        "tags": ["event", "tsar-bomba-dropped"]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                "tags": ["year", "1989", "1980s"],
                "tree": [
                    {
                        "tags": ["month", "November"],
                        "tree": [
                            {
                                "tags": ["day", "9"],
                                "tree": [
                                    {
                                        "tags": ["event", "fall-of-berlin-wall"],
                                        "tree": [
+                                           {
+                                               "tags": ["period", "late-soviet"]
+                                           }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
]
```

`@descend`'s precedence is the same as all of the non-transitive nested operators, being higher than that of `@or` and lower than the transitive nested operators.

<br>

<div id="context-to"/>

### Transitive Nested Operator: `@to` / "`/`"

The `@to` operator has a behavior similar to that of `@child`, where it will return true only for a child of another module, though the ordering from left to right is from parent to child like with `@parent`, and unlike `@child`. That would not be enough reason alone to have a separate operator, however, yet `@to` has an important role by the fact that it is *transitive*, meaning that it both affects a child (as `@child` does), and shifts the context level forward while it's at it (as `@parent` does). In fact, `@to` (or `@toward` below) is a necessity to affect child modules at all, since `@child`/`@descend` only works at the current context level (`@child`/`@descend` without `@to`/`@toward` is just searching for parents of a root module, which always returns false), and `@parent`/`@ascend`, while they do shift the context level, rather end up affecting the parent, or in other words, at the original context. This is why this operator (likely as `/`), or `@toward` (likely as `//`) is so frequently used here.

```
# Before
@new apple;
@new apple;
@in apple @new seed @once;

# After
@in apple / seed @new sprout;
```

```diff
[
    {
        "tree": [
            {
                "tags": ["apple"],
                "tree": [
                    {
                        "tags": ["seed"],
                        "tree": [
+                           {
+                               "tags": ["sprout"]
+                           }
                        ]
                    }
                ]
            },
            {
                "tags": ["apple"]
            }
        ]
    }
]
```

`@to`'s precedence, as a transitive nested operator, has a lower precedence than any of the operators that are not transitive nested operators, and equal precedence with any that are, such as `@toward`.

<br>

<div id="context-toward"/>

### Transitive Nested Operator: `@toward` / "`//`"

The `@toward` operator does not just have an effect on the . `@toward` looks for through all modules at all levels of nesting, and affects those same modules when the right-hand side is true. For obvious reasons, this can be quite powerful, especially if used with a wildcard operand like `@any`. For instance, an expression like "`@any @toward @any`" or "`* // *`" (they are equivalent) affects all modules throughout all levels of nesting, or in other words, every module in the entire database. Thus, it should also be used sparingly, and it usually only makes sense to use something like this where such a large scope is necessary in general (such that something should apply to all modules), or where it makes sense to have homogenous modules that are recursive and indefinitely-nestable within their application as well, as is in the case of many modules used to form graphs.

```
# Before
@new a;
@in a new b closest;
@in a/b @new b middle;
@in a/b/b @new b deepest;

# After
@in a // b @new c;
```

```diff
[
    {
        "tree": [
            {
                "tags": ["a"],
                "tree": [
                    {
                        "tags": ["b", "closest"],
                        "tree": [
                            {
                                "tags": ["b", "middle"],
                                "tree": [
                                    {
                                        "tags": ["b", "deepest"]
                                        "tree": [
+                                           {
+                                               "tags": ["c"]
+                                           }
                                        ]
                                    },
+                                   {
+                                       "tags": ["c"]
+                                   }
                                ]
                            },
+                           {
+                               "tags": ["c"]
+                           }
                        ]
                    }
                ]
            }
        ]
    }
]
```

`@towards`'s precedence, as a transitive nested operator, has a lower precedence than any of the operators that are not transitive nested operators, and equal precedence with any that are, such as `@to`.

<br>

<div id="context-parenth"/>

### Parentheses

Naturally, to control the precedence of different operators in a context expression, the user can include parentheses to either raise or lower the precedence of some operations, and thus affect the final outcome of the expression, in most cases.

```
# Before
@new a b c;
@new a b;
@new a c;
@new a;
@new b c;
@new b;
@new c;
@in a & b | c @new d without-parentheses;

# After
@del a & b | c / d;
@in a & (b | c) @new d with-parentheses;
```

```diff
{
    "tree": [
        {
            "tags": ["a", "b", "c"],
            "tree": [
-               {
-                   "tags": ["d", "without-parentheses"]
-               }
+               {
+                   "tags": ["d", "with-parentheses"]
+               }
            ]
        },
        {
            "tags": ["a", "b"],
            "tree": [
-               {
-                   "tags": ["d", "without-parentheses"]
-               }
+               {
+                   "tags": ["d", "with-parentheses"]
+               }
            ]
        },
        {
            "tags": ["a", "c"],
            "tree": [
+               {
+                   "tags": ["d", "with-parentheses"]
+               }
            ]
        },
        {
            "tags": ["a"]
        },
        {
            "tags": ["b", "c"]
        },
        {
            "tags": ["b"]
        },
        {
            "tags": ["c"],
            "tree": [
-               {
-                   "tags": ["d", "without-parentheses"]
-               }
            ]
        }
    ]
}
```

Note that parentheses can also be used to reverse the transitions created by the transitive nested operators, meaning that in an expression like "`a / b | c`", `c` can only address a module that is a child of `a`, whether the module is tagged `b` or `c`, meaning by default, the context level is raised permanently. However "`(a / b) | c`" encloses the `@to` in parentheses, meaning that the context goes one level back after the closing parentheses such that only `b` is expected as a child of `a`, and `c` is expected back at the root level.

```
# Before
@new a;
@in a @new b;
@in a @new c;
@new c;
@in a / b | c @new d without-parentheses;

# After
@del a / b | c / d;
@in (a / b) | c @new d with-parentheses;
```

```diff
{
    "tree": [
        {
            "tags": ["a"],
            "tree": [
                {
                    "tags": ["b"],
                    "tree": [
-                       {
-                           "tags": ["d", "without-parentheses"]
-                       },
+                       {
+                           "tags": ["d", "with-parentheses"]
+                       }
                    ]
                },
                {
                    "tags": ["c"],
                    "tree": [
-                       {
-                           "tags": ["d", "without-parentheses"]
-                       }
                    ]
                }
            ]
        },
        {
            "tags": ["c"],
            "tree": [
+               {
+                   "tags": ["d", "with-parentheses"]
+               }
            ]
        }
    ]
}
```

<br>

<div id="context-summary"/>

### Summary

| Precedence | Operation | Shorthands | Input | Output | Search Depth (RHS) | Effective Depth |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | (terminal) | N/A | Unary | Logical Conjunction | LHS | LHS
| 0 | `@not` | `!` | Unary | Negation | LHS | LHS
| 1 | `@and` | `&` (whitespace) | Binary | Logical Conjunction | LHS | LHS
| 2 | `@xor` | `^` | Binary | Exclusive Disjunction | LHS | LHS
| 3 | `@or` | `\|` `,` | Binary | Logical Disjunction | LHS | LHS
| 4 | `@parent` | `>` | Binary | Logical Conjunction | LHS + 1 | LHS
| 4 | `@ascend` | `>>` | Binary | Logical Conjunction | LHS + *n* | LHS
| 4 | `@child` | `<` | Binary | Logical Conjunction | LHS - 1 | LHS
| 4 | `@descend` | `<<` | Binary | Logical Conjunction | LHS - *n* | LHS
| 5 | `@to` | `/` | Binary | Logical Conjunction | LHS + 1 | LHS + 1
| 5 | `@toward` | `//` | Binary | Logical Conjunction | LHS + *n* | LHS + *n*

Note: if first in an expression, LHS = 0. Additionally, the LHS, unless both the LHS and the operator are inside parentheses, is relative to the outside of them.

<br>

<div id="syntax"/>

## Statements/Syntax

---

<div id="syntax-intro"/>

### Introduction

Understanding how modules are addressed using context expressions, we now look into what actually composes a statement in the Tridy language, and what it actually means for a statement to "affect" a Tridy module.

Tridy is composed of **clauses**, which are keywords that are used to control the behavior of the Tridy interpreter. Every clause begins with the `@` symbol.

A Tridy statement, *at a minimum*, is composed of one and only ever one operation, as well as a single semicolon at the end of the statement.

In addition, a statement may be composed of **meta-operations**, which happen to control what modules are affected by a statement. As you might imagine, this includes clauses surrounding controlling context, but also some that might go beyond this and have more 'global' implications.

Finally, as with certain operations but not others, the statement might contain a couple of **definition** clauses. Definition clauses are Tridy's way of spelling out the contents of a module, though these are not to be confused with the **raw** clauses that do similarly, but in a Tridy-lite manner.

It's important to note that **order matters** and Tridy is not commutative, at least for the time being. That means that per the order in which this guide is written, most of the clauses follow the given order, and would result in syntax errors if instead given out-of-order. With each of these clauses, their particular ordering should become clear from their explanations, but as an overview, one can refer to the [summary](#syntax-summary).

<br>

<div id="syntax-comments"/>

## Comments

In Tridy, it is possible to provide comments inside of scripts using the hashtag character `#`, which can be placed anywhere at the end of a line, and any text which follows it will be ignored by the Tridy interpreter until the next line.

On the other hand, Tridy does not have a multi-line comment syntax.

<br>

<div id="syntax-clauses"/>

## Clauses

<div id="syntax-tridy"/>

### Definition / Control: `@tridy`

The `@tridy` clause has a unique role to play, considering it is the only clause that can appear more than one place in a Tridy statement, and has a different effect depending on where it is placed.

The first place is at the very beginning of the statement. Placing it at the beginning is to allow the clause to be used like a file signature, so that any files that have it may immediately be recognized as Tridy scripts. It has no effect on the statement itself, being essentially a no-op.

In the second location, it can be placed between the operation clause and the definition clause `@as`. This will make `@as` a requirement for specifying tags, however, the purpose there is only to explicitly exclude the use of raw input clauses like `@json`.

<br>

<div id="syntax-clear"/>

### Control: `@clear`

The `@exit` clause is meant as a control command for the TridyDB interactive terminal, in which the terminal moves the screen down to where the previous output is made invisible.

`@clear` must be given in a statement alone, notwithstanding a `@tridy` signature clause.

<br>

<div id="syntax-exit"/>

### Control: `@exit`

The `@exit` clause is meant as a control command for the TridyDB interactive terminal, causing the interactive terminal to close.

`@exit` must be given in a statement alone, notwithstanding a `@tridy` signature clause.

<br>

<div id="syntax-in"/>

### Meta-Operation: `@in`

`@in` is the clause normally used to read in a context expression for the statement, where its argument would be the context expression itself. This context expression is used to filter out the modules affected by the statements according to what the context expression contains, and to expand out from the root, which is normally the only module affected when a context expression is not present. More of this is explained in detail in the section on context.

Syntactically, `@in` is meant to precede one of the operation clauses, and thus also all other clauses in a statement. However, use of `@in` to provide a context expression is optional for `@get` and `@del`, and only required for `@new` and `@set`. This is because only `@new` and `@set` use the space to the right of them to allow defining module characteristics (via. the definition clauses), while `@get` and `@del` are specific to the current state of the database. Thus, they can be shortcutted by avoiding `@in` and simply giving the context expression after the operation itself (`@in ... @get;` vs. `@get ...;`).

<br>

<div id="syntax-get"/>

### Operation: `@get`

`@get` is a read-only operation that queries the database using a context expression (or none), and returns an array containing the modules that happen to match the query/expression. The reason why an array is returned is that if there happen to be multiple `@get` statements run in a single batch order or script, then the results of all of these get added to the same array.

`@get`'s equivalent in SQL is `SELECT` and in REST architecture is `GET`.

By default, the results of `@get` will be a JSON representation of the database in a condensed form. Specifying `--pretty` as a program argument for TridyDB can at least print an output in a more human-readable form, though this option isn't present when running TribyDB as a REST API (since the presentation, if any, is up to the browser).

`@get` may be used with `@in` to filter output based on a context expression, however, the context expression may also be given after `@get` without the use of `@in`. `@get` takes no definition arguments to its right-hand side.

```
@new a;
@new a;
@in a @new b;
@get;
@get a/b;

# Verbatim output shown below
```

```json
[
    {
        "tree": [
            {
                "tags": ["a"],
                "tree": [
                    {
                        "tags": ["b"]
                    }
                ]
            },
            {
                "tags": ["a"],
                "tree": [
                    {
                        "tags": ["b"]
                    }
                ]
            }
        ]
    },
    {
        "tags": ["b"]
    },
    {
        "tags": ["b"]
    }
]
```

<br>

<div id="syntax-new"/>

### Operation: `@new`

`@new` is the main operation used with Tridy, as without it, Tridy modules would not be composable to begin with. `@new` creates a new module where the definition clauses on its right-hand side are taken in as arguments (including the "raw" input clauses), and then copies this module to the tree data structure of all modules where the subsequent context expression given through `@in` becomes true. If there is no `@in`, it is placed only at the root module. Thus, a module created through `@new` becomes a sub-module of the context to which it is provided. Using `@new` is never an idempotent operation.

`@new`'s equivalent in SQL is `CREATE`/`INSERT` and in REST architecture is `POST`.

```
# Before
@new a;

# After
@in a @new b;
```

```diff
{
    "tree": [
        {
            "tags": ["a"],
            "tree": [
+               {
+                   "tags": ["b"]
+               }
            ]
        }
    ]
}
```

<br>

<div id="syntax-set"/>

### Operation: `@set`

`@set` is an operation that is intended to apply changes to an existing module, and as the same module which is matched through `@in` as a context expression. `@set` creates a new module where the definition clauses on its right-hand side are taken in as arguments (including the "raw" input clauses), and then overwrites all modules where the subsequent context expression given through `@in` becomes true. If there is no `@in`, then the root module is altered (in effect overwriting the entire database). Using `@set` is sometimes an idempotent operation.

Note that this command is generally not recommended for normal use, and Tridy scripts can be designed without ever needing to use `@set`. The main reason why this isn't recommended is because it is nearly equivalent to deleting a module and then placing a new one in the same spot or order that the deleted one was in before, making it particularly dangerous as with `@del`. However, also as a result of this, `@set` generally makes the most sense when used in combination with `@get` to acquire the original module and replace it's elements and/or apply soft operations defined by the application such that this operation is usable in such a way that isn't completely destructive.

`@set`'s equivalent in SQL is `ALTER`/`UPDATE` and in REST architecture is `PUT`.

```
# Before
@new a;
@in a @new b;

# After
@in a @set b;
```

```diff
{
    "tree": [
        {
-           "tags": ["a"],
-           "tree": [
-               {
-                   "tags": ["b"]
-               }
-           ]
+           "tags" ["b"]
        }
    ]
}
```

<br>

<div id="syntax-del"/>

### Operation: `@del`

`@del`, as its namesake probably suggests, is Tridy's way of deleting modules. This will match a context expression to an existing module, and then delete that same module. In effect, the module is removed from the tree of its parent module, and if there are no modules left in the tree data structure afterwards, so is the tree itself deleted. If no context expression is given, then the root module (aka. the database) is deleted.

The operation is not completely permanent, though, since modules can always be re-populated with the same modules they were given originally so long as the Tridy statements that led to them are re-given in the same order. Even if the tree data structure of a module or the root module itself is deleted, these are regenerated automatically (albeit as stubs, and not as what was deleted) whenever new statements that would affect them are applied after `@del` is given.

`@del`'s equivalent in SQL is `DROP`/`DELETE` and in REST architecture is `DELETE`.

`@del` may be used with `@in` to filter output based on a context expression, however, the context expression may also be given after `@del` without the use of `@in`. `@del` takes no definition arguments to its right-hand side.

```
# Before
@new a;
@in a @new b;

# After
@in a/b @del;
```

```diff
{
    "tree": [
        {
            "tags": ["a"],
            "tree": [
-               {
-                   "tags": ["b"]
-               }
            ]
        }
    ]
}
```

<br>

<div id="syntax-as"/>

### Definition: `@as`

`@as` is one of few clauses in Tridy that are totally unnecessary to give, but exist as a convenience to the user simply as a way to be explicit. The right-hand side of `@as` is used to provide tags used in defining a new module with `@new`, or re-defining an existing module with `@set`. `@as` is meant to come after the operation, but before `@is` or `@has`. Normally, tags are be given to the right-hand side of the operation even without the use of `@as`, hence why it is usually unnecessary.

```
@new @as a b c;
```

```json
{
    "tree": [
        {
            "tags": ["a", "b", "c"]
        }
    ]
}
```

<br>

<div id="syntax-uuid"/>

### Definition Operand: `@uuid`

The `@uuid` clause is used in place of a tag right of `@as`, `@new`, or `@set`, and displays a unique behavior whereby in its place, a UUIDv4 string (as a tag) is generated. The UUID provides the module with a way to be identifiable by a totally-unique tag/identifier, and importantly, the UUID generation happens *after* the module is copied and placed, meaning that every copy of the module, if there are any, even get a completely-separate UUID of their own such that two or more modules placed from a single statement while having this clause are never identical.

As a disadvantage of this, though, the UUID would not be known beforehand, making it necessary to `@get` the results of these statements afterwards in order to read and use the unique identifier in further Tridy statements, which wouldn't be possible in a Tridy script alone.

```
# After
@new a;
@new a;

# After
@in a @new @uuid;
```

```diff
{
    "tree": [
        {
            "tags": ["a"],
            "tree": [
+               {
+                   "tags": ["2c483f4f-04da-42a7-9dfb-a25e614f190b"]
+               }
            ]
        },
        {
            "tags": ["a"],
            "tree": [
+               {
+                   "tags": ["ee45339a-4d3c-4e27-80d8-76ea422cf8a7"]
+               }
            ]
        }
    ]
}
```

<br>

<div id="syntax-is"/>

### Definition: `@is`

`@is` is used as a way to detail the contents of the free data structure, a subsection of each module that is allowed to have free or unrestricted contents. This lack of restriction means that, though the use of raw input is optional for giving the full definition of a module otherwise, it is required with `@is` since common, established data formats are better for the purpose of complex data not following the Tridy module paradigm.

Following `@is`, the user would specify a format clause, most commonly `@json`, and type in the full value of the free data structure using whatever format they gave. Once they give the format tag, their input is no longer validated according to Tridy rules, and instead becomes validated according to the format of their choosing. That is, until `@end` is given, which closes the formatted input and returns to Tridy mode. The backslash character (`\`) can be used as an escape meanwhile, which is needed especially in order to interpret `@` or `#` literally.

`@is` along with its formatted argument is meant to be specified after `@as` if given, but before `@has`.

```
@new file fsobj @is @json {
    "handle": "file",
    "path": "/usr/bin/node",
    "properties": {
        "type": "binary",
        "date": {
            "modified": "10/26/2021 11:46 AM"
        }
    }
} @end;
```

```json
{
    "tree": [
        {
            "tags": ["file", "fsobj"],
            "free": {
                "handle": "file",
                "path": "/usr/bin/node",
                "properties": {
                    "type": "binary",
                    "date": {
                        "modified": "10/26/2021 11:46 AM"
                    }
                }
            }
        }
    ]
}
```

<br>

<div id="syntax-json"/>

### Raw Definition: `@json`

The `@json` clause is used as a starting delimiter for JSON-formatted input wherever it is acceptable to provide raw input inside of a Tridy statement. When the `@json` clause is given, the input is no longer validated according to Tridy rules, and instead becomes validated as a JSON object. That is, until `@end` is given, which closes the formatted input and returns to Tridy mode. The backslash character (`\`) can be used as an escape meanwhile, which is needed especially in order to interpret `@` or `#` literally.

```
# Before
@new a;

# After
@in a @new @json {
    "string": "This is a string.",
    "number": 10,
    "boolean": true,
    "array": ["apples", "oranges"],
    "map": {
        "a": "b",
        "c": "d",
        "nested": {
            "e": "f",
            "g": "h"
        }
    }
} @end;
```

```diff
{
    "tree": [
        {
            "tags": ["a"],
            "tree": [
+               {
+                   "string": "This is a string.",
+                   "number": 10,
+                   "boolean": true,
+                   "array": ["apples", "oranges"],
+                   "map": {
+                       "a": "b",
+                       "c": "d",
+                       "nested": {
+                           "e": "f",
+                           "g": "h"
+                       }
+                   }
+               }
            ]
        }
    ]
}
```

For obvious reasons that it bypasses Tridy's requirements for modules, using this or other raw definition tags is recommended against under normal circumstances where the module definition is not enforced by the application interfacing with Tridy.

<br>

<div id="syntax-yaml"/>

### Raw Definition: `@yaml`

The `@yaml` clause is used as a starting delimiter for YAML-formatted input wherever it is acceptable to provide raw input inside of a Tridy statement. When the `@json` clause is given, the input is no longer validated according to Tridy rules, and instead becomes validated as a YAML object. That is, until `@end` is given, which closes the formatted input and returns to Tridy mode. The backslash character (`\`) can be used as an escape meanwhile, which is needed especially in order to interpret `@` or `#` literally.

YAML, unlike JSON, is sensitive to whitespace. However, the rules as with YAML raw input are no different than with YAML input on its own in other circumstances, so as long as identation is consistent without the use of tab characters, then the input should run through the interpreter successfully. 

```
# Before
@new a;

# After
@in a @new @yaml
    ---
    string: This is a string.
    number: 10
    boolean: true
    array:
      - apples
      - oranges
    map:
        a: b
        c: d
        nested:
            e: f
            g: h
@end;
```

```diff
{
    "tree": [
        {
            "tags": ["a"],
            "tree": [
+               {
+                   "string": "This is a string.",
+                   "number": 10,
+                   "boolean": true,
+                   "array": ["apples", "oranges"],
+                   "map": {
+                       "a": "b",
+                       "c": "d",
+                       "nested": {
+                           "e": "f",
+                           "g": "h"
+                       }
+                   }
+               }
            ]
        }
    ]
}
```

For obvious reasons that it bypasses Tridy's requirements for modules, using this or other raw definition tags is recommended against under normal circumstances where the module definition is not enforced by the application interfacing with Tridy.

<br>

<div id="syntax-end"/>

### Raw Definition: `@end`

The `@end` clause is used as an ending delimiter for raw input clauses like `@json` and `@yaml`. Whereby these would pass control over parsing the input to their respective interpreter, `@end` closes this input and passes control back to the Tridy interpreter.

`@end` always appears at the end of a raw input string, as it is required for the Tridy statement to be completed with a Tridy-parsed semicolon in any case. The raw input string enclosed by the beginning delimiter and `@end` can be one to several lines long if need be, where line feed characters will either be trimmed out or kept in accordance with the format used.

<br>

<div id="syntax-has"/>

### Definition: `@has`

`@has` is another way to nest modules inside of other modules. The main purpose of `@has` is to set the initial tree data structure of the module, which are defined in the format of recursively-nested Tridy statements. Of note is that every `@has` requires a following opening bracket (`{`) at the beginning and a closing bracket (`}`) at the end of the nested statements.

As another important aspect of `@has`, the nested Tridy statements provided using it are created *prior* to the (top) module's duplication and placement. What this means, inevitably, is that statements provided through `@has` exhibit a unique property whereby they are **context-locked**, meaning that context expressions inside of these nested statements have no view of the database outside the modules until the full, unnested statement has already been executed, and yet, nested statements are executed prior to their parent statement being executed.

Thus, relative to a nested statement, the module represented by the parent statement is the root module, and context operators like `@child` and `@descend` have no ability to extend outside of it (nor would any context operation). The function of this is similar to a `chroot` directive that is found in many Unix-based systems, and which is most often used to provide security by completely restricting access outside of the directory masquerading as a root. Likewise, it can do the same here around context, providing a limited scope in which any number of Tridy statements can exist without affecting the wider database.

`@has` along with its bracketed statements is meant to be specified after `@is` if given, but before `@once` or `@many`.

```
@new orchard @has {
    @new apple @has {
        @new seed;
    };
    @new apple;
    @in apple @new seed;
};
```

```json
{
    "tree": [
        {
            "tags": ["orchard"],
            "tree": [
                {
                    "tags": ["apple"],
                    "tree": [
                        {
                            "tags": ["seed"]
                        },
                        {
                            "tags": ["seed"]
                        }
                    ]
                },
                {
                    "tags": ["apple"],
                    "tree": [
                        {
                            "tags": ["seed"]
                        }
                    ]
                }
            ]
        }
    ]
}
```

<br>

<div id="syntax-none"/>

### Definition Operand: `@none`

`@none` is used as a definition placeholder for all of the Tridy (non-raw) definition clauses where the clause's respective affected section is empty or unincluded, for instance, in the form "`@as @none`", "`@is @none`", or "`@has @none`". Once again, the purpose of using this is simply as an explicit way of stating the absence of either of these elements when simply leaving the clauses out fully would have the same effect. Likewise, it has no effect on the statement over this alternative.

```
# After
@new @as @none @is @none @has @none;
```

```diff
{
    "tree": [
+       { }
    ]
}
```

<br>

<div id="syntax-once"/>

### Meta-Operation: `@once`

`@once` is a special parameter that is used to make a Tridy statement (and in fact, any Tridy statement regardless of operation) "greedy". Effectively, a greedy Tridy statement is one which is limited to affecting a single module, whereby it will stop searching for new modules once at least one module returns true according to the context expression. This means it will not only retract from searching through sub-modules, but through co-modules as well, meaning modules in the same tree of a parent module that each may or may not have a matching context as well. It is not possible otherwise to ignore co-modules.

There is a particular use case for this, namely where context expressions are addressing a module which is unique, perhaps because it has a unique identifier or tag, and it is known beforehand to be as such. Using this in such a way would at least have the effect of speeding up such statements since the composer does needlessly search further after the point the uniquely-matching module is found.

`@once` is meant to be specified last in a Tridy statement, after the definition clauses, and cannot be used together with `@many`.

```
# Before
@new a;
@new a;
@new a;

# After
@in a @new b @once;
```

```diff
{
    "tree": [
        {
            "tags": ["a"],
            "tree": [
+               {
+                   "tags": ["b"],
+               }
            ]
        },
        {
            "tags": ["a"]
        },
        {
            "tags": ["a"]
        }
    ]
}
```

<br>

<div id="syntax-many"/>

### Meta-Operation: `@many`

As an alternative to `@once`, `@many` is an explicit way to specify the default behavior Tridy exhibits when selecting modules, which is to test all existing modules where a context expression evaluates as true and apply an operation therein. It is not necessary to include.

`@many` is meant to be specified last in a Tridy statement, after the definition clauses, and cannot be used together with `@once`.

```
# Before
@new a;
@new a;
@new a;

# After
@in a @new b @many;
```

```diff
{
    "tree": [
        {
            "tags": ["a"],
            "tree": [
+               {
+                   "tags": ["b"],
+               }
            ]
        },
        {
            "tags": ["a"],
            "tree": [
+               {
+                   "tags": ["b"],
+               }
            ]
        },
        {
            "tags": ["a"],
            "tree": [
+               {
+                   "tags": ["b"],
+               }
            ]
        }
    ]
}
```

<br>

<div id="syntax-summary"/>

### Summary

The syntax rules are detailed below using Microsoft's command line syntax:

```
[@tridy]
{
    {
        {
            {@get | @del} [<context expression>]
        |
            @in <context expression>
            {@get | @del}
        }
    |
        [@in <context expression>]
        {@new | @set}
        {
            <@json <json> | @yaml <yaml>> @end
        |
            {
                @tridy
                @as {<tags> | @none}
            |
                [@as] {<tags> | @none}
            }
            [@is {<{@json <json> | @yaml <yaml>} @end> | @none}]
            [@has {\{ <tridy statements> \} | @none}]
        }
    }
    [{@once | @many}]
|
    @clear
|
    @exit
}
;
```

<br>

<div id="glossary"/>

## Glossary

---

### **Ascendant Module**
The module in which another module (the subject) is nested under, either in which the subject module is a direct child of the ascendant, or that is recursively a child of the ascendant.

### **Child Module**
A module which is placed or located in the tree data structure of another module (the subject). In other words, that is "nested" under another module (the subject).

### **Clause**
Any word beginning with an `@` symbol in a Tridy statement; used as keywords to direct the behavior and syntax of the Tridy language.

### **Comment**
Strings starting with `#` and ending with a line feed, which are entirely ignored by the Tridy interpreter, and can be used for providing developer commentary.

### **Context**:
The context of a module is a module's tagset, along with the tagset of all its ascendants in the order in which they are nested (from the root downward), acting as a location specifier for the module which the Tridy composer uses to evaluate against context expressions.

### **Context Expression**:
A boolean-style expression that, when placed inside of a Tridy statement, uses context terminals and operators to determine whether a module should be affected or not by a statement, i.e. by evaluating the expression against the module's context.

### **Context-Locking**:
A property specific to the `@has` definition clause whereby a statement nested under another statement via. this clause is prevented from having access outside the module created by the statement it is nested under, since it is seen by the nested statement as the root module.

### **Context Operand**:
A context terminal or sub-expression.

### **Context Operator**:
A boolean operation that is evaluated against one or more context operands, either being based on a common boolean operator like NOT or AND, or being used to control the flow of the expression with respect to Tridy's nested architecture and a module's multiple possible ascendants within its context.

### **Context Terminal**:
Either a tag that is expected to be found in a module's context, or a context wildcard.

### **Context Wildcard**:
A special context operand that evaluates as true for reasons other than being a tag present in a module's context, either arbitrarily or over additional, specific properties present in a module.

### **Control Clause**:
A clause used only to control how TridyDB behaves depending on the manner in which it is used, and that does not have any particular effect on Tridy's interpretation engine.

### **Database**:
see "**Root Module**".

### **Definition Clause**:
A clause used to define one of the major characteristic sections of a module in relation to the module's contents.

### **Descendant Module**:
The module which is nested under another module (the subject), either in which the subject module is a direct parent of the descendant, or that is recursively a parent of the descendant.

### **Free Data Structure**:
A module section for storing information about the module that is organized arbitrarily, usually for use in an application-specific context, and that is always provided as raw input.

### **Meta-Operation Clause**:
A clause controlling the behavior of the Tridy composer with respect to which modules a statement ends up being applied to.

### **Module**:
A self-contained unit of information that is individually-addressable by the Tridy composer, and organized in Tridy's particular format consisting of three sections: a tagset, a free data structure, and a tree data structure.

### **Operation Clause**:
A clause which determines the type of action taken by a Tridy statement towards a module when that module is identified with a context matching a particular context expression.

### **Parent Module**:
A module in which another module (the subject) is placed or located in the tree data structure of. In other words, that is "nesting" another module (the subject).

### **Raw Definition Clause**:
A clause used as control flow for passing raw input through the Tridy interpreter.

### **Raw Input**:
A string of data that is passed through the Tridy interpreter in a common, established data format that doesn't include Tridy itself, namely JSON and/or YAML.

### **Root Module**:
The module in which all other modules are nested under, that is not nested under any other modules itself, and that is addressed whenever a context expression is not provided in a statement.

### **Statement**:
A string of Tridy code that is "complete" (according to the Tridy interpreter), part of which means being ended with a semicolon, and that can be interpreted individually separate from other statements.

### **Tag**:
An unique or non-unique alphanumeric identifier that is used to identify a module, and form a part of its tagset/context.

### **Tagset**:
The array/list of tags that a particular module has, not including the tags of modules that are nested under it, and of which all tags are unique within this same array.

### **Tree Data Structure**:
A particular array that is sometimes present in modules as the place in which other modules nested under the given module are contained.

### **Tridy**:
A "data programming" language with a syntax designed for creating modules of data that can be copied and composed in various ways using boolean expressions without necessitating re-definition of the same data.

### **Tridy Composer**:
A sub-component of the Tridy interpreter that is tasked specifically with evaluating context expressions against the contexts of different modules, and then executing specific operations of the interpreted statement on the modules that are matched by the context expression.

### **Tridy Interpreter**:
A sub-component of TridyDB that is tasked with reading in Tridy statements and performing the correct actions that those statements describe in accordance with the Tridy language specifications.

### **TridyDB**:
A middleware application consisting of an object storage engine (the database), a Tridy interpreter that reads and processes statements written in the Tridy language against the database, and presents the affected object or sub-objects as output, thus providing both the database and the main interface for it.

### **Variable**:
Special tags or parts of tags starting with `$` that are used to associate the tag as a key to a corresponding value that be called by this key to result in the value of the key being placed with the final output.
