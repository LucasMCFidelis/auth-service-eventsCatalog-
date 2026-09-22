# syntax=docker/dockerfile:1.7
# auth-service — Node 20 + TypeScript (tsup)
#
# Premissas conferidas no repositório:
#   - `npm run build` gera dist/server.js e dist/swagger.yaml (tsup + cpy)
#   - `npm run dev` roda tsx --watch (src/server.js resolve para src/server.ts)
#   - Sem banco: não há estágio de migrations/seed.
#
# Modo de execução: quem decide é o SCRIPT do package.json, escolhido pela variável START_SCRIPT:
#   START_SCRIPT=start      -> cross-env NODE_ENV=production  (padrão da imagem)
#   START_SCRIPT=start:dev  -> cross-env NODE_ENV=development (dev/test, contra mocks)
# Atenção: como o cross-env fixa o NODE_ENV dentro do script, um NODE_ENV passado por
# -e / --env-file / compose NÃO tem efeito. Para mudar o modo, mude o START_SCRIPT.
# resolveServiceUrl() lê *_SERVICE_URL_DEV ou *_SERVICE_URL_PROD conforme esse NODE_ENV.

ARG NODE_VERSION=20

# ---------- base ----------
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
ENV PORT=8080 \
    HOST=0.0.0.0

# ---------- deps: todas as dependências ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- dev: src/ montado por volume (hot reload) ----------
FROM deps AS dev
COPY . .
EXPOSE 8080 9229
# Para usar o debugger na 9229, adicione --inspect=0.0.0.0:9229 ao script "dev" do package.json.
CMD ["npm", "run", "dev"]

# ---------- build: compila com tsup (dist/server.js + dist/swagger.yaml) ----------
FROM deps AS build
COPY . .
RUN npm run build

# ---------- prod: só dependências de produção, sem root (deve ser o ÚLTIMO estágio) ----------
FROM base AS prod
# Padrão: `npm run start` (production). O app exige USER_SERVICE_URL_PROD nesse modo.
# Para rodar esta mesma imagem contra mocks: -e START_SCRIPT=start:dev
ENV NODE_ENV=production \
    START_SCRIPT=start
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 8080
# Ajuste o caminho se o auth-service não expuser Swagger em /docs/json; remova se não houver rota pública alguma.
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/docs/json').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "exec npm run \"$START_SCRIPT\""]