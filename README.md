# Habitat Virtual Machine Definition Language (HVMDL)

**HVMDL** (shortened as VMDL) is a special SQL-like programming language developed for Wingspan Habitat meant to ease a lot of data manipulation headaches. Per the name, it is designed expressly as a means to define virtual machines, however, here the term "virtual machine" is applied pretty loosely. In this context, a **virtual machine** (called an HVM, or just a "machine") comprises a memory and a single instruction stack, which in turn is comprised of other HVMs. These are both alegorically referred to as the **heap** and the **stack** respectively, due to the way that each of these are treated in relation to modern computers. Another way of seeing it is that the heap is comprised of random-access *states* and the stack is comprised of ordered *transactions* (a state transition table, in other words) that might affect those states, which is yet another way that a virtual machine can be defined here.

It should be noted that, despite the name, the "stack" is technically meant to be implemented as FIFO, and thus, as a queue. However, this distinction is not enforced using the data storage format alone.

Together, these are paired with a single **operating system**, which again is not one in the traditional sense, but is used as a useful metaphor. The "operating system" is a single handler that makes use of the data contained in the heap as well as in the stack, much like a real operating system is needed to control the behavior of code and its ability to send to and receive from memory.

An HVM, if exported to a JSON format, would thus resemble the following:

```
{
    "sys": "osName",
    "heap": {
        "state1": "state1Value",
        ...
    },
    "stack": [
        {
            "sys": "osName",
            "heap": {
                "state1": "state1Value",
                ...
            },
            "stack": [
                ...
            ]
        },
        ...
    ]
}
```

However, at a minimum, an HVM only needs to consist of an operating system.

```
{
    "sys": "osName"
}
```

Therein lies another important fact about HVMs, or machines. An HVM is not necessarily a function or a class in the object-oriented sense, and a machine can be a simple instructional function just as much as it can be a complex data structure, and this can only be defined according to the application.

The framework that a VMDL-enabled application operates around expects that the program's execution is managed by the HVM operating system, where the exact specifics of how are managed by the application it refers to. At its core, the only reason for the separation between the stack and the heap is to contain ordered, uncategorized data and categorized, unordered data, respectively. Since the former usually only makes sense with storing procedures executed in order, the use of the stack means that parallels can be drawn between these objects and machines due to the assembly-like way that the stack can be utilized, whereby the way the heap promotes random access by using an associative rather than an indexed array makes it something like main memory when contrasted with CPU registers.

However, it isn't enforced to use the heap or the stack in such a way. It would be possible to store the entire stack inside the heap, or vice versa, and in fact, Wingspan Habitat does both. It's also not forbidden to perform random access of the stack, and in fact, it can be used to implement low-level-styled branches, loops, or named functions using this methodology. However, doing things in the manner of division into a stack and a heap is so that a VMDL interpreter can utilize and standardize the advantages of both, where changes to the heap *can* be idempotent and changes to the stack are never idempotent.

Before going into the specifics of HVMDL, however, it's worth showing where the format above is to become an issue since it is not technically HVMDL, but an example of its output in a JSON format. Take a simple example such as the one below.

```
{
    "sys": "habitat",
    "stack": [
        {
            "sys": "module",
            "heap": {
                "name": "Module 1"
            },
            "stack": [
                {
                    "sys": "docker",
                    "heap": {
                        "name": "Common Docker Container"
                    }
                }
            ]
        },
        {
            "sys": "module",
            "heap": {
                "name": "Module 2"
            },
            "stack": [
                {
                    "sys": "docker",
                    "heap": {
                        "name": "Common Docker Container"
                    }
                }
            ]
        }
    ]
}
```

One should immediately be able to see a possible issue here, where the same Docker container is defined multiple times for multiple modules. Any change to one would obviously need to be carried over manually to all the same places where it is declared. Certainly it would be possible to use links or references here, but this can lead to a tightly-coupled system, almost certainly adds to the complexity of it.

Often, it is useful to store transactions on data as the data itself in some circumstances to avoid needing to commit major changes when that data is compiled, such as when inserting links where there are references. This is largely the purpose of VMDL.

Per the language, the example above can be redefined the following way using four VMDL statements:

```
@NEW habitat;

@IN habitat
@NEW module
@IS {
    "name": "Module 1"
};

@IN habitat
@NEW module
@IS {
    "name": "Module 2"
};

@IN habitat
@NEW docker
@IS {
    "name": "Common Docker Container"
};
```

The idea behind VMDL is to create a highly-compositable, but also generalized data definition format that blends together declarative with functional/imperative logic. Unlike common data definition formats like XML, JSON, or YAML, VMDL needs to be compiled, which does at least make it more akin to SQL (a clear inspiration here due to the same quasi-English syntax). However, SQL per its origins follows a tabular data structure while VMDL is mostly engineered around nested JSON structures. Under most circumstances, relational logic is acceptable, yet it can also lead to a highly-coupled system polluted with added metadata, and is less necessary for configuration data where program data is not expected to be particularly large or change often under normal circumstances, whereby sacrificing some consistency for modularity might be preferred (though it matters less because of the compiled output).

