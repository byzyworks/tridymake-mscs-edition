import { deepCopy } from './common.js';

export const APP = Object.freeze({
    NAME:    'Tridymake',
    VERSION: '0.4.0'
});

export const global = {
    flags: {
        clear: false,
        exit:  false
    },
    alias: {
        type:   'type',
        tags:   'tags',
        state:  'free',
        nested: 'tree',
        list:   'root'
    },
    remote: {
        enable:  false,
        host:    'localhost',
        port:    21780,
        timeout: 3000
    },
    server: {
        port:       21780,
        preformat:  false,
        allow_tree: true,
        allow_verb: false
    },
    output: {
        format:      'js',
        compression: 'raw',
        indent:      null,
        list_mode:   'auto',
        file: {
            path:  null,
            mode:  'create',
            quiet: false
        }
    },
    log_level: 'info'
};
global.defaults = Object.freeze(deepCopy(global));

// For multi-character symbols, make sure to change how they're handled in the token lexer under _readSymbols() as well.
const VALUE_SYMBOL       = '$';
export const CONTEXT_MAP = Object.freeze({
    'LEFT_PARENTHESES':                    '(',
    'RIGHT_PARENTHESES':                   ')',
    'WILDCARD_LONG':                       'any',
    'WILDCARD':                            '*',
    'RECURSIVE_WILDCARD_LONG':             'all',
    'RECURSIVE_WILDCARD':                  '**',
    'NOT_LONG':                            'not',
    'NOT':                                 '!',
    'AND_LONG':                            'and',
    'AND':                                 '&',
    'XOR_LONG':                            'xor',
    'XOR':                                 '^',
    'OR_LONG':                             'or',
    'OR':                                  '|',
    'OR_EXTRA':                            ',',
    'TERNARY_1_LONG':                      'then',
    'TERNARY_1':                           '?',
    'TERNARY_2_LONG':                      'else',
    'TERNARY_2':                           ':',
    'LOOKAHEAD_LONG':                      'parent',
    'LOOKAHEAD':                           '>',
    'RECURSIVE_LOOKAHEAD_LONG':            'ascend',
    'RECURSIVE_LOOKAHEAD':                 '>>',
    'LOOKBEHIND_LONG':                     'child',
    'LOOKBEHIND':                          '<',
    'RECURSIVE_LOOKBEHIND_LONG':           'descend',
    'RECURSIVE_LOOKBEHIND':                '<<',
    'INVERSE_LOOKAHEAD_LONG':              'nonparent',
    'INVERSE_LOOKAHEAD':                   '!>',
    'INVERSE_RECURSIVE_LOOKAHEAD_LONG':    'nonascend',
    'INVERSE_RECURSIVE_LOOKAHEAD':         '!>>',
    'INVERSE_LOOKBEHIND_LONG':             'nonchild',
    'INVERSE_LOOKBEHIND':                  '!<',
    'INVERSE_RECURSIVE_LOOKBEHIND_LONG':   'nondescend',
    'INVERSE_RECURSIVE_LOOKBEHIND':        '!<<',
    'TRANSITION_LONG':                     'to',
    'TRANSITION':                          '/',
    'RECURSIVE_TRANSITION_LONG':           'toward',
    'RECURSIVE_TRANSITION':                '//',
    'INCLUSIVE_RECURSIVE_TRANSITION_LONG': 'catchall',
    'INCLUSIVE_RECURSIVE_TRANSITION':      '&//',
    'VALUE_SYMBOL':                        VALUE_SYMBOL,
    'EQUAL_TO_LONG':                       'eq',
    'EQUAL_TO':                            VALUE_SYMBOL + '==',
    'NOT_EQUAL_TO_LONG':                   'ne',
    'NOT_EQUAL_TO':                        VALUE_SYMBOL + '!=',
    'LESS_THAN_LONG':                      'lt',
    'LESS_THAN':                           VALUE_SYMBOL + '<',
    'LESS_THAN_OR_EQUAL_TO_LONG':          'le',
    'LESS_THAN_OR_EQUAL_TO':               VALUE_SYMBOL + '<=',
    'GREATER_THAN_LONG':                   'gt',
    'GREATER_THAN':                        VALUE_SYMBOL + '>',
    'GREATER_THAN_OR_EQUAL_TO_LONG':       'ge',
    'GREATER_THAN_OR_EQUAL_TO':            VALUE_SYMBOL + '>=',
    'VARIABLE_DEPTH_LONG':                 'depth',
    'VARIABLE_DEPTH_EXTRA':                'd',
    'VARIABLE_DEPTH':                      VALUE_SYMBOL + 'd',
    'VARIABLE_CHILDREN_LONG':              'children',
    'VARIABLE_CHILDREN_EXTRA':             'c',
    'VARIABLE_CHILDREN':                   VALUE_SYMBOL + 'c',
    'VARIABLE_INDEX_LONG':                 'index',
    'VARIABLE_INDEX_EXTRA':                'i',
    'VARIABLE_INDEX':                      VALUE_SYMBOL + 'i',
    'VARIABLE_SHUFFLED_INDEX_LONG':        'shuffled',
    'VARIABLE_SHUFFLED_INDEX_EXTRA':       's',
    'VARIABLE_SHUFFLED_INDEX':             VALUE_SYMBOL + 's',
    'VARIABLE_SIBLINGS_LONG':              'siblings',
    'VARIABLE_SIBLINGS_EXTRA':             'n',
    'VARIABLE_SIBLINGS':                   VALUE_SYMBOL + 'n',
    'VARIABLE_QUERY_RANDOM_LONG':          'random',
    'VARIABLE_QUERY_RANDOM_EXTRA':         'q',
    'VARIABLE_QUERY_RANDOM':               VALUE_SYMBOL + 'q',
    'VARIABLE_NEW_RANDOM_LONG':            'iterandom',
    'VARIABLE_NEW_RANDOM_EXTRA':           'r',
    'VARIABLE_NEW_RANDOM':                 VALUE_SYMBOL + 'r'
});

export const OPERATION_MAP = Object.freeze({
    'TEXT': {
        'APPEND':           'new',
        'OVERWRITE':        'set',
        'EDIT':             'put',
        'DELETE':           'del',
        'EDIT_TAGS':        'tag',
        'DELETE_TAGS':      'untag',
        'CUT':              'cut',
        'COPY':             'copy',
        'PRINT':            'get',
        'IMPORT':           'import',
        'PRINT_STATISTICS': 'stat'
    },
    'ASTREE': {
        'APPEND':        'append',
        'OVERWRITE':     'overwrite',
        'EDIT':          'edit',
        'DELETE':        'delete',
        'EDIT_TAGS':     'tag',
        'DELETE_TAGS':   'untag',
        'CLIPBOARD_IN':  '_save',
        'CLIPBOARD_OUT': '_load',
        'PRINT':         'print',
        'MULTIPLE':      '_multiple',
        'NOP':           '_nop'
    }
});
