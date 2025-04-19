import { defineConfig } from "cypress";
import dotenvPlugin from "cypress-dotenv";
import { resolveServiceUrl } from "./src/utils/resolveServiceUrl";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      return dotenvPlugin(config);
    },
    baseUrl: resolveServiceUrl("AUTH"),
  },
  reporter: "mochawesome",
  reporterOptions: {
    reportDir: "cypress/reports",
    overwrite: false,
    html: true,
  },
  env: {
    USER_SERVICE_URL: resolveServiceUrl("USER"),
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  },
});
