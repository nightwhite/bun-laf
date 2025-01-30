import pluginJs from '@eslint/js'
import prettier from 'eslint-config-prettier'
import pluginImport from 'eslint-plugin-import'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  {
    files: ['**/*.{js,mjs,ts}'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      import: pluginImport,
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts'],
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.mjs', '.ts'],
        },
      },
    },
    rules: {
      'import/no-unresolved': 'error',
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/newline-after-import': 'error',
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // 添加 no-var 规则的例外
      'no-var': [
        'error',
        {
          ignoreGlobalScope: true, // 允许在全局作用域使用 var
        },
      ],
    },
  },
  prettier,
]
