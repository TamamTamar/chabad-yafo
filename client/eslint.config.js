import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-restricted-globals': ['error', {
        name: 'alert',
        message: 'Use the project modal instead of a browser alert.',
      }, {
        name: 'confirm',
        message: 'Use ConfirmDialog instead of a browser confirm.',
      }, {
        name: 'prompt',
        message: 'Use the project modal instead of a browser prompt.',
      }],
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.object.name='window'][callee.property.name='alert']",
        message: 'Use the project modal instead of a browser alert.',
      }, {
        selector: "CallExpression[callee.object.name='window'][callee.property.name='confirm']",
        message: 'Use ConfirmDialog instead of a browser confirm.',
      }, {
        selector: "CallExpression[callee.object.name='window'][callee.property.name='prompt']",
        message: 'Use the project modal instead of a browser prompt.',
      }],
    },
  },
])