There are also NoSQL databases that bridge between rich-query relational databases and basic flat file manipulation, however, VMDL is also a programming framework as much as it is a database format, meaning that the data that is generated by a VMDL compositor/compiler is designed to be transformed into interfaces for a project's functional logic, since one part of the generated output is (initial) data stored in the heap, and one part are ordered sets of operations stored on the stack. For instance, consider a machine that calculates the Pythagorean theorem of two numbers.

```
{
    {
        "sys": "pythag",
        "heap": {
            "a": "",
            "b": "",
            "c": ""
        },
        "stack": [
            {
                "sys": "pow",
                "heap": ["a", 2, "a"]
            },
            {
                "sys": "pow",
                "heap": ["b", 2, "b"]
            },
            {
                "sys": "sum",
                "heap": ["a", "b", "c"]
            },
            {
                "sys": "root",
                "heap": ["c", 2, "c"]
            }
        ]
    }
}
```

... Where `pow`, `sum`, and `root` are all useable as high-level machines/functions implemented by the user, and the heap contains parameters provided to them.

It's worth nothing this is obviously exceedingly verbose by modern standards, but nothing stops anyone from implementing this particular process entirely in high-level code. Yet, using this methodology is at least useful for piecing procedures together dynamically, which is a huge part of Wingspan Habitat, and allowing those procedures to be declared (not defined) in a common data format as opposed to in a relatively specific coding language.

As machines in the stack could form functions or programs, every machine effectively runs a high-level variant of assembly, where the instruction set (made up of what are themselves machines) is determined and implemented by the programmer. Certain constraints that affect low-level assembly, such as a limited register address space, or pre-programmed instructions, are not a problem here, while high-level control flow structures such as conditions, loops, and random-access named functions can easily be re-implemented.

Though assembly code is notoriously difficult for humans to understand over the high-level languages that came as a response to them, it has the advantage of being defined in a way that doesn't involve nesting structures, making it easier for computers to interpret. Thus, it follows that it's an ideal format for defining the kind of sequentially-loaded procedures that is expected by Wingspan Habitat, and where nesting is still allowed if not encouraged, but is constrained to the common format of a tree homogenously composed of other machines.

<br>

## General Design

Statements in VMDL are executed sequentially one after the other, and are non-associative, meaning that switching the order of statements can lead to different results.

Every statement affects an addressed machine 'as-is', whereby the data is carbon-copied from location to location as opposed to referenced. By design, VMDL discourages cross-referencing for complexity reasons, and since this can lead to recursion and an overall violation of its purpose to create DAGs, or directed acyclic graphs. VMDL uses its method of scripted composition to solve the problem of redundant definition, then.

VMDL is not designed as a general database schema definition solution, and is more for defining application configuration settings than anything else, where these may be relatively complex or nested. It would otherwise be inefficient to use for generalized databases, especially those under heavy load.

Every VMDL statement consists of 'clauses', which are identifiable as such since they always have a preceding `@` symbol. The clauses dictate the behavior of the VMDL statement.

The language is not whitespace aware, and requires a statement-ending semicolon similar to SQL, but also as a result is not sensitive to indentation or other such stylistic differences. Just like SQL too, keywords are not case-sensitive, but are commonly to be represented in full-uppercase just like SQL as a way to make distinguishing keywords from identifiers easier.

VMDL statements are packed into scripts, which can be identified by either a `.vmdl` file extension, an initial `@VMDL` clause at the beginning of the script (which serves no purpose other than as a signature), or both.

<br>

---

## Clauses

---

The language that VMDL represents is divided into clauses similar to those used in SQL. There is considerable flexibility given to how clauses can be defined in VMDL to resemble common language like what SQL tries to do, though pertaining to something that is more firmly a variant of NoSQL than of SQL.

All VMDL statements can be reduced down to four syntactic elements:

1. **The Objective Clauses**: Defines the affected machines in the existing VMDL machine tree. There may be one or more than one contextual clause per statement, but only one of the same type. The only contextual clause so far is `@IN`.
2. **The Operative Clauses**: Defines what is done to the affected machines, or how the affected machines are used. There can only be one operative clause per statement, and there are four different subtypes: `@NEW` for placing new machines, `@NOW` for altering existing machines/running new machines immediately, `@NO` for deleting existing machines, and `@DO` for running existing machines.
3. **The Subjective Clauses**: Defines the characteristics of the machine that is used as a subject of the statement, if applicable, meaning only with `@NEW` and `@NOW` since only these actually define new machines. There may be one or more than one subjective clause per statement, but only one of the same type. These include `@AS` to define the subject's tags, `@IS` to define the subject's heap, and `@HAS` to define the subject's (initial) stack.
4. **The Non-Independent Clauses**: These are clauses that only work in the context of other clauses (besides the subjective clauses), which may be as operators or as operands. These are defined below for their respective containing clauses.

<br>

## Objective Clause: `@IN`

In VMDL, `@IN` takes in tags that are sent as a boolean expression, where the command must be relative to a machine where the expression given to `@IN` evaluates as true. A tag on its own is considered to be *true* if it exists in a given machine, and *false* if it does not exist in a given machine. On the other hand, parsing the expression is done 'from level to level', meaning recursively in relation to machines inside the stacks of other machines, so a machine at the root is a top-level machine, a machine inside a top-level machine's stack is a second-level machine, and so on.

