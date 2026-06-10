export const AUDIT_DEFAULT_LIMIT = 50;
export const AUDIT_MAX_LIMIT = 100;

export const AUDIT_SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'passwordhash',
  'accesstoken',
  'refreshtoken',
  'token',
  'jwttoken',
  'authorization',
]);
