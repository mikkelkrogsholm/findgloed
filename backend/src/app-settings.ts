import type { Pool } from "pg";

// Generisk key-value store for runtime-konfigurerbare globale settings
// (migration 013). Brugt af invite-code-gaten på signup, men designet
// generisk så fremtidige globale settings ikke kræver ny migration.
//
// Værdier gemmes som JSONB så vi kan have booleans, strings, numbers
// og små objekter uden type-konvertering. Repository-typen er parametriseret
// så kalderen håndhæver type-kontrakten pr. nøgle.

export type AppSettingRow = {
  key: string;
  value: unknown;
  updated_at: Date;
  updated_by: string | null;
};

export type AppSettingRepository = {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, updatedBy: string | null): Promise<void>;
  listAll(): Promise<AppSettingRow[]>;
};

export class PostgresAppSettingRepository implements AppSettingRepository {
  constructor(private readonly pool: Pool) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const result = await this.pool.query<{ value: unknown }>(
      `SELECT value FROM app_setting WHERE key = $1`,
      [key]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].value as T;
  }

  async set<T = unknown>(
    key: string,
    value: T,
    updatedBy: string | null
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO app_setting (key, value, updated_at, updated_by)
       VALUES ($1, $2::jsonb, NOW(), $3)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         updated_at = EXCLUDED.updated_at,
         updated_by = EXCLUDED.updated_by`,
      [key, JSON.stringify(value), updatedBy]
    );
  }

  async listAll(): Promise<AppSettingRow[]> {
    const result = await this.pool.query<{
      key: string;
      value: unknown;
      updated_at: Date;
      updated_by: string | null;
    }>(
      `SELECT key, value, updated_at, updated_by
       FROM app_setting
       ORDER BY key ASC`
    );
    return result.rows.map((row) => ({
      key: row.key,
      value: row.value,
      updated_at: row.updated_at,
      updated_by: row.updated_by
    }));
  }
}

// Navngivne nøgler — kalderen bør bruge disse i stedet for at hardcode
// strings, så vi har ét sted at finde alle kendte settings.
export const APP_SETTING_KEYS = {
  signupRequireInviteCode: "signup.require_invite_code",
  signupInviteCode: "signup.invite_code"
} as const;