VMDL defines four different kinds of expressions, and allows the use of parantheses to control their given precedence.

1. `@TO`: Only applies to machines where the expression to the right of the operator is true for a child of a machine where the expression to the left of the operator is true. Possible shorthands that are also parsed include `.` and `>`.

2. `@INTO`: Applies to machines where the expression to the right of the operator is true for a descendant of a machine where the expression to the left of the operator is true. This may be used in situations where tags may be present recursively at different levels. Possible shorthands that are also parsed include `..` and `>>`.

3. `@OR`: Applies to machines where either the expression to the left of the operator is true, or the expression to the right of the operator is true. Shorthands are `|` and `,`.

4. `@AND`: Only applies to machines where the expression to the right of the operator is true at the same time where the expression to the left of the operator is true. Shorthands are `&` and any whitespace character.

5. `@NOT`: Only applies to machine where the expression to the right of the operator is false. The only shorthand for this is `!`.

By default, `@NOT` carries the greatest precedence, then `@AND`, then `@OR`, then `@TO`, then `@INTO` with the lowest precedence.

In addition, the following clauses can be used as operands/in place of tags:

1. `@ANY`: This is true for all machines at a given level, and false for any of their child machines. Shorthand is `*`.

2. `@ALL`: This is true for all machines at a given level and below. Shorthand is `**`.

3. `@LEAF`: This checks if the relevant machine has an empty stack or not. If its stack is empty, this evaluates to true, and false otherwise. Shorthand is `***`.

Let's have a look at a particularly advanced example:

```
{
    "sys": "module",
    "tags": ["network1"],
},
{
    "sys": "module",
    "tags": ["network1", "network2"],
    "stack": [
        {
            "sys": "vbox",
            "stack": [
                {
                    "sys": "machine",
                }
            ]
        },
        {
            "sys": "docker",
            "stack": [
                {
                    "sys": "container",
                },
                {
                    "sys": "container",
                }
            ]
        },
        {
            "sys": "docker",
            "stack": [
                {
                    "sys": "image",
                }
            ]
        }
    ]
},
{
    "sys": "module",
    "tags": ["network2"],
    "stack": [
        {
            "sys": "vbox",
            "stack": [
                {
                    "sys": "machine",
                },
                {
                    "sys": "machine",
                },
            ]
        },
        {
            "sys": "vmware",
            "stack": [
                {
                    "sys": "machine",
                }
            ]
        }
    ]
}
```

Here, we might have an expression like:

```
@IN network1 @AND network2 @TO (docker @TO container) @OR (@NOT docker)
@NEW cpu resource
@IS {
    "sockets": "2"
};
```

The operation first searches for top-level machines that contain the tags `network1` and `network2` and *must* contain both, as a result of the `@AND` clause. If this is confirmed, then the `@TO` causes it to search for machines inside the stacks of the top-level machines that satisfied the previous condition, but this only satisfies part of the condition.

If the turns out that the second-level machine doesn't contain the tag `docker`, then the condition is satisfied, full-stop. In this event, the new machine is propagated to those second-level machines. However, if that part of the condition fails (because `docker` is one of its tags), then the other part of the condition signals that third-level machines of them that contain the label `container` will receive copies of the new machine.

This will cause the configuration above to turn into the following:

```
{
    "sys": "module",
    "tags": ["network1"],
},
{
    "sys": "module",
    "tags": ["network1", "network2"],
    "stack": [
        {
            "sys": "vbox",
            "stack": [
                {
                    "sys": "machine",
                },
                {
                    "sys": "resource",
                    "tags": ["cpu"],
                    "heap": {
                        "sockets": "2"
                    }
                }
            ]
        },
        {
            "sys": "docker",
            "stack": [
                {
                    "sys": "container",
                    "stack": [
                        {
                            "sys": "resource",
                            "tags": ["cpu"],
                            "heap": {
                                "sockets": "2"
                            }
                        }
                    ]
                },
                {
                    "sys": "container",
                    "stack": [
                        {
                            "sys": "resource",
                            "tags": ["cpu"],
                            "heap": {
                                "sockets": "2"
                            }
                        }
                    ]
                },
            ]
        },
        {
            "sys": "docker",
            "stack": [
                {
                    "sys": "image",
                }
            ]
        }
    ]
},
{
    "sys": "module",
    "tags": ["network2"],
    "stack": [
        {
            "sys": "vbox",
            "stack": [
                {
                    "sys": "machine",
                },
                {
                    "sys": "machine",
                },
            ]
        },
        {
            "sys": "vmware",
            "stack": [
                {
                    "sys": "machine",
                }
            ]
        }
    ]
}
```

In addition, it should be noted that tags can be evaluated as regular expressions if surrounded by `%` symbols. However, at the same time, tags can only contain characters a-z, A-Z, 0-9, -, and _, and are forbidden from being used in their naming.

Last, but not least, `@IN` can be given as standalone. For instance:

```
@IN module;
```

Means to switch the global context to `module` so that it's no longer at the root, such that the expression for `@IN` doesn't need to be given again in following VMDL statements. This can be reversed back with:

