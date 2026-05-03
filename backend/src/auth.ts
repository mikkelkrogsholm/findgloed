import { betterAuth } from "better-auth";
import type { Pool } from "pg";
import { isValidEmail, normalizeEmail } from "./validators";
import type { AuthService, WaitlistRepository } from "./types";

export function parseAdminEmails(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((email) => normalizeEmail(email))
      .filter((email) => email.length > 0)
  );
}

export function resolveUserRole(email: string, adminEmails: Set<string>): "admin" | "user" {
  return adminEmails.has(normalizeEmail(email)) ? "admin" : "user";
}

type AuthOptions = {
  pool: Pool;
  leadRepository: WaitlistRepository;
  appName: string;
  baseURL: string;
  trustedOrigins: string[];
  secret: string;
  adminEmails: Set<string>;
};

export function createAuthService(options: AuthOptions): AuthService {
  const auth = betterAuth({
    appName: options.appName,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins,
    secret: options.secret,
    database: options.pool,
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
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const userEmail = typeof user.email === "string" ? user.email : "";
            return {
              data: {
                ...user,
                role: resolveUserRole(userEmail, options.adminEmails)
              }
            };
          }
        }
      }
    }
  });

  return {
    handler: async (request: Request): Promise<Response> => Promise.resolve(auth.handler(request)),
    getSession: async (headers: Headers) => {
      const session = await auth.api.getSession({ headers });
      if (!session) {
        return null;
      }

      return {
        user: {
          id: session.user.id,
          email: session.user.email,
          role: typeof session.user.role === "string" ? session.user.role : null
        },
        session: {
          id: session.session.id,
          userId: session.session.userId,
          expiresAt: session.session.expiresAt
        }
      };
    },
    ensureSuperAdmin: async (emailRaw: string, password: string): Promise<void> => {
      const email = normalizeEmail(emailRaw);
      if (!isValidEmail(email)) {
        throw new Error("SUPERADMIN_EMAIL er ugyldig.");
      }
      if (password.trim().length < 8) {
        throw new Error("SUPERADMIN_PASSWORD skal være mindst 8 tegn.");
      }

      const existingUser = await options.pool.query<{ id: string }>(
        `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
        [email]
      );

      if (existingUser.rowCount && existingUser.rowCount > 0) {
        return;
      }

      await auth.api.signUpEmail({
        body: {
          name: "Superadmin",
          email,
          password
        }
      });
    }
  };
}
