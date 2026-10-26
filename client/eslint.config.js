import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      // Reglas clásicas de hooks (las nuevas de v7 asumen el React Compiler, que no se usa aquí).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Componentes recibidos como prop ({ icon: Icon }) se usan en JSX, que esta regla no ve.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^(_|[A-Z])' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Seguridad: nada de HTML crudo ni eval.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-restricted-syntax': ['error', { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'No uses dangerouslySetInnerHTML.' }],
    },
  },
  // Contextos, rutas y piezas compartidas exportan funciones junto a componentes a propósito.
  { files: ['src/context/**', 'src/routing/**', 'src/components/**'], rules: { 'react-refresh/only-export-components': 'off' } },
  { files: ['**/*.test.{js,jsx}', 'vite.config.js', 'eslint.config.js'], languageOptions: { globals: { ...globals.node } } },
];