```
@IN @ROOT;
```

<br>

## Operative Clause: `@NEW`

By default, defining data in VMDL only requires that the use of the `@NEW` clause. The purpose of the `@NEW` clause is similar to that of `CREATE` in SQL, even though there are no databases or tables in VMDL. `@NEW` is used to create new machines and append those to the stack of another machine. However, it's more special than that because VMDL by design does not support unique identifiers, only "tags". Identifiers can be unique, but this is enforced by the application rather than by VMDL itself.

To show how this works, consider the basic example below:

```
@IN super-special-network module
@NEW ubuntu linux vbox;
```

Here, `ubuntu linux vbox` is understood as a reference to three different tags each separated by a whitespace character. The adjectives are considered as "secondary" tags, meaning they do not affect the behavior of the machine, only how VMDL is to address the machine. On the other hand, the last token, a noun, is also the "primary" tag. Effectively, this is what becomes the "operating system" of the machine, in that it determines the machine's behavior, and how to interpret the operating systems of the machines below it.

To summarize, the output of this is as follows if we assume a single module that has been tagged as "super-special-network", and that already has a pre-existing machine on it's stack:

```
{
    "sys": "module",
    "tags": ["module", "super-special-network"],
    "stack": [
        {
            "sys": "vbox",
            "tags": ["vbox"]
        },
        {
            "sys": "vbox",
            "tags": ["vbox", "linux", "ubuntu"]
        }
    ]
}
```

If `@IN` is not specified, then the new machine gets added to the root, which as only an array of machines is not callable directly.

<br>

## Operative Clause: `@NOW`

`@NOW` is effectively equivalent equivalent to `@NEW` in terms of its syntax and how it is placed, but is behaviorially very different.

When `@NEW` is used, a machine is placed on another machine's stack behind other machines/operations that are also meant to be applied tentatively and sequentially only once the machines before them on the stack are run. This means the machine applied with `@NEW` is meant to await execution every time the program is run.

On the other hand, `@NOW` applies one machine or operation to another while bypassing whatever is on the stack. Effectively, that means it creates a new stack machine just like `@NEW`, but immediately invokes it too without adding it back to the stack. In this case, `@NOW` is meant to be used like `ALTER` in SQL, but does so within the context of VMDL.

Here's how that can be the case. By default, Wingspan Habitat machines all have the machine/operation `set` built in, which simply applies its own heap over the heap of the outer machine without unsetting other variables (which `flash` does).

```
{
    "sys": "login",
    "tags": ["login", "sysadmin"],
    "heap": {
        "username": "Administrator",
        "password": "P@ssw0rd!"
    }
}
```

Using `@NOW` as below results in the following.

```
@IN sysadmin login
@NOW set
@IS {
    "password": "WBdrck6DsthCn9tv"
}
```

```
{
    "sys": "login",
    "tags": ["login", "sysadmin"],
    "heap": {
        "username": "Administrator",
        "password": "WBdrck6DsthCn9tv"
    }
}
```

To show how this differs from `@NEW`, changing `@NOW` to `@NEW` from the statement above would result in the following instead:

```
{
    "sys": "login",
    "tags": ["login", "sysadmin"],
    "heap": {
        "username": "Administrator",
        "password": "P@ssw0rd!"
    },
    "stack": [
        {
            "sys": "set",
            "tags": ["set"],
            "heap": {
                "password": "WBdrck6DsthCn9tv"
            }
        }
    ]
}
```

Though it is far less verbose, and makes greater sense to use when an operation is merely to edit the machine and not be as "part" of the machine's own execution flow, `@NOW` does have the disadvantage in that it expects the machine or operation being committed to be defined already. In addition, it's less likely to serve a purpose in operations that are entirely external, that is, that are read-only in relation to the heap, and only make external program calls.

<br>

## Operative Clause: `@NO`

Subsequently, by using `@NO`, various operations can be undone in the same fashion as SQL's `DELETE` clause. However, let's also assume this statement is generalized so that the query pertains to simply `vbox`.

```
@IN super-special-network module
@NO vbox;
```

This effectively empties out `super-special-network` since the `vbox` tag is present in all of them.

```
{
    "sys": "module",
    "tags": ["module", "super-special-network"]
}
```

The identifiers `@HEAP`, `@STACK`, and `@TAGS` can all be used in place of the regular identifiers such that only their respective structures are affected, so:

```
@IN super-special-network module
@NO @STACK;
```

Will effectively have the same effect here, but also will, as the name suggests, clear out everything that is in the stack no matter the tags, which has the same effect as:

```
@IN super-special-network module @TO @ANY
@NO;
```

Giving no arguments means that `@NO` will refer directly to the machines in the `@IN` statement, which would be the same as deleting them entirely.

If `@IN` is not specified, then the machine is cleared out from the root.

<br>

## Subjective Clause: `@AS`

`@AS` is used as an alternative to specifying the adjectives in the `@NEW` clause. This has at least one special use case.

Unlike using `@NEW`, setting `@AS` can be used to prevent the statement from auto-setting the noun given with `@NEW` as a tag in addition to being as the operating system. Consider the above again if we used `@AS` to contain the adjectives:

