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
  // Eksplicit cookie-hærdning (issue A14). I production sættes secure=true så
  // session-cookien kun sendes over HTTPS. I dev tillades plain HTTP fordi vi
  // kører på localhost.
  isProduction: boolean;
};

export function createAuthService(options: AuthOptions): AuthService {
  const auth = betterAuth({
    appName: options.appName,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins,
    secret: options.secret,
    database: options.pool,
    // Issue A14: Eksplicit cookie-hærdning mod CSRF + MITM.
    //
    // - httpOnly: JS i browseren må aldrig læse session-cookien (XSS-mitigation).
    // - secure: i production sendes cookien kun over HTTPS. I dev tillader vi
    //   plain HTTP fordi vi kører bag localhost uden TLS-terminator.
    // - sameSite="lax": blokerer cross-site form-POST, men tillader top-level
    //   navigation (fx OAuth-callback). "strict" ville bryde OAuth-flows hvis vi
    //   senere tilføjer dem, så vi vælger lax bevidst.
    //
    // useSecureCookies gør det samme som secure-flag på defaults, men vi sætter
    // det eksplicit på defaultCookieAttributes for at gøre intentionen synlig.
    advanced: {
      useSecureCookies: options.isProduction,
      defaultCookieAttributes: {
        httpOnly: true,
        secure: options.isProduction,
        sameSite: "lax"
      }
    },
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
          },
          after: async (user) => {
            // Mens MitID ikke er klart, sættes nye brugere til 'verified' med
            // en 'temporary'-markering. Når MitID-flow er på plads, kan vi
            // kræve at temporary-brugere uploader rigtig ID for at fortsætte.
            const userId = typeof user.id === "string" ? user.id : null;
            if (!userId) return;
            await options.pool.query(
              `UPDATE "user"
               SET verification_status = 'verified',
                   verified_at = COALESCE(verified_at, NOW()),
                   verified_via = COALESCE(verified_via, 'temporary'),
                   "updatedAt" = NOW()
               WHERE id = $1 AND verification_status <> 'verified'`,
              [userId]
            );
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
