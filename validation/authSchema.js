const Joi = require("joi");

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  subscription: Joi.string().insensitive("starter", "pro", "business"),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const emailSchema = Joi.object({ email: Joi.string().email().required() });

module.exports = {
  registerSchema,
  loginSchema,
  emailSchema,
};