```
@IN super-special-network module
@NEW vbox
@AS ubuntu linux;
```

Becomes:

```
{
    "sys": "module",
    "tags": ["module", "super-special-network"],
    "stack": [
        {
            "sys": "vbox",
            "tags": ["vbox"]
        },
        {
            "sys": "vbox",
            "tags": ["linux", "ubuntu"]
        }
    ]
}
```

Obviously, there aren't many situations where it makes sense to use `@AS`, since actively leaving out the OS from the tag list prevents the machine from being addressed by it. However, `@AS` can be paired with the special keyword `@NONE` such that:

```
@IN super-special-network module
@BE vbox
@AS @NONE;
```

Becomes:

```
{
    "sys": "module",
    "tags": ["module", "super-special-network"],
    "stack": [
        {
            "sys": "vbox",
            "tags": ["vbox"]
        },
        {
            "sys": "vbox"
        }
    ]
}
```

`@AS` can also be paired with `@PARENT` to get the tags of the parent machine.

```
@IN super-special-network module
@BE vbox
@AS @PARENT vbox;
```

Becomes:

```
{
    "sys": "module",
    "tags": ["module", "super-special-network"],
    "stack": [
        {
            "sys": "vbox",
            "tags": ["vbox"]
        },
        {
            "sys": "vbox",
            "tags": ["vbox", "module", "super-special-network"]
        }
    ]
}
```

Without tags, the machine is made unaddressable, and in order to be addressed requires use of `@ANY`, `@ALL`, or `@LEAF` after `@IN`.

<br>

## Subjective Clause: `@IS`

The `@IS` clause is used to set the initial heap variables of a particular machine.

As of now, `@IS` expects the user to provide these initial variables in a JSON format, considering the final format in which it is stored, and the lack of constraints on what the structure of the heap can be by VMDL itself, which logically allows defining it literally.

Example:

```
@IN super-special-network module
@NEW vbox
@IS {
    "uuid": "ccc65230-7998-4cf0-88a4-694e2593b116",
    "template": "base-ubnt-1",
    "cpus": "2",
    "cpucap": "50",
    "shared-folders": [
        {
            "path": "/srv/wsh/data",
            "name": "WSHPersist",
            "mount-point": "/mnt/data",
            "read-only": "true",
            "auto-mount": "false"
        }
    ]
}
```

Becomes:

```
{
    "sys": "module",
    "tags": ["module", "super-special-network"],
    "stack": [
        {
            "sys": "vbox",
            "tags": ["vbox"]
        },
        {
            "sys": "vbox"
        },
        {
            "sys": "vbox"
            "heap": {
                "uuid": "ccc65230-7998-4cf0-88a4-694e2593b116",
                "template": "base-ubnt-1",
                "cpus": "2",
                "cpucap": "50",
                "shared-folders": [
                    {
                        "path": "/srv/wsh/data",
                        "name": "WSHPersist",
                        "mount-point": "/mnt/data",
                        "read-only": "true",
                        "auto-mount": "false"
                    }
                ]
            }
        }
    ]
}
```

<br>

## Subjective Clause: `@HAS`

`@HAS` allows a machine to be initialized with a number of child machines on its stack already, where these are provided as nested VMDL statements. Like `@IS`, these statements need to be enclosed in brackets, though the format internal to `@HAS` is made up other VMDL statements as opposed to a JSON as it is with `@IS`.

Note that `@IN` when used inside `@HAS` is performed relative to the parent machine, as opposed to the root if declared alone. This means that the machine with the `@HAS` clause is treated as the root, and so it is not possible for a machine inside a `@HAS` clause to affect a machine declared outside of it.

Example:

```
@NEW module
@HAS {
    @NEW vbox;
    
    @IN vbox
    @NEW add
    @IS {
        "ram": "4096"
    };
};
```

Becomes:

```
{
    "sys": "module",
    "stack": [
        {
            "sys": "vbox",
            "stack": [
                {
                    "sys": "add",
                    "heap": {
                        "ram": "4096"
                    }
                }
            ]
        }
    ]
}
```

<br>

## Byword on Variables

In VMDL, variables are used as stand-ins for literal values when the value of that variable is difficult to assess or differs according to the dynamics of the context in which the machine is placed. However, in VMDL, their use is more limited than with their contemporaries.

Variables built into the engine include:

<br>

### `@SEQNUM`:

The order of the variable in relation to the stack where it is placed.

For instance, a machine where it is the 5th machine on the stack of its parent will output a "5" from using `@SEQNUM`.

Example:

```
NEW fruit
IS {
    "type": "apple",
    "number": "@SEQNUM"
};

NEW fruit
IS {
    "type": "orange",
    "number": "@SEQNUM"
}

NEW vegetable
IS {
    "type": "radish",
    "number": "@SEQNUM"
}
```

Becomes:

```
[
    {
        "sys": "fruit",
        "tags": ["fruit"],
        "heap": {
            "type": "apple",
            "number": "0"
        }
    },
    {
        "sys": "fruit",
        "tags": ["fruit"],
        "heap": {
            "type": "orange",
            "number": "1"
        }
    },
    {
        "sys": "vegetable",
        "tags": ["vegetable"],
        "heap": {
            "type": "radish",
            "number": "2"
        }
    }
]
```

