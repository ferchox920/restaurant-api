import Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  JWT_SECRET: Joi.string().min(1).required(),
  JWT_EXPIRES_IN: Joi.string().min(1).required(),
  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').required(),
  CORS_ENABLED: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  CORS_ORIGIN: Joi.string()
    .pattern(/^(\*|[^,\s]+(\s*,\s*[^,\s]+)*)?$/)
    .allow('')
    .optional(),
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
