import axios from "axios";
import { LoginUser } from "../interfaces/loginUserInterface.js";
import { FastifyInstance } from "fastify";

async function loginUser(data: LoginUser) {
  const { userEmail, passwordProvided } = data;
  
  // Validação das credenciais via serviço externo
  const response = await axios.post(`${process.env.USER_SERVICE_URL}/validate-credentials`, {
    userEmail,
    passwordProvided,
  });

  if (response.status !== 200) {
    throw {
      status: response.status,
      message: response.data.message
    }
  }
  
  // Retorna os dados do usuário para a rota
  return response.data;
}

async function validateUserToken(
  fastify: FastifyInstance,
  authorizationHeader?: string
) {
  if (!authorizationHeader) {
    throw {
      status: 400,
      message: "Token não fornecido",
      error: "Erro de validação",
    };
  }

  const token = authorizationHeader.replace("Bearer ", "");

  let result;
  try {
    result = await fastify.validateToken(token);

    return { status: 200, message: "Token válido", decoded: result.decoded };
  } catch (error) {
    if (!result?.valid) {
      throw {
        status: 401,
        message: result?.message || "Token inválido ou não fornecido",
        error: "Erro de autenticação",
      };
    }
    throw {
      status: 500,
      message: "Erro ao validar o token",
      error: "Erro de autenticação",
    };
  }
}

export const authService = {
  loginUser,
  validateUserToken,
};
