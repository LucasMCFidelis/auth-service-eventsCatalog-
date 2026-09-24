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

Toda a orquestração dos testes foi movida para o [`docker-compose.yml`](docker-compose.yml), no profile `test`. A pipeline em si ficou enxuta: ela só gera o segredo e delega tudo ao Compose.

1. Checkout do AuthService (este repo).
2. Gera um `JWT_SECRET` novo a cada execução (`openssl rand -hex 32`) e exporta como variável de ambiente.
3. Sobe o ambiente de teste com `docker compose --profile test up -d --build`, que builda e orquestra três serviços:
   - **`app-test`**: a imagem real do AuthService (mesmo `Dockerfile` de produção, estágio `prod`), rodando com `START_SCRIPT=start:dev` e `MOCK_USER=true`.
   - **`user-service-mock`**: builda a imagem de mock direto do repositório [`collectionTestApiUserService`](https://github.com/LucasMCFidelis/collectionTestApiUserService) (via `docker/mock.Dockerfile` no contexto do repo), publicando-se na rede como `user-service`.
   - **`tests`**: builda a imagem de execução do Newman direto do repositório [`collectionTestApiAuthService`](https://github.com/LucasMCFidelis/collectionTestApiAuthService) (via `docker/tests-runner.Dockerfile`), rodando a collection contra o `app-test` assim que ele fica *healthy* (`healthcheck` na porta `8080`).
4. Ao final, para e remove os containers/volumes (`docker compose --profile test down -v`).
5. Publica o relatório HTML do Newman (`reports/relatorio.html`, montado via volume pelo serviço `tests`) como artifact do GitHub Actions — mesmo em caso de falha.

Não há mais checkout manual dos repositórios de teste nem subida manual de WireMock/Newman na pipeline: o próprio Compose builda cada peça a partir do seu repositório Git (`USER_MOCK_GIT` e `API_TESTS_GIT`, com `#main` como padrão).

### Diagrama do fluxo

```
docker compose --profile test up --build --exit-code-from tests

┌────────────────────────┐   x-mock-scenario   ┌─────────────────────────┐
│  tests (Newman)        │ ───────────────────>│  app-test               │
│  build: repo           │                     │  (AuthService real)     │
│  collectionTestApi-    │ <────────────────── │  MOCK_USER=true         │
│  AuthService           │  200/400/401/404    │  START_SCRIPT=start:dev │
│  depends_on: app-test  │      + JWT          └────────────┬────────────┘
│  (service_healthy)     │                                  │
└────────────────────────┘                                  │ POST /users/validate-credentials
        │                                                   │ (com x-mock-scenario)
        │ volume                                            ▼
        ▼                                        ┌──────────────────────────┐
┌────────────────────┐                           │  user-service-mock       │
│  ./reports/        │                           │  build: repo             │
│  relatorio.html    │                           │  collectionTestApiUser-  │
└────────────────────┘                           │  Service (WireMock)      │
                                                 │  alias: user-service     │
                                                 └──────────────────────────┘
```

### O que a pipeline garante
- Build sem erros.
- Rotas `/auth/login` e `/auth/validate-token` respondendo corretamente.
- Geração/validação de JWT reais (não mockadas).
- Regras de negócio e validação de payload cobrindo: login válido (usuário/admin), e-mail inválido, campos obrigatórios ausentes, usuário não encontrado, senha incorreta, token ausente e token inválido.
- Relatório navegável disponível como artifact, mesmo em caso de falha.

---

## 🚀 Reproduzindo os testes localmente

Esse ambiente é o mesmo usado na CI, orquestrado pelo [`docker-compose.yml`](docker-compose.yml) através do profile `test`. Não é mais necessário clonar os repositórios de teste manualmente nem instalar Newman/WireMock na máquina — o Compose builda tudo (AuthService real, mock do UserService e o runner do Newman) a partir das imagens/contextos definidos no arquivo.

### Pré-requisitos
- Docker + Docker Compose

### 1. Clone este repositório

```bash
git clone https://github.com/LucasMCFidelis/auth-service-eventsCatalog-.git
cd auth-service-eventsCatalog-
```

### 2. Copie o `.env.example` para `.env`
 
```bash
cp .env.example .env
```
 
O Compose lê o `.env` da raiz do projeto automaticamente. Conteúdo esperado (ajuste conforme necessário):
 
```env
# Servidor
PORT=8082
HOST=localhost
 
# JWT
JWT_SECRET=
 
# UserService
USER_SERVICE_URL_DEV=http://localhost:8081
USER_SERVICE_URL_PROD=
 
# Testes / mock
MOCK_USER=true
 
# Caminho para os repositórios de teste (opcional — só para usar versões locais em vez de puxar do GitHub)
USER_MOCK_GIT=../collectionTestApiUserService
API_TESTS_GIT=../collectionTestApiAuthService
```
 
O que é obrigatório preencher:
 
- **`JWT_SECRET`**: **obrigatória**. O AuthService encerra na inicialização se ela não estiver definida. Qualquer string serve como valor para teste.
- **`USER_SERVICE_URL_DEV`**: já vem preenchida no `.env.example` apontando para o mock (`http://localhost:8081`);

O que é opcional:
 
- **`PORT`** / **`HOST`**: usados só se você rodar o serviço fora do Docker (`npm run dev`); para o fluxo com `docker compose --profile test`, a porta exposta é a definida no `docker-compose.yml` (`8082:8080`).
- **`USER_SERVICE_URL_PROD`**: só necessária em produção.
- **`MOCK_USER`**: controla se o header `x-mock-scenario` é repassado ao UserService; mantenha `true` para os testes locais.
- **`USER_MOCK_GIT`** / **`API_TESTS_GIT`**: só precisam ser definidas se você quiser buildar os serviços `user-service-mock`/`tests` a partir de uma pasta local em vez do repositório no GitHub (veja o passo 3).

### 3. Suba o ambiente de teste
 
```bash
docker compose --profile test up --build --exit-code-from tests
```
 
Esse é o **mesmo comando usado na CI**. Ele builda e sobe, na ordem certa:
 
- **`app-test`**: o AuthService real (imagem de produção, `START_SCRIPT=start:dev`, `MOCK_USER=true`), aguardando ficar *healthy*.
- **`user-service-mock`**: buildado direto do repositório [`collectionTestApiUserService`](https://github.com/LucasMCFidelis/collectionTestApiUserService) (`docker/mock.Dockerfile`), exposto na rede interna como `user-service` — os *mappings* de cada cenário (`SUCCESS_VALIDATE_USER`, `SUCCESS_VALIDATE_ADMIN`, credenciais inválidas, usuário não encontrado, etc.) ficam nesse repositório e são acionados pelo header `X-Mock-Scenario`.
- **`tests`**: buildado direto do repositório [`collectionTestApiAuthService`](https://github.com/LucasMCFidelis/collectionTestApiAuthService) (`docker/tests-runner.Dockerfile`), executando a collection com Newman contra o `app-test` assim que ele estiver saudável.
`--exit-code-from tests` faz o comando terminar com o código de saída do container `tests`, refletindo o resultado da collection (útil para checar sucesso/falha localmente).
 
Para usar uma versão local dos repositórios de teste em vez de puxar do GitHub (por exemplo, para testar um mapping ou um caso novo antes de dar push), defina `USER_MOCK_GIT`/`API_TESTS_GIT` no `.env` (passo 2) apontando para as pastas locais, ou passe-as inline:
 
```bash
USER_MOCK_GIT=../collectionTestApiUserService \
API_TESTS_GIT=../collectionTestApiAuthService \
docker compose --profile test up --build --exit-code-from tests
```
 
### 4. Veja o relatório
 
O relatório HTML do Newman é gerado em `./reports/relatorio.html` (montado como volume pelo serviço `tests`) e pode ser aberto direto no navegador.
 
### 5. Encerre e limpe o ambiente
 
```bash
docker compose --profile test down -v
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