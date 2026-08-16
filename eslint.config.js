export default [
  {
    ignores: ['coverage/**', 'dist/**', 'node_modules/**', 'site-dist/**']
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly'
      },
      sourceType: 'module'
    },
    rules: {
      'constructor-super': 'error',
      'eqeqeq': ['error', 'always'],
      'for-direction': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'no-class-assign': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': ['error', 'except-parens'],
      'no-const-assign': 'error',
      'no-constant-binary-expression': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-debugger': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty-character-class': 'error',
      'no-ex-assign': 'error',
      'no-extra-boolean-cast': 'error',
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-import-assign': 'error',
      'no-irregular-whitespace': 'error',
      'no-loss-of-precision': 'error',
      'no-misleading-character-class': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-obj-calls': 'error',
      'no-promise-executor-return': 'error',
      'no-prototype-builtins': 'error',
      'no-self-assign': 'error',
      'no-setter-return': 'error',
      'no-shadow-restricted-names': 'error',
      'no-sparse-arrays': 'off',
      'no-this-before-super': 'error',
      'no-undef': 'error',
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unused-labels': 'error',
      'no-unused-private-class-members': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-useless-backreference': 'error',
      'no-useless-catch': 'error',
      'no-useless-escape': 'error',
      'no-with': 'error',
      'prefer-const': 'error',
      'require-yield': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error'
    }
  },
  {
    files: ['docs-site/**/*.js'],
    languageOptions: {
      globals: {
        clearTimeout: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        history: 'readonly',
        location: 'readonly',
        navigator: 'readonly',
        performance: 'readonly',
        setTimeout: 'readonly',
        URLSearchParams: 'readonly'
      }
    }
  }
];
