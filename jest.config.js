/**
 * Jest configuration for the pure TypeScript domain layer.
 *
 * The domain layer (src/domain) contains no React Native imports, so we run it
 * with ts-jest in a plain Node environment. This keeps the core business logic
 * (1RM estimation, volume, personal records, progress, AI suggestions) fully
 * unit-testable without a device or the Metro bundler.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/domain', '<rootDir>/src/lib'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};
