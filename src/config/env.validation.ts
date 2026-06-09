import Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().integer().min(1).max(65535).required(),
  NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  JWT_SECRET: Joi.string().min(1).required(),
  JWT_EXPIRES_IN: Joi.string().min(1).required(),
  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').required(),
});
