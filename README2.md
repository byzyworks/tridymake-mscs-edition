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

As seen later, Wingspan Habitat uses the third method of interaction, though in a local manner (so TridyDB can be utilized as a server, still).

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

<br>

### Empty Expressions

Tridy allows users to forego giving context expressions at all, either by leaving out `@in`, or at least in the case of the affective operations `@get` and `@del`, proceeding it without a context expression. In other words, the following examples are all statements with empty expressions:

```
@get;
@set @json { "free": { "root": true } } @end;
@new @is @json { "child": "true" } @end;
@del;
```

If an expression is not given, then the operation is applied to the root/top-level module, whereby only it is affected.

<br>

### Operand: Tags

In Tridy, tags are the alphanumeric identifiers used to identify a module. More specifically a tag is always a string composed of either lowercase letters, uppercase letter, numbers, dashes, or underscores, and are case sensitive. However, a tag can also contain variable identifiers that begin with `$` and are enclosed with zero to one pairs of brackets to allow nesting, and which TridyDB automatically enforces the closure of. However, during composition, variables are treated the same as other tags.

Examples of (single) tag expressions include:

```
@get abc;
@get X-Y-Z_123;
@get $d;
@get ${e${f}};
```

A stated previously, an individual tag evaluates to true if a module contains the same tag that a context expression expects, so long as it is at the nesting level expected, which can be controlled by the nested operators below. Otherwise, the tags are evaluated at the level of the root/top-level module.

Per why they're called tags, TribyDB places no restrictions on uniqueness or how many tags a module can have, and a module may even contain no tags at all where only wildcard operands can affect it. The only thing TridyDB does restrict are duplicate tags in the same module, but this is simply because including them multiple times in the same module has no effective purpose, and it's better to enforce this as a rule for best practice reasons.

<br>

### Wildcard Operand: `@any` / "`*`"

The `@any` operand is used in a way that is analogous to a tautology in the Tridy language, meaning when `@any` is used, all sub-modules of a module are matched, though notably, this still applies only at the current nesting level unless a transitory nested operator is used with it. Combining this with `@toall` (as itself is explained below) will do the job of matching all modules at all levels.

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

### Wildcard Operand: `@leaf` / "`%`"

The `@leaf` operand applies if and only if the module being evaluated is a leaf, meaning that it contains no sub-modules of its own. In more detail, that either it has no nested tree data structure, or this structure is as an empty array. As is typical, the free data structure is not evaluated when making this decision.

<br>

### Wildcard Operand: `@random` / "`?`"

The `@random` operand forms one of the few non-deterministic operands included with the Tridy language. This operand effectively operates like a coin flip, where it has a 50% chance of evaluating to true, and a 50% chance of evaluating to false. The chances of the operand coming out as either can be raised or lowered by chaining multiple `@random` clauses together with either `@and` or `@or` (for instance, as `? & ?` or `? | ?`), respectively. That is, following statistic reasoning, the probability of success, and therefore, a module being affected, can then be controlled like that of a binomial distribution, allowing for a lot of interesting combinations of modules to be created.

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

If not including parantheses, `@not` has the greatest precedence out of all the operators given.

<br>

### Basic Operator: `@and` / "`&`" / " "

The `@and` operator evaluates as true if and only if the operands on both sides of the operator are true. Otherwise, it evaluates as false. This can be used if you wish only for a module that has two or more particular tags at the same time to be affected.

Worth noting is that `@and` is also considered as the "implicit" operation, meaning that if two tags are separated only by whitespace characters without an explicit operator, such as `@in a b`, then this has the exact same effect as `@in a & b`.

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

`@and`'s precedence is between that of `@not` and `@xor`.

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

`@xor`'s precedence is between that of `@and` and `@or`.

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

`@or`'s precedence is between that of `@xor` and `@parent`.

<br>

### Non-Transitory Nested Operator: `@parent` / "`<`"

The `@parent` operator returns true only if the right side of the operator is true for a child of a module for which the left side of the operator is true. For instance, in the case where a module tagged as `apple` has one or more sub-modules with the `seed` tag, then the expression `apple < seed` will only apply to those `apple` modules that have at least one of these sub-modules tagged with `seed`.

