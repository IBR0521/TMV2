import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/**
 * Lint is one of the three places tenant isolation is enforced (see
 * docs/spec/architecture.md, "Data access rules"). The boundary rules below are
 * not style preferences: if one of them fires, the build must fail.
 */

/** The service-role key lives only in worker/. Nothing outside worker/ may reach it. */
const serviceRoleMessage =
  'The service-role client bypasses RLS and lives only in worker/. ' +
  'Web code must use src/server/db (the RLS client) through a service.';

const noWorkerImports = {
  patterns: [
    { group: ['@worker/*', '@worker'], message: serviceRoleMessage },
    { group: ['**/worker/*', '**/worker'], message: serviceRoleMessage },
    { group: ['graphile-worker', 'graphile-worker/*'], message: serviceRoleMessage },
    { group: ['pg', 'pg/*'], message: serviceRoleMessage },
  ],
};

const config = [
  ...nextCoreWebVitals,
  {
    name: 'truckmates/ignores',
    ignores: [
      '.next/**',
      'node_modules/**',
      'src/ui/tokens.css',
      'src/server/db/database.types.ts',
      'supabase/.temp/**',
      'playwright-report/**',
      'test-results/**',
      // Fixtures are deliberately broken; tests/actions lint them on purpose.
      'tests/**/fixtures/**',
    ],
  },
  {
    /**
     * src/ui is the owner's design kit, delivered as a unit. Its copy contains
     * ordinary apostrophes ("I've arrived"), which render correctly; the rule
     * is a style preference and the kit is not ours to edit.
     */
    name: 'truckmates/design-kit-is-owner-owned',
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    // Request-handling code: this is where a bypass of RLS would be a breach.
    // scripts/ and tests/ are excluded on purpose (the seed script and the RLS
    // tests have to create two companies); tests/actions pins that boundary
    // down with an allowlist instead.
    name: 'truckmates/no-service-role-outside-worker',
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', noWorkerImports],
    },
  },
  {
    name: 'truckmates/domain-is-pure',
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...noWorkerImports.patterns,
            {
              group: ['@/server/*', '@/server', '@/driver/*', '@/ui/*', 'next/*', 'next'],
              message:
                'src/domain holds pure functions only: no database, network or framework imports.',
            },
            {
              group: ['@supabase/*'],
              message: 'src/domain holds pure functions only: no database access.',
            },
          ],
        },
      ],
      // "No clock" — a pay period or a late check takes the time as an argument,
      // so the same inputs always produce the same numbers in a test.
      // `new Date(iso)` is fine: parsing a value is pure. Reading the clock is
      // not, and neither is the network.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'src/domain holds pure functions only: no network.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'src/domain takes the current time as an argument instead of reading the clock.',
        },
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message: 'src/domain takes the current time as an argument instead of reading the clock.',
        },
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'src/domain must be deterministic: pass ids in instead of generating them.',
        },
      ],
    },
  },
  {
    name: 'truckmates/actions-are-thin',
    files: ['src/server/actions/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...noWorkerImports.patterns,
            {
              group: ['@/server/db', '@/server/db/*'],
              message:
                'Actions parse input and call one service. Database access belongs in src/server/services.',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'truckmates/worker-stands-alone',
    files: ['worker/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@app/*', 'next', 'next/*', 'react', 'react-dom'],
              message: 'worker/ is a plain Node process: it shares src/domain, not the web app.',
            },
          ],
        },
      ],
    },
  },
];

export default config;
