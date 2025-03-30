import Fastify from "fastify";
import { authRoutes } from "./routes/authRoutes.js";
import authPlugin from "./plugins/auth.js"
import cors from "@fastify/cors";
import dotenv from 'dotenv';
dotenv.config();

const server = Fastify();

// Configurar o CORS
server.register(cors, {
  origin: "*", // Libera totalmente para testes
  methods: ["POST"],
  credentials: true,
});

// Registrar plugin de autenticação
server.register(authPlugin);

// Registrar rotas de autenticação com prefixo
server.register(authRoutes, { prefix: "/auth" });

// Configurar a porta e host
const PORT = Number(process.env.PORT) || 3232;
const HOST = process.env.HOST || "localhost";

server
  .listen({ port: PORT, host: HOST })
  .then(() =>
    console.log(`
        Autenticação service rodando em http://${HOST}:${PORT}`)
  )
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
