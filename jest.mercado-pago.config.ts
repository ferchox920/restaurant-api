import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: 'src/mercado-pago/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverage: true,
  collectCoverageFrom: ['src/mercado-pago/**/*.ts'],
  coverageDirectory: 'coverage/mercado-pago',
  coverageReporters: ['text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 75,
      functions: 95,
      lines: 90,
    },
  },
};

export default config;
