import { resolveCorsOrigins, validateProductionCors } from './main';

describe('main bootstrap helpers', () => {
  it('allows any origin when CORS origin is empty', () => {
    expect(resolveCorsOrigins(undefined)).toBe(true);
    expect(resolveCorsOrigins('')).toBe(true);
  });

  it('parses CSV origins', () => {
    expect(
      resolveCorsOrigins('http://localhost:3000, https://admin.example.com'),
    ).toEqual(['http://localhost:3000', 'https://admin.example.com']);
  });

  it('rejects wildcard CORS in production when enabled', () => {
    expect(() =>
      validateProductionCors('production', true, '*'),
    ).toThrow(
      'CORS_ORIGIN must be a specific origin when CORS_ENABLED=true in production.',
    );
  });

  it('allows explicit origins in production', () => {
    expect(() =>
      validateProductionCors(
        'production',
        true,
        'https://admin.example.com',
      ),
    ).not.toThrow();
  });
});