<br>

### `@SYSSEQNUM`: 

Similar to `@SEQNUM` except it only increments with every instance of a machine with the same operating system on the stack.

Example:

```
NEW fruit
IS {
    "type": "apple",
    "number": "@SYSSEQNUM"
};

NEW fruit
IS {
    "type": "orange",
    "number": "@SYSSEQNUM"
}

NEW vegetable
IS {
    "type": "radish",
    "number": "@SYSSEQNUM"
}
```

Becomes:

```
[
    {
        "sys": "fruit",
        "tags": ["fruit"],
        "heap": {
            "type": "apple",
            "number": "0"
        }
    },
    {
        "sys": "fruit",
        "tags": ["fruit"],
        "heap": {
            "type": "orange",
            "number": "1"
        }
    },
    {
        "sys": "vegetable",
        "tags": ["vegetable"],
        "heap": {
            "type": "radish",
            "number": "0"
        }
    }
]
```

<br>

### `@DEPTH`: 

Simply observes the depth of the machine in terms of where it is placed when compared to the root, which has a depth of 0.

Example:

```
@NEW @DEPTH lvl;

@IN lvl 1
@NEW @DEPTH lvl;

@IN lvl 1 @TO lvl 2
@NEW @DEPTH lvl;
```

Becomes:

```
{
    "sys": "lvl",
    "tags": ["1", "lvl"],
    "stack": [
        {
            "sys": "lvl",
            "tags": ["2", "lvl"],
            "stack": [
                {
                    "sys": "lvl",
                    "tags": ["3", "lvl"],
                }
            ]
        }
    ]
}
```

<br>

### `@UUID4`: 

Used to assign a unique ID to a machine where the chances of collision are extremely low. This can be used to provide the machine with an ID that is universally unique (i.e. throughout the entire program), but that is also always the same for the machine where the clause is used. This has the advantage over programming this in through the stack since it can be used with `@AS`, whereas, tags are not easily affectable by the stack.

Example:

```
@NEW @UUID4 module;
@IS {
    "uuid": "@UUID4"
};
```

Becomes:

```
{
    "sys": "module,
    "tags": ["09e95732-e316-46b7-8095-9319f35c5c2f", "module"],
    "heap": {
        "uuid": "09e95732-e316-46b7-8095-9319f35c5c2f"
    }
}
```

<br>

With the subjective clauses `@AS`, `@IS`, or `@HAS`, it is also possible to refer to values further up the stack from where a machine is placed.

<br>

### `@PARENT`:

Refers to the value of a key located in the machine where another machine is being placed.

Example:

```
@NEW lvl1
@IS {
    "fruit": "apples"
};

@IN lvl1
@NEW lvl2
@IS {
    "fruit": "oranges"
};

@IN lvl1 @TO lvl2
@NEW lvl3
@IS {
    "fruit": "@LOCAL"
}
```

Becomes:

```
{
    "sys": "lvl1",
    "tags": ["lvl1"],
    "heap": {
        "fruit": "apples"
    },
    "stack": [
        {
            "sys": "lvl2",
            "tags": ["lvl2"],
            "heap": {
                "fruit": "oranges"
            },
            "stack": [
                {
                    "sys": "lvl3",
                    "tags": ["lvl3"],
                    "heap": {
                        "fruit": "oranges"
                    }
                }
            ]
        }
    ]
}
```

<br>

### `@CLOSEST`:

Refers to the value given to the same key that is nearest inside the parent tree. Thus, if a key is undefined in a parent machine, the parser will try to locate a value of the key inside a parent machine of that, and will stop at the point in which it acquires a value.

Example:

```
@NEW lvl1
@IS {
    "fruit": "apples"
};

@IN lvl1
@NEW lvl2
@IS {
    "fruit": "oranges"
};

@IN lvl1 @TO lvl2
@NEW lvl3

@IN lvl1 @TO lvl2 @TO lvl3
@NEW lvl4
@IS {
    "fruit": "@CLOSEST"
}
```

Becomes:

```
{
    "sys": "lvl1",
    "heap": {
        "fruit": "apples"
    },
    "stack": [
        {
            "sys": "lvl2",
            "heap": {
                "fruit": "oranges"
            },
            "stack": [
                {
                    "sys": "lvl3",
                    "stack": [
                        {
                            "sys": "lvl4",
                            "heap": {
                                "fruit": "oranges"
                            }
                        }
                    ]
                }
            ]
        }
    ]
}
```

<br>

### `@ROOT`:

Refers to the value given to the same key inside the parent machine located at the root. This means once the value is defined here, it cannot be overriden by a machine at a lower level. This can effectively be used as a way to provide global parameters to a machine.

Example:

```
@NEW lvl1
@IS {
    "fruit": "apples"
};

@IN lvl1
@NEW lvl2
@IS {
    "fruit": "oranges"
};

@IN lvl1 @TO lvl2
@NEW lvl3
@IS {
    "fruit": "@GLOBAL"
}
```

Becomes:

