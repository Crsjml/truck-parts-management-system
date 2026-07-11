module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: [],
  rules: {
    'react/prop-types': 'off', // Not using prop-types
    'react-hooks/purity': 'off', // Incorrectly flags event handlers
    'react-hooks/set-state-in-effect': 'off', // Too aggressive for legacy code
    'react-hooks/immutability': 'off', // Incorrectly flags hoisted arrow functions
    'react-hooks/static-components': 'off', // Allow inline components
    'react/no-unescaped-entities': 'off', // Avoid mutating existing text strings
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  },
}
