import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  const baseEnv = {
    PORT: 3000,
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/restaurant_admin',
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '1d',
    SWAGGER_ENABLED: 'true',
    ADMIN_EMAIL: 'admin@example.com',
    ADMIN_PASSWORD: 'DemoAdmin123!',
    ADMIN_FIRST_NAME: 'System',
    ADMIN_LAST_NAME: 'Admin',
  };

  it('accepts valid required variables and defaults CORS_ENABLED', () => {
    const { error, value } = envValidationSchema.validate(baseEnv);

    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.CORS_ENABLED).toBe(false);
  });

  it('defaults PORT to 3000 when it is missing', () => {
    const { error, value } = envValidationSchema.validate({
      ...baseEnv,
      PORT: undefined,
    });

    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
  });

  it('rejects invalid NODE_ENV values', () => {
    const { error } = envValidationSchema.validate({
      ...baseEnv,
      NODE_ENV: 'staging',
    });

    expect(error).toBeDefined();
  });

  it('rejects missing DATABASE_URL', () => {
    const { error } = envValidationSchema.validate({
      ...baseEnv,
      DATABASE_URL: undefined,
    });

    expect(error).toBeDefined();
  });

  it('rejects missing JWT_SECRET', () => {
    const { error } = envValidationSchema.validate({
      ...baseEnv,
      JWT_SECRET: undefined,
    });

    expect(error).toBeDefined();
  });

  it('accepts CSV CORS origins', () => {
    const { error, value } = envValidationSchema.validate({
      ...baseEnv,
      CORS_ENABLED: 'true',
      CORS_ORIGIN: 'http://localhost:3000,https://admin.example.com',
    });

    expect(error).toBeUndefined();
    expect(value.CORS_ENABLED).toBe(true);
    expect(value.CORS_ORIGIN).toBe(
      'http://localhost:3000,https://admin.example.com',
    );
  });

  it('requires a JWT secret of at least 32 characters in production', () => {
    const { error } = envValidationSchema.validate({
      ...baseEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'short-secret',
    });

    expect(error?.message).toContain(
      '"JWT_SECRET" length must be at least 32 characters long',
    );
  });

  it('accepts a strong JWT secret in production', () => {
    const { error } = envValidationSchema.validate({
      ...baseEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'a-secure-production-secret-with-32-characters',
    });

    expect(error).toBeUndefined();
  });

  it('rejects missing JWT_SECRET in production too', () => {
    const { error } = envValidationSchema.validate({
      ...baseEnv,
      NODE_ENV: 'production',
      JWT_SECRET: '',
    });

    expect(error).toBeDefined();
  });
});
