# Tridy

## Introduction

Tridy (pronounced "tree-dee") was formed as a response to common generalized data storage formats such as XML, JSON, or YAML that normally represent data 'as-is', meaning where an object (as a subcollection of data) is to be represented multiple times, it must also exist and be copied to the same number of locations. This is likely to create considerable redundancy, and while Tridy does not do away with it from the back-end (nor is it supposed to), it can at least do away with it from the front.

Notably, it is not intended to be as a replacement for SQL or even NoSQL as a general data storage solution, as while Tridy may solve some redundancies, it is not designed to be efficient. This is considering that it deals directly with, if not expects nested data, and still in the end would cause this data to being duplicated, which is wildly storage-inefficient if we compare this to referencing. That, of course, isn't mentioning the tons of other optimizations that so far exist in other SQL and NoSQL database systems.

As for what it *is* for, Tridy is designed to be a lightweight tool for lightweight, though-slightly-more-heavyweight-than-usual configuration data (usually because of redundancies), and that is organized in a tree or graph-like structure. This data is expected to be processed into a readable output that other applications are meant to interact with directly or, if needed, through a Tridy interface. It is extremely modular in the sense that (non-nested) data is never coupled together, as also an upside to the at-least redundant output. Without that, is is also ideal for creating DAG structures, given that, at the storage level at least, no referencing means no circular references either. Finally, as it creates and stores data in the form of a tree, it is also at a natural advantage when it comes to integrating with a filesystem, and is easily able to input and output to one.

To summarize, Tridy's aim is viewable, portable, modular, and acceptably-redundant data defined in an irredundant format.

<br>

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

### Format

<!-- Note about XML: not yet. -->

TridyDB supports importing JSON-formatted as well as YAML-formatted data. As output, export to JSON and XML is supported.

<br>

### Schemas

TridyDB does not support the use of or creation or validation of schemas at this point in time.

<br>

### Security

As far as security goes, it is not recommended to use TridyDB except locally right now. While a user system is planned for the future, and TridyDB's nested architecture and context system are ripe for having granularized access controls, TridyDB is currently single-user. In addition, the web-based API shouldn't be used in a secure context either, since it is at risk for command injection in the same manner that SQL or other database engines are. In addition, this port should *never* be opened to the internet for the same reason that you shouldn't open MySQL port 3306 to the internet, even once a user system is built-in. To that end, any accesses to TridyDB should be regulated through another application stacked between the user and the database.

<br>

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

## Modules

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

## Context

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

### Wildcard Operand: `@random` / "`?`"

The `@random` operand forms one of the few non-deterministic operands included with the Tridy language. This operand effectively operates like a coin flip, where it has a 50% chance of evaluating to true, and a 50% chance of evaluating to false. The chances of the operand coming out as either can be raised or lowered by chaining multiple `@random` clauses together with either `@and` or `@or` (for instance, as "`? & ?`" or "`? | ?`"), respectively. That is, following statistic reasoning, the probability of success, and therefore, a module being affected, can then be controlled like that of a binomial distribution, allowing for a lot of interesting combinations of modules to be created.

<br>

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

## Statements/Syntax

### Introduction

Understanding how modules are addressed using context expressions, we now look into what actually composes a statement in the Tridy language, and what it actually means for a statement to "affect" a Tridy module.

A Tridy statement, *at a minimum*, is composed of one and only ever one operation, as well as a single semicolon at the end of the statement.

In addition, a statement may be composed of **meta-operations**, which happen to control what modules are affected by a statement. As you might imagine, this includes clauses surrounding controlling context, but also some that might go beyond this and have more 'global' implications.

Finally, as with certain operations but not others, the statement might contain a couple of **definition** clauses. Definition clauses are Tridy's way of spelling out the contents of a module, though these are not to be confused with the **raw** clauses that do similarly, but in a Tridy-lite manner.

It's important to note that **order matters** and Tridy is not commutative, at least for the time being. That means that per the order in which this guide is written, most of the clauses follow the given order, and would result in syntax errors if instead given out-of-order. With each of these clauses, their particular ordering should become clear from their explanations, but as an overview, the syntax rules are detailed below using Microsoft's command line syntax:

```
[@tridy] 
[{@clear | @exit}]
[@in <context expression>]
{
    {@get | @del} [<context expression>]
|
    {@new | @set}
    {
        <@json <json> | @yaml <yaml>> @end
    |
        [@as {<tags> | @none}]
        [@is {<{@json <json> | @yaml <yaml>} @end> | @none}]
        [@has {\{ <tridy statements> \} | @none}]
    }
}
[{@once | @many}]
;
```

<br>

### Meta-Operation: `@in`

`@in` is the clause normally used to read in a context expression for the statement

<br>

### Operation: `@get`

PLACEHOLDER

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

### Operation: `@new`

PLACEHOLDER

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

### Operation: `@set`

PLACEHOLDER

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

### Operation: `@del`

PLACEHOLDER

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

### Definition: `@as`

PLACEHOLDER

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

### Definition: `@is`

PLACEHOLDER

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

### Definition: `@has`

PLACEHOLDER

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

### Meta-Operation: `@once`

PLACEHOLDER

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

### Meta-Operation: `@many`

PLACEHOLDER

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

## Special Clauses

### Raw: `@json`

PLACEHOLDER

<br>

### Raw: `@yaml`

PLACEHOLDER

<br>

### Raw: `@end`

PLACEHOLDER

<br>

### Definition: `@none`

PLACEHOLDER

<br>

### Definition: `@uuid`

PLACEHOLDER

<br>

### Control: `@tridy`

PLACEHOLDER

<br>

### Control: `@clear`

PLACEHOLDER

<br>

### Control: `@exit`

PLACEHOLDER

<br>

## Comments

AAA

<br>

## Glossary

AAA
