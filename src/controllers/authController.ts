import { FastifyReply, FastifyRequest } from "fastify";
import { authService } from "../services/authService.js";
import { handleError } from "../utils/handleError.js";
import { LoginUser } from "../interfaces/loginUserInterface.js";

export async function loginUserRoute(
  request: FastifyRequest<{ Body: LoginUser }>,
  reply: FastifyReply
) {
  try {
    const userData = await authService.loginUser(request.body);

    // Gerar o token JWT com base nos dados do usuário retornados
    const userToken = request.server.generateToken({
      id: userData.id,
      email: userData.email,
    });

    return reply.status(200).send({ message: "Login bem-sucedido", userToken });
  } catch (error) {
    return handleError(error, reply);
  }
}

export async function verifyTokenRoute(
  request: FastifyRequest<{ Headers: { authorization: string } }>,
  reply: FastifyReply
) {
  try {
    const response = await authService.validateUserToken(
      request.server,
      request.headers.authorization
    );

    return reply.status(200).send(response);
  } catch (error) {
    return handleError(error, reply);
  }
}
