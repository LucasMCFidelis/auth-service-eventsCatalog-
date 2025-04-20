/// <reference types="cypress" />
import { faker } from "@faker-js/faker";

describe("Autenticação - Login", () => {
  const userServiceUrl = Cypress.env("USER_SERVICE_URL")
  const userEmail = faker.internet.email();
  const password = "Teste!@eee1111";

  before(() => {
    cy.api({
      method: "POST",
      url: `${userServiceUrl}/users`,
      body: {
        firstName: faker.person.firstName(),
        lastName: faker.person.middleName() + faker.person.lastName(),
        email: userEmail,
        password: password,
      },
    }).then((res) => {
      expect(res.status).to.eq(201);
    });
  });

  it("com credenciais válidas - Deve retornar 200", () => {
    cy.api({
      method: "POST",
      url: "/login",
      body: {
        userEmail,
        passwordProvided: password,
      },
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property("userToken");
      Cypress.env("testUserToken", res.body.userToken);
    });
  });

  it("com senha incorreta - Deve retornar 401", () => {
    cy.api({
      method: "POST",
      url: "/login",
      body: {
        userEmail,
        passwordProvided: "senhaErrada123",
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body.message.toLowerCase()).to.include(
        "credenciais inválidas"
      );
    });
  });

  it("com e-mail em branco - Deve retornar 400", () => {
    cy.api({
      method: "POST",
      url: "/login",
      body: {
        userEmail: "",
        passwordProvided: password,
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.message.toLowerCase()).to.include(
        "email não pode estar vazio"
      );
    });
  });

  it("quando o body não incluir email - Deve retornar 400", () => {
    cy.api({
      method: "POST",
      url: "/login",
      body: {
        passwordProvided: password,
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.message.toLowerCase()).to.include("email é obrigatório");
    });
  });

  it("quando o body não incluir senha - Deve retornar 400", () => {
    cy.api({
      method: "POST",
      url: "/login",
      body: {
        userEmail: userEmail,
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.message.toLowerCase()).to.include("senha é obrigatória");
    });
  });

  it("quando o body incluir campo não esperado - Deve retornar 400", () => {
    cy.api({
      method: "POST",
      url: "/login",
      body: {
        userEmail: userEmail,
        passwordProvided: password,
        admin: true,
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.message.toLowerCase()).to.include("is not allowed");
    });
  });
});
