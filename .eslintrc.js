module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    // ARCHITECTURE RULE: Ban direct new Date() and Date.now() everywhere outside Clock service
    'no-restricted-syntax': [
      'error',
      {
        selector: "NewExpression[callee.name='Date']",
        message:
          "Direct instantiation of 'new Date()' is prohibited by SAMAY Architecture Rules. All time must come from an injectable ClockService.",
      },
      {
        selector: "MemberExpression[object.name='Date'][property.name='now']",
        message:
          "Direct call to 'Date.now()' is prohibited by SAMAY Architecture Rules. All time must come from an injectable ClockService.",
      },
    ],
  },
  overrides: [
    {
      // Clock service implementations and test fixtures are exempted
      files: [
        '**/clock/**',
        '**/*clock*.ts',
        '**/*clock*.service.ts',
        '**/*clock*.mock.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    'build/',
    'coverage/',
    '*.js',
  ],
};