```
# Before
@new apple;
@new apple;
@in apple @new seed @once;

# After
@in apple < seed @new reproductive;
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

`@parent`'s precedence is between that of `@or` and `@ascend`.

<br>

### Non-Transitory Nested Operator: `@ascend` / "`<<`"

The `@ascend` operator extends `@parent` to recursively look for sub-modules where the right side of the expression is true, such if you had the expression `orchard << seed` instead, then any `orchard` modules would be affected so long as they had modules tagged `seed` anywhere in its subtree, even if not directly under the affected module. Effectively, this would be same as indiscriminately looping `@parent` over and over again as `orchard < * < seed`, `orchard < * < * < seed`, and so forth until the deepest level of nesting is reached for a `seed` module.

```
# Before
@new orchard;
@new orchard;
@in orchard new apple;
@in orchard/apple @new seed @once;

# After
@in orchard << seed @new regrowable;
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

`@parent`'s precedence is between that of `@parent` and `@to`.

<br>

### Transitory Nested Operator: `@to` / "`/`" / "`>`"

The `@to` operator has a behavior similar to that of `@parent`, where it will return true if and only if the right-side of the operator is true for a child of a module where the left side is true. The difference here is in which of the modules is affected. `@parent` affects the parent module, as it predicates a relationship in which the parent is the subject (the parent module "parents" the child module). However, `@to` affects the child module, and in fact, it affects all child modules of the parent where the right side is true. `@to` is how one might normally go about traversing the module tree at depths greater than the root such that in order to recursively nest structures within each other requires some knowledge of this operator.

```
# Before
@new apple;
@new apple;
@in apple @new seed @once;

# After
@in apple > seed @new sprout;
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

`@to`'s precedence is between that of `@ascend` and `@toward`.

<br>

### Transitory Nested Operator: `@tofirst` / "`>>`"

The `@tofirst` operator, as you might be able to guess, is an upgraded version of `@to` that removes many of the same limitations as `@ascend` does for `@parent`. Unlike `@to`, `@tofirst` is not confined to a single level of nesting with respect to the left-hand side, and will seek out the closest module in accordance with the right-hand side with respect to its depth. At this point, if there are modules nested deeper where the right-hand side is true, then these modules end up being ignored.

```
# Before
@new a;
@in a new b closest;
@in a/b @new b middle;
@in a/b/b @new b deepest;

# After
@in a >> b @new c;
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
                                    }
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

`@tofirst`'s precedence is between that of `@to` and `@toall`.

Since the variability of behaviors with respect to a module's children is considerably greater than with respect to the parent, due to the fact that similar modules can be nested inside each other, the transitory nested operators do not stop here.

<br>

### Transitory Nested Operator: `@toall` / "`>>>`"

The `@toall` operator, unlike `@tofirst`, does not stop at the first module that it finds where the right-hand side is true. `@toall` looks for through all modules at all levels of nesting. For obvious reasons, this can be quite powerful, especially if used with a wildcard operand like `@any`. For instance, an expression like `@any @toall @any` or `* >>> *` (they are equivalent) affects all modules throughout all levels of nesting, or in other words, every module in the entire database. Thus, it should also be used sparingly, and it usually only makes sense to use something like this where such a large scope is necessary in general (such that something should apply to all modules), or where it makes sense to have homogenous modules that are recursive and indefinitely-nestable within their application as well, as is in the case of many modules used to form graphs.

```
# Before
@new a;
@in a new b closest;
@in a/b @new b middle;
@in a/b/b @new b deepest;

# After
@in a >>> b @new c;
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

`@toall`'s precedence is between that of `@tofirst` and `@tolast`.

<br>

### Transitory Nested Operator: `@tolast` / "`>>>>`"

The `@tolast` operator, given the behavior of the last two operators, does as you'd expect, effectively only selecting the deepest modules in the tree data structure where the right-hand side of the operator is true, and ignoring the rest. Much like `@xor`, and unlike the other transitory operators, this operator is actually a shorthand, where the expression `a >>>> b` is equivalent to `a >>> b & !(b << b)`.

```
# Before
@new a;
@in a new b closest;
@in a/b @new b middle;
@in a/b/b @new b deepest;

# After
@in a >>>> b @new c;
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

`@tolast`'s precedence is lower than that of `@toall`, and also the lowest out of any of the operators.

<br>

### Parentheses

Naturally, to control the precedence of different operators in a context expression, the user can include parentheses to either raise or lower the precedence of some operations, and thus affect the final outcome of the expression, in most cases.

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

### Meta-Operation: `@once`

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

### `@none`

### `@uuid`

### `@exit`

## Glossary