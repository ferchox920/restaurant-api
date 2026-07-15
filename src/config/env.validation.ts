import Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).max(10).default(0),
  NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  JWT_SECRET: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().min(32),
      otherwise: Joi.string().min(8),
    })
    .required(),
  JWT_EXPIRES_IN: Joi.string().min(1).required(),
  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').required(),
  CORS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  CORS_ORIGIN: Joi.string()
    .pattern(/^(\*|[^,\s]+(\s*,\s*[^,\s]+)*)?$/)
    .allow('')
    .optional(),
  OBSERVABILITY_V1: Joi.boolean().truthy('true').falsy('false').default(false),
  HTTP_COMPRESSION: Joi.boolean().truthy('true').falsy('false').default(false),
  POS_CATALOG_V1: Joi.boolean().truthy('true').falsy('false').default(false),
  STOCK_REPORT_PAGED: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  REPORT_QUERY_V2: Joi.boolean().truthy('true').falsy('false').default(false),
  SALE_TICKET_SUMMARY_LIST: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  OPTIMISTIC_VERSIONING: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  AUTH_COOKIE: Joi.boolean().truthy('true').falsy('false').default(false),
  AUTH_TOKEN_RESPONSE: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(true),
  OPERATIONS_SSE: Joi.boolean().truthy('true').falsy('false').default(false),
  HTTP_TIMEOUT_MS: Joi.number().integer().min(1000).default(10000),
  REPORT_TIMEOUT_MS: Joi.number().integer().min(1000).default(30000),
  CONNECTION_LIMIT: Joi.number().integer().min(1).default(10),
  POOL_TIMEOUT_SECONDS: Joi.number().integer().min(1).default(10),
  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_PASSWORD: Joi.string().min(8).required(),
  ADMIN_FIRST_NAME: Joi.string().min(1).required(),
  ADMIN_LAST_NAME: Joi.string().min(1).required(),
  MANAGER_EMAIL: Joi.string().email().optional().allow(''),
  MANAGER_PASSWORD: Joi.string().min(8).optional().allow(''),
  CASHIER_EMAIL: Joi.string().email().optional().allow(''),
  CASHIER_PASSWORD: Joi.string().min(8).optional().allow(''),
  AUDITOR_EMAIL: Joi.string().email().optional().allow(''),
  AUDITOR_PASSWORD: Joi.string().min(8).optional().allow(''),
});
