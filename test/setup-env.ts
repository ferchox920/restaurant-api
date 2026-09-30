// Fictitious, deterministic test configuration; never load a developer .env.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'foundation-test-secret-32-characters';
process.env.JWT_EXPIRES_IN = '1d';
process.env.SWAGGER_ENABLED = 'false';
process.env.ADMIN_EMAIL = 'foundation@example.com';
process.env.ADMIN_PASSWORD = 'Foundation-test-123';
process.env.ADMIN_FIRST_NAME = 'Foundation';
process.env.ADMIN_LAST_NAME = 'Test';
process.env.MERCADO_PAGO_ENABLED = 'false';
process.env.AUTH_COOKIE = 'false';
process.env.AUTH_TOKEN_RESPONSE = 'true';
process.env.OPTIMISTIC_VERSIONING = 'false';
process.env.OPERATIONS_SSE = 'false';
process.env.DATABASE_URL ??=
  'postgresql://unused:unused@127.0.0.1:1/unit_tests';
