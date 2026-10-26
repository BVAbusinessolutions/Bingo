import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules', '.data'] },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Seguridad
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-imports': ['error', { paths: [{ name: 'child_process', message: 'No ejecutar comandos del sistema desde el servidor.' }] }],
    },
  },
];