```
{
    "sys": "lvl1",
    "heap": {
        "fruit": "apples"
    },
    "stack": [
        {
            "sys": "lvl2",
            "heap": {
                "fruit": "oranges"
            },
            "stack": [
                {
                    "sys": "lvl3",
                    "heap": {
                        "fruit": "apples"
                    }
                }
            ]
        }
    ]
}
```

<br>

### `@FARTHEST`:

This is to `@GLOBAL` what `@CLOSEST` is to `@LOCAL`, referring to the value as it is defined in the topmost tree in the stack of parent trees, whether it is the root or not, effectively as the variable that has the greatest scope.

Example:

```
@NEW lvl1;

@IN lvl1
@NEW lvl2
@IS {
    "fruit": "apples"
};

@IN lvl1 @TO lvl2
@NEW lvl3
@IS {
    "fruit": "oranges"
};

@IN lvl1 @TO lvl2 @TO lvl3
@NEW lvl4
@IS {
    "fruit": "@FARTHEST"
}
```

Becomes:

```
{
    "sys": "lvl1",
    "stack": [
        {
            "sys": "lvl2",
            "heap": {
                "fruit": "apples"
            },
            "stack": [
                {
                    "sys": "lvl3",
                    "heap": {
                        "fruit": "oranges"
                    },
                    "stack": [
                        {
                            "sys": "lvl4",
                            "heap": {
                                "fruit": "apples"
                            }
                        }
                    ]
                }
            ]
        }
    ]
}
```

If a variable using the same address is not located according to the identifier used, then the variable called is ignored and left unset.

Note that this can be done at the root level as well such that:

```
@NEW fruit
@IS {
    "color": "red"
}

@IN fruit
@NEW apple
@IS @PARENT;
```

Becomes:

```
{
    "sys": "fruit",
    "tags" ["fruit"],
    "heap": {
        "color": "red"
    },
    "stack": [
        {
            "sys": "apple",
            "tags" ["apple"],
            "heap": {
                "color": "red"
            }
        }
    ]
}
```

Would copy the entire heap from the parent `fruit` to the child `apple`. As it would seem, this can used to do a form of inheritance (albeit that is rudimentary, and akin to JavaScript prototyping more than it is to inheritance in object-oriented languages).

<br>

## Subjective Clause: `@FROM`

`@FROM` can be used as a shorthand to copy everything inside the tags, heap, or stack of another machine to the new machine, and can be used in addition to `@AS`, `@IS`, or `@HAS` such that these will override or overwrite whatever machine `@FROM` addresses. This effectively extends the inheritance pattern above.

However, `@FROM` only accepts the relative variable identifiers `@PARENT`, `@CLOSEST`, `@FARTHEST`, and `@ROOT` as arguments.

Example:

```
@NEW fruit
@IS {
    "color": "red",
    "rotten": "false"
};

@NEW fruit
@IS {
    "color": "green",
    "rotten": "false"
};

@IN fruit
@NEW apple
@FROM @PARENT
@IS {
    "rotten": "true"
};
```

Becomes:

```
[
    {
        "sys": "fruit",
        "heap": {
            "color": "red",
            "rotten": "false"
        }
        "stack": [
            {
                "sys": "apple",
                "heap": {
                    "color": "red",
                    "rotten": "true"
                }
            }
        ]
    },
    {
        "sys": "fruit",
        "heap": {
            "color": "green",
            "rotten": "false"
        }
        "stack": [
            {
                "sys": "apple",
                "heap": {
                    "color": "green",
                    "rotten": "true"
                }
            }
        ]
    }
]
```

<br>

## Subjective Clause: `@TIMES`

The `@TIMES` clause is used to repeat a statement containing `@NEW` some number of times. `@TIMES` always expects an integer as an argument.

Example:

```
@NEW module
@TIMES 2
```

Becomes:

```
[
    {
        "sys": module,
        "tags": ["module"]
    },
    {
        "sys": module,
        "tags": ["module"]
    }
]
```

<br>

---

## Wingspan Habitat

---

Wingspan Habitat is an implementation of VMDL that uses the same methodology to provision, configure, and otherwise reconstruct *actual* virtual machines running on hypervisors such as Oracle VirtualBox. Wingspan Habitat uses VMDL to its advantage as a way to dynamically program the logic involved in the setting up these machines.

Here is one such program designed with VMDL and Wingspan Habitat, where we provision it into several files which are loaded one after the other:

<br>

`habitat-example1-definitions.vmdl`:

