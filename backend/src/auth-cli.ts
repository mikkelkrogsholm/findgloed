import { betterAuth } from "better-auth";
import { createPool } from "./db";
import { readConfig } from "./config";

const config = readConfig();

const pool = createPool({
  host: config.dbHost,
  port: config.dbPort,
  user: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  ssl: config.dbSsl,
  sslRejectUnauthorized: config.dbSslRejectUnauthorized
});

export const auth = betterAuth({
  appName: config.appName,
  baseURL: config.apiUrl,
  trustedOrigins: config.corsOrigins,
  secret: config.betterAuthSecret || "dev-only-better-auth-secret-1234567890",
  database: pool,
  emailAndPassword: {
    enabled: true
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false
      }
    }
  }
});
