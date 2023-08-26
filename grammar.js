/**
 * @file ZSH grammar for tree-sitter
 * @author Amaan Qureshi <amaanq12@gmail.com>
 * @license MIT
 */

/* eslint-disable arrow-parens */
/* eslint-disable camelcase */
/* eslint-disable-next-line spaced-comment */
/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const Bash = require('tree-sitter-bash/grammar');

const SPECIAL_CHARACTERS = [
  '\'', '"',
  '<', '>',
  '{', '}',
  '\\[', '\\]',
  '(', ')',
  '`', '$',
  '|', '&', ';',
  '\\',
  '\\s',
];

module.exports = grammar(Bash, {
  name: 'zsh',

  conflicts: ($, original) => original.concat([
    [$.function_definition, $.command_name],
    [$.variable_assignment],
  ]),

  rules: {
    do_group: $ => seq(
      'do',
      optional(choice($._terminated_statement, $._statement)),
      optional($.always_statement),
      'done',
    ),

    always_statement: $ => seq(
      'always',
      optional($._terminated_statement),
    ),

    if_statement: $ => seq(
      'if',
      field('condition', choice($._terminated_statement, $._statement)),
      'then',
      optional($._terminated_statement),
      repeat($.elif_clause),
      optional($.else_clause),
      'fi',
    ),

    elif_clause: $ => seq(
      'elif',
      field('condition', choice($._terminated_statement, $._statement)),
      'then',
      optional($._terminated_statement),
    ),

    function_definition: $ => seq(
      choice(
        seq(
          'function',
          field('name', $.word),
          optional(seq('(', ')')),
        ),
        seq(
          repeat(prec.dynamic(-1, field('name', $.word))),
          '(', ')',
        ),
      ),
      field(
        'body',
        choice(
          $.compound_statement,
          $.subshell,
          $.test_command,
        ),
      ),
    ),

    compound_statement: $ => seq(
      '{',
      optional(choice(
        seq($._terminated_statement, optional($._statement)),
        $._statement,
      )),
      token(prec(-1, '}')),
    ),

    variable_assignments: (_, original) => seq(
      optional('integer'),
      original,
    ),

    variable_assignment: (_, original) => seq(
      optional('integer'),
      original,
    ),

    command: ($, original) => seq(
      optional('integer'),
      original,
    ),

    subscript: $ => seq(
      field('name', choice(
        $.variable_name,
        // $.simple_expansion,
        // alias($.__simple_expansion, $.simple_expansion),
      )),
      (seq(
        '[',
        optional($.flag),
        field('index', choice(
          $._literal,
          // $.number,
          $.binary_expression,
          $.unary_expression,
          $.parenthesized_expression,
          $.subscript,
        )),
        // optional(seq(
        //   token.immediate(','),
        //   field('index', choice($._literal, $.binary_expression, $.unary_expression, $.parenthesized_expression)),
        // )),
        // optional($._concat),
        ']',
      )),
      // optional($._concat),
    ),

    binary_expression: ($, original) => choice(
      original,
      prec.left(2, seq(
        field('left', $._expression),
        field('operator', choice('=')),
        field('right', alias($._regex_no_space, $.regex)),
      )),
    ),

    _arithmetic_expression: ($, original) => choice(
      original,
      alias($._arithmetic_call_expression, $.call_expression),
      repeat1($.simple_expansion),
      alias('?', $.special_variable_name),
    ),

    _arithmetic_call_expression: $ => seq(
      $._arithmetic_expression,
      '(',
      optional($._arithmetic_expression),
      ')',
    ),

    simple_expansion: $ => prec.right(seq(
      '$',
      choice(
        $._simple_variable_name,
        $._multiline_variable_name,
        $._special_variable_name,
        alias('!', $.special_variable_name),
        alias('#', $.special_variable_name),
        seq(
          field('operator', choice('#', '~', '+')),
          // subscript = +700 state count..
          choice(alias(token.immediate(/\w+/), $.variable_name), $.subscript),
        ),
        // $.subscript,
      ),
    )),

    __simple_expansion: $ => seq(
      token.immediate(prec(-1, '$')),
      alias(token.immediate(/\w+/), $.simple_variable_name),
    ),

    // expansion: $ => seq(
    //   '${',
    //   repeat(choice('#', '!', '=', '~')),
    //   optional(choice($.flag, $.parameter_expansion)),
    //   optional($._expansion_body),
    //   '}',
    // ),

    _expansion_body: $ => choice(
      // ${!##} ${!#}
      repeat1(field(
        'operator',
        choice(
          alias($._external_expansion_sym_hash, '#'),
          alias($._external_expansion_sym_bang, '!'),
          alias($._external_expansion_sym_equal, '='),
        ),
      )),
      seq(
        optional(field('operator', immediateLiterals('!', '#', '~', '='))),
        choice(
          $.variable_name,
          $._simple_variable_name,
          $._special_variable_name,
          $.subscript,
          $.expansion,
          $.string,
          $.command_substitution,
        ),
        choice(
          $._expansion_expression,
          $._expansion_regex,
          $._expansion_regex_replacement,
          $._expansion_regex_removal,
          $._expansion_max_length,
          $._expansion_operator,
        ),
      ),
      seq(
        field('operator', immediateLiterals('!', '~')),
        choice($._simple_variable_name, $.variable_name),
        optional(field('operator', choice(
          token.immediate('@'),
          token.immediate('*'),
        ))),
      ),
      seq(
        optional(field('operator', immediateLiterals('#', '!', '=', '+'))),
        choice(
          $.subscript,
          $._simple_variable_name,
          $._special_variable_name,
          $.command_substitution,
          $.expansion,
        ),
        repeat(field(
          'operator',
          choice(
            alias($._external_expansion_sym_hash, '#'),
            alias($._external_expansion_sym_bang, '!'),
            alias($._external_expansion_sym_equal, '='),
          ),
        )),
      ),
      seq(
        $.flag,
        choice(
          $._simple_variable_name,
          $.subscript,
          $.string,
          $.command_substitution,
          $.expansion,
        ),
      ),
    ),

    _expansion_expression: $ => prec(1, seq(
      field('operator', immediateLiterals('=', ':=', '-', ':-', '+', ':+', '?', ':?')),
      optional(seq(
        choice(
          alias($._concatenation_in_expansion, $.concatenation),
          // $._simple_variable_name,
          $.command_substitution,
          $.word,
          $.expansion,
          $.simple_expansion,
          $.array,
          $.string,
          $.raw_string,
          $.ansi_c_string,
          alias(/[\s]+[\w]*/, $.word),
        ),
      )),
    )),

    _expansion_regex: $ => seq(
      field('operator', choice('#', alias($._immediate_double_hash, '##'), ':#', '%', '%%')),
      choice($.regex, alias(')', $.regex), $.string, $.raw_string, alias(/\s+/, $.regex)),
    ),

    _concatenation_in_expansion: $ => prec(-2, seq(
      choice(
        $.word,
        $.variable_name,
        $.simple_expansion,
        $.expansion,
        $.string,
        $.raw_string,
        $.command_substitution,
        alias(/[\s]+[\w]*/, $.word),
      ),
      repeat1(seq(
        choice($._concat, alias(/`\s*`/, '``')),
        choice(
          $.word,
          $.variable_name,
          $.simple_expansion,
          $.expansion,
          $.string,
          $.raw_string,
          $.command_substitution,
          alias(/[\s]+[\w]+/, $.word),
          alias($._comment_word, $.word),
        ),
      )),
    )),

    flag: $ => prec(1, seq(
      token.immediate('('),
      $.flag_name,
      optional(choice(
        seq(':', alias(/[^:]/, $.separator), ':'),
        seq('.', alias(/[^.]/, $.separator), '.'),
      )),
      ')',
    )),

    flag_name: _ => /[a-zA-Z@-]+/,

    parameter_expansion: $ => seq(
      '(',
      sep1(
        repeat(choice(
          alias(/[a-zA-Z]+/, $.word),
          seq('\\', noneOf('\\s')),
        )),
        ':',
      ),
      ')',
    ),

    range: $ => seq(
      '-',
      choice(
        '<->',
        $.number,
      ),
    ),

    word: _ => token(seq(
      choice(
        noneOf('#', ...SPECIAL_CHARACTERS),
        seq('\\', noneOf('\\s')),
      ),
      repeat(choice(
        noneOf(...SPECIAL_CHARACTERS),
        seq('\\', noneOf('\\s')),
        seq('(', repeat1(noneOf(...SPECIAL_CHARACTERS)), ')'),
        '\\ ',
      )),
    )),

  },
});

/**
 * Returns a regular expression that matches any character except the ones
 * provided.
 *
 * @param  {...string} characters
 *
 * @return {RegExp}
 *
 */
function noneOf(...characters) {
  const negatedString = characters.map(c => c == '\\' ? '\\\\' : c).join('');
  return new RegExp('[^' + negatedString + ']');
}

/**
* Creates a rule to match one or more of the rules separated by the separator
*
* @param {Rule} rule
* @param {string} separator - The separator to use.
*
* @return {SeqRule}
*
*/
function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

/**
 *
 * Turns a list of rules into a choice of immediate rule
 *
 * @param {(RegExp|String)[]} literals
 *
 * @return {ChoiceRule}
 */
function immediateLiterals(...literals) {
  return choice(...literals.map(l => token.immediate(l)));
}