```
@VMDL;

@NEW habitat
@HAS {
    @NEW module
    @AS example1
    @HAS {
        # Provision 4 nodes with unique identities.
        @NEW dns-server node;
        @NEW db-server node;
        @NEW app-server node;
        @NEW web-server node;

        # Set common settings for all of the nodes
        @IN node
        @NOW set
        @IS {
            "platform": "vbox",
            "template": "ubnt-base",
            "cpus": 1,
            "ram": 2048,
            "nics": [
                { },
                {
                    "type": "intnet",
                    "id": "example1-lan"
                }
            ]
        };

        # Set a common payload for all of the nodes
        @IN node
        @NEW payload
        @IS {
            "protocol": "sftp",
            "source": "assets/payloads/linux/ubnt/common",
            "macro": [
                "install.sh"
            ],
            "target": "/root/1"
        }
        @HAS {
            @NEW state
            @IS {
                "welcome": "Hello, World!"
            };
        };

        # Set a common command for all the nodes to execute the previously-added payload
        @IN node
        @NEW command
        @IS {
            "protocol": "ssh",
            "pwd": "/root/1",
            "exec": "/bin/bash -C /root/1/install.sh"
        };

        # Special payload common details
        @IN node
        @NEW payload
        @AS special-payload
        @IS {
            "protocol": "sftp",
            "source: "assets/payloads/linux/ubnt",
            "macro": [
                "install.sh"
            ],
            "target": "/root/2"
        };

        # DNS Server main payload
        @IN dns-server node @TO special-payload
        @NEW concat
        @IS {
            "source": "/dns-server"
        };

        # DB Server main payload
        @IN db-server node @TO special-payload
        @NEW concat
        @IS {
            "source": "/db-server"
        };

        # Web Application Server main payload
        @IN app-server node @TO special-payload
        @NEW concat
        @IS {
            "source": "/app-server"
        };

        # Web Server main payload
        @IN web-server node @TO special-payload
        @NEW concat
        @IS {
            "source": "/web-server"
        };

        # Special payload install command
        @IN node
        @NEW command
        @IS {
            "protocol": "ssh",
            "pwd": "/root/2",
            "exec": "/bin/bash -C /root/2/install.sh"
        };
    };
};
```

In the above, there is a top-level machine known as Habitat, which is the machine that is started whenever Habitat is run directly. The Habitat machine is used to call "modules", which are the lab configurations, or to call "instances", which are snapshots of the modules once they are built according to their VMDL code. In other words, modules represent the VMDL code that originate instances.

Each module is expected to have a unique identifier associated to it, though this is not required if the module is meant to be paired with some other. It can also be any kind of unique identifier, whether a unique phrase, a sequential index, or a UUID, so long as the module is tagged as such.

The modules each contains "nodes", which are the virtual machines on the back-end. These will normally come with the keys `platform` and `template` at the very least, which identify, which identify the hypervisor system and the existing image registered with that hypervisor, respectively.

Other details include hardware, for which the effective states may differ according to the hypervisor, and software configuration pieces in the forms of payloads, commands, and states.

A **state** is a value which is passed on from the VMDL configuration file to a payload via. macro, effectively in order to form an environment that can be used cross-platform and cross-script as well

WIP

<br>

`habitat-example1-conditional-passwords.vmdl`:

```
@VMDL;

@IN @ROOT
@NOW random @IS { "return": "seed" };
@NOW set    @IS { "dictionary": "assets/rockyou.txt" };

@IN habitat @TO example1;

@NEW jlt @IS { "key": "security-rating", "value": "0.0", "label": "password-done" };
@NEW jlt @IS { "key": "security-rating", "value": "0.9", "label": "password-repeated" };
@NEW jge @IS { "key": "security-rating", "value": "0.9", "label": "password-unrepeated" };

@NEW label @IS { "id": "password-repeated" };

@IN node @TO payload;
@NEW token
@IS {
    "seed": "@ROOT",
    "security-rating": "@ROOT",
    "dictionary": "@ROOT",
    "return": "sysadmin"
};

@NEW jump @IS { "label": "password-done" };

@NEW label @IS { "id": "password-unrepeated" };

@IN node @TO payload;
@NEW password-token
@IS {
    "security-rating": "@ROOT",
    "return": "sysadmin"
};

@NEW label @IS { "id": "password-done" };
```

<br>

`habitat-example1-actions.vmdl`:

```
@VMDL;

@IN habitat @TO example1;

# Generates all of the machines so far created above
@NEW provision

# Transport all payloads, and send all commands (in order) to all of the machines so far generated
@NEW configure

@IN @ROOT;
```

<br>

`habitat-example1-starter.vmdl`:

```
@VMDL;

@IN habitat
@NOW start;
```

In the process, the root machine exposes `modules` that are all individually-callable from the Habitat root machine. `modules` each themselves are composed of virtual machines. However, these machines are only declarative, as 

## Reasoning

WIP

## Glossary of Special Machines

### `habitat`:

In Wingspan Habitat, all modules are second level machines to the "Habitat" machine at the root.

<br>

### `module`:

<br>

### `state`:

<br>

### `token`:

<br>

### `payload`:

<br>

### `command`:

<br>

### `provision`:

<br>

### `configure`:

<br>

### `send-message`:

<br>

### `receive-message`:

<br>

### `delay`:

<br>

## Glossary of Common Machines

`nop`:  
`label`:  
`jump`:  
`jeq`:  
`jne`:  
`jgt`:  
`jge`:  
`jlt`:  
`jle`:  
`flash`:  
`unflash`:  
`set`:  
`unset`:  
`not`:  
`and`:  
`or`:  
`add`:  
`mul`:  
`pow`:  
`push-up`:  
`pop-up`:  
`push-down`:  
`pop-down`:  
`concat`:  
`uuid`:  
`time`:  
`break`:  
`start`:  
`step`:  
`consume`:  
`produce`:  
`call`:  
`seed`:  
