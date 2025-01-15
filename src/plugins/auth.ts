import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { FastifyReply, FastifyRequest } from "fastify";
import { UserTokenInterfaceProps } from "../interfaces/UserTokenInterfaceProps.js";

export default fp(async function (fastify) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error("A variável ambiente JWT_SECRET obrigatoriamente precisa ser definida");
    return;
  }

  // Registro do plugin JWT
  fastify.register(jwt, {
    secret: JWT_SECRET,
    sign: {
      expiresIn: "1h", // Define o tempo padrão de expiração
    },
  });

  // Método para geração de tokens
  fastify.decorate("generateTokenInternal", function (payload: object) {
    return this.jwt.sign(payload);
  });

  // Wrapper para usar UserTokenInterfaceProps diretamente
  fastify.decorate("generateToken", function (payload: UserTokenInterfaceProps) {
    return this.generateTokenInternal(payload);
  });

  // Método para validação de tokens (uso interno)
  fastify.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (error) {
      console.error(error);
      reply.status(401).send({ message: "Token inválido ou não fornecido" });
    }
  });

  // Método para validação de tokens para serviços externos
  fastify.decorate("validateToken", async function (token: string) {
    try {
      const decoded = this.jwt.verify(token);
      if (typeof decoded !== "object" || decoded === null) {
        throw {
          status: 400,
          message: "Token decodificado não é um objeto válido",
          error: "Erro de validação",
        };
      }
      return { valid: true, decoded };
    } catch (error) {
      console.error(error);
      throw { valid: false, message: "Token inválido ou expirado" };
    }
  });
});

// Declaração de tipos para o Fastify
declare module "fastify" {
  interface FastifyInstance {
    generateTokenInternal: (payload: object) => string;
    generateToken: (payload: UserTokenInterfaceProps) => string;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    validateToken: (
      token: string
    ) => Promise<{ valid: boolean; decoded?: object; message?: string }>;
  }
}
