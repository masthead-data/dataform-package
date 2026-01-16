import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: ['node_modules/**']
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,

        // Dataform-specific globals
        publish: 'readonly',
        constant: 'readonly',
        ctx: 'readonly',
        operate: 'readonly',
        assert: 'readonly',
        reservations: 'readonly',
      }
    },
    rules: {
      // Basic formatting rules
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'never']
    }
  }
]
