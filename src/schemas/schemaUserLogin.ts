import Joi from "joi";

export const schemaUserLogin = Joi.object({
  userEmail: Joi.string().email().required().messages({
    "any.required": "Email é obrigatório",
    "string.base": "Email deve ser uma string",
    "string.email": "Email deve ser um email válido",
    "string.empty": "Email não pode estar vazio",
  }),
  passwordProvided: Joi.string().trim().required().messages({
    "any.required": "Senha é obrigatória",
    "string.base": "Senha deve ser uma string",
    "string.empty": "Senha não pode estar vazia",
  }),
});
