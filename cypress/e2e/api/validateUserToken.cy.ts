/// <reference types="cypress" />

describe("Autenticação - Validação de Token", () => {
  let token: string;

  before(() => {
    // Gera um token real via login
    const email = Cypress.env("ADMIN_EMAIL");
    const password = Cypress.env("ADMIN_PASSWORD");

    cy.api({
      method: "POST",
      url: `/login`,
      body: {
        userEmail: email,
        passwordProvided: password,
      },
    }).then((res) => {
      expect(res.status).to.eq(200);
      token = res.body.userToken;
    });
  });

  it("Deve retornar 200 com token válido", () => {
    cy.api({
      method: "POST",
      url: `/validate-token`,
      headers: {
        Authorization: token,
      },
    }).then((res) => {
      cy.log(JSON.stringify(res.body, null, 2));
      expect(res.status).to.eq(200);
      expect(res.body.decoded).to.have.property("userId");
      expect(res.body.decoded).to.have.property("roleName");
    });
  });

  it("Deve retornar 401 com token inválido", () => {
    cy.api({
      method: "POST",
      url: `/validate-token`,
      headers: {
        Authorization: "Bearer token-invalido",
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body.message.toLowerCase()).to.include("token inválido");
    });
  });

  it("Deve retornar 400 quando o header não for enviado", () => {
    cy.api({
      method: "POST",
      url: `/validate-token`,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.message.toLowerCase()).to.include("token não fornecido");
    });
  });
});
