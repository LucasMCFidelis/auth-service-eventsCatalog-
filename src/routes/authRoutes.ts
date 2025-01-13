import { FastifyInstance } from "fastify";
import { loginUserRoute } from "../controllers/authController.js";

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/login", loginUserRoute);
  // fastify.post("/validate-token", va);
}
