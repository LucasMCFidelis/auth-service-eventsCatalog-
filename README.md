# 🔐 auth-service · Catálogo de Eventos

Serviço de autenticação (login e validação de token JWT) do projeto *Catálogo de Eventos*, construído com **Fastify** + **TypeScript**.

---

## 🧩 Estratégia de teste

O AuthService depende de um serviço externo (**UserService**) para validar credenciais. Em vez de testar contra o UserService real, a pipeline sobe o **AuthService de verdade** e mocka apenas essa dependência externa com **WireMock**, garantindo:

- **Isolamento**: falhas do UserService não derrubam o CI do AuthService.
- **Foco no que importa**: o que é validado é o contrato, a lógica de autenticação e a geração/validação real de JWT — não o mock.

Três repositórios sustentam essa estratégia:

| Repositório | Papel |
|---|---|
| **`auth-service-eventsCatalog`** (este repo) | Serviço testado. |
| [`collectionTestApiAuthService`](https://github.com/LucasMCFidelis/collectionTestApiAuthService) | Collection Postman com os casos de teste de login e validação de token. |
| [`collectionTestApiUserService`](https://github.com/LucasMCFidelis/collectionTestApiUserService) | Mappings do WireMock que simulam o UserService por cenário. |

O modo mock só é ativado com `MOCK_USER="true"` + header `x-mock-scenario` na requisição — fora disso, o header é ignorado e a chamada vai para a URL real. Ou seja, não há risco de mock "vazar" para produção.

---

## ⚙️ Pipeline de CI

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — roda em push/PR para `main`/`develop`.

1. Build do AuthService (`npm ci` + `npm run build`) — funciona como smoke test.
2. Checkout dos repositórios de teste (`collectionTestApiAuthService` e `collectionTestApiUserService`).
3. Sobe o **WireMock** (porta `8089`) com os mappings do UserService mockado.
4. Gera um `JWT_SECRET` novo a cada execução (`openssl rand -hex 32`).
5. Sobe o **AuthService real**, com `MOCK_USER=true` e apontando para o WireMock.
6. Executa a collection com **Newman**, usando o `ci.environment.json`.
7. Publica o relatório HTML do Newman como artifact do GitHub Actions.

### Diagrama do fluxo

```
┌─────────────────────┐     x-mock-scenario       ┌───────────────────────┐
│   Newman (Postman)  |─────────────────────────> |  AuthService (real)   │
│  collectionTestApi- │                           │  npm run start:dev    │
│    AuthService      │<───────────────────────── |  MOCK_USER=true       │
└─────────────────────┘   200/400/401/404 + JWT   └──────────┬────────────┘
                                                             │
                                                             │ POST /users/validate-credentials
                                                             │ (com x-mock-scenario)
                                                             ▼
                                                     ┌──────────────────────┐
                                                     │  WireMock (mock do   │
                                                     │  UserService)        │
                                                     │  porta 8089          │
                                                     └──────────────────────┘
```

### O que a pipeline garante
- Build sem erros.
- Rotas `/auth/login` e `/auth/validate-token` respondendo corretamente.
- Geração/validação de JWT reais (não mockadas).
- Regras de negócio e validação de payload cobrindo: login válido (usuário/admin), e-mail inválido, campos obrigatórios ausentes, usuário não encontrado, senha incorreta, token ausente e token inválido.
- Relatório navegável disponível como artifact, mesmo em caso de falha.

---

## 🚀 Reproduzindo os testes localmente

Esse passo a passo sobe o AuthService em **modo de desenvolvimento** (`npm run dev`), apontando para o UserService mockado (WireMock), e roda a collection de testes contra esse ambiente local — usando o environment **`local-mock`**, equivalente ao `ci` mas pensado para execução manual na máquina do desenvolvedor.

### Pré-requisitos
- Node.js e npm
- Docker
- Newman (`npm install -g newman`)

### 1. Clone os três repositórios lado a lado

```bash
git clone https://github.com/LucasMCFidelis/auth-service-eventsCatalog-.git
git clone https://github.com/LucasMCFidelis/collectionTestApiAuthService.git
git clone https://github.com/LucasMCFidelis/collectionTestApiUserService.git
```

Isso cria três pastas irmãs — os comandos abaixo assumem esse layout (ajuste os caminhos se organizar diferente).

### 2. Suba o UserService mockado (WireMock)

```bash
docker run -d --name wiremock-user-service -p 8089:8080 -v "$(pwd)/collectionTestApiUserService/postman/wiremock:/home/wiremock" wiremock/wiremock
```

Isso sobe o WireMock na porta `8089`, servindo os *mappings* de `collectionTestApiUserService/postman/wiremock/mappings` — cada arquivo representa um cenário (`SUCCESS_VALIDATE_USER`, `SUCCESS_VALIDATE_ADMIN`, credenciais inválidas, usuário não encontrado, etc.), acionado pelo header `X-Mock-Scenario` enviado nas requisições de teste.

### 3. Instale as dependências do AuthService

```bash
cd auth-service-eventsCatalog-
npm install
```

### 4. Configure o `.env` para apontar para o mock

```bash
cp .env.example .env
```

No `.env` gerado, ajuste (ou confirme) as seguintes variáveis para que o serviço, em modo dev, use o UserService mockado:

```env
NODE_ENV=development
MOCK_USER=true
USER_SERVICE_URL_DEV=http://localhost:8089
```

`MOCK_USER=true` é o que habilita o AuthService a repassar o header `x-mock-scenario` das requisições de teste para o UserService — sem essa flag, o header é ignorado.

### 5. Suba o AuthService em modo dev

```bash
npm run dev
```

O `npm run dev` sobe o serviço com hot-reload (`tsx --watch`), lendo as variáveis do `.env` via `dotenv`, disponível em `http://localhost:3232`. Deixe esse terminal aberto rodando o serviço.

### 6. Rode a collection com Newman, em outro terminal

```bash
cd collectionTestApiAuthService 
newman run postman/collections/auth-service.postman_collection.json -e postman/environments/local-mock.environment.json
```

O `local-mock.environment.json` já vem configurado com `useMock=true`, `auth_service_url=http://localhost:3232/auth` e `user_service_url=http://localhost:8089/users` — a mesma configuração usada no `ci.environment.json`, mas destinada à execução manual local em vez do pipeline de CI.

### 7. Encerre o ambiente

```bash
# Ctrl+C no terminal do AuthService
docker rm -f wiremock-user-service
```

Detalhes de cada cenário de teste (login e validação de token) estão documentados no README do repositório [`collectionTestApiAuthService`](https://github.com/LucasMCFidelis/collectionTestApiAuthService).

---

## 🔑 Variáveis de ambiente relevantes para os testes

| Variável | Obrigatória | Descrição |
|---|---|---|
| `JWT_SECRET` | ✔️ | Segredo para assinar/verificar tokens JWT. |
| `NODE_ENV` | ✔️ | Define o sufixo de URL usado (`_DEV`/`_PROD`). |
| `USER_SERVICE_URL_DEV` | ✔️ (em CI e em dev com mock) | Aponta para o WireMock em testes. |
| `MOCK_USER` | opcional | `"true"` habilita o repasse do `x-mock-scenario` (só usado em teste/CI/dev com mock). |