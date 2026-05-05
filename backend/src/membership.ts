import type { Pool } from "pg";
import type {
  CoupleProfile,
  CoupleUpdate,
  CoupleUpsert,
  MembershipProfile,
  MembershipRepository,
  MembershipUpdate,
  PhotoInsert,
  PhotoVisibility,
  PrivateAlbumGrant,
  ProfilePhoto,
  VerificationInsert,
  VerificationSubmission
} from "./types";

const PROFILE_FIELDS = `
  u.id AS user_id,
  u.email,
  u.display_name,
  u.birth_year,
  u.region,
  u.bio,
  u.initiator_role,
  u.face_visibility,
  u.verification_status,
  u.verified_at,
  u.onboarded_at,
  u.paused_at,
  u.role,
  u."createdAt" AS created_at
`;

const COUPLE_FIELDS = `
  id,
  primary_user_id,
  partner_user_id,
  display_name,
  bio,
  region,
  open_to_singles,
  accepts_mixed_events,
  paused_at,
  created_at
`;

const PHOTO_FIELDS = `
  id,
  owner_user_id,
  owner_couple_id,
  kind,
  visibility,
  storage_path,
  mime_type,
  byte_size,
  position,
  created_at
`;

const GRANT_FIELDS = `
  id,
  owner_user_id,
  owner_couple_id,
  recipient_user_id,
  granted_at,
  revoked_at,
  last_viewed_at,
  view_count
`;

const VERIFICATION_FIELDS = `
  id,
  user_id,
  id_document_path,
  selfie_path,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by_admin_id,
  notes,
  rejection_reason
`;

function rowToProfile(row: Record<string, unknown>): MembershipProfile {
  return {
    user_id: String(row.user_id),
    email: String(row.email),
    display_name: (row.display_name as string | null) ?? null,
    birth_year: (row.birth_year as number | null) ?? null,
    region: (row.region as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    initiator_role: (row.initiator_role as MembershipProfile["initiator_role"]) ?? null,
    face_visibility: row.face_visibility as MembershipProfile["face_visibility"],
    verification_status: row.verification_status as MembershipProfile["verification_status"],
    verified_at: (row.verified_at as Date | null) ?? null,
    onboarded_at: (row.onboarded_at as Date | null) ?? null,
    paused_at: (row.paused_at as Date | null) ?? null,
    role: (row.role as string | null) ?? null,
    created_at: row.created_at as Date
  };
}

function rowToCouple(row: Record<string, unknown>): CoupleProfile {
  return {
    id: String(row.id),
    primary_user_id: String(row.primary_user_id),
    partner_user_id: String(row.partner_user_id),
    display_name: String(row.display_name),
    bio: (row.bio as string | null) ?? null,
    region: (row.region as string | null) ?? null,
    open_to_singles: Boolean(row.open_to_singles),
    accepts_mixed_events: Boolean(row.accepts_mixed_events),
    paused_at: (row.paused_at as Date | null) ?? null,
    created_at: row.created_at as Date
  };
}

function rowToPhoto(row: Record<string, unknown>): ProfilePhoto {
  return {
    id: String(row.id),
    owner_user_id: (row.owner_user_id as string | null) ?? null,
    owner_couple_id: (row.owner_couple_id as string | null) ?? null,
    kind: row.kind as ProfilePhoto["kind"],
    visibility: row.visibility as PhotoVisibility,
    storage_path: String(row.storage_path),
    mime_type: String(row.mime_type),
    byte_size: Number(row.byte_size),
    position: Number(row.position),
    created_at: row.created_at as Date
  };
}

function rowToGrant(row: Record<string, unknown>): PrivateAlbumGrant {
  return {
    id: String(row.id),
    owner_user_id: (row.owner_user_id as string | null) ?? null,
    owner_couple_id: (row.owner_couple_id as string | null) ?? null,
    recipient_user_id: String(row.recipient_user_id),
    granted_at: row.granted_at as Date,
    revoked_at: (row.revoked_at as Date | null) ?? null,
    last_viewed_at: (row.last_viewed_at as Date | null) ?? null,
    view_count: Number(row.view_count)
  };
}

function rowToVerification(row: Record<string, unknown>): VerificationSubmission {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    id_document_path: String(row.id_document_path),
    selfie_path: String(row.selfie_path),
    status: row.status as VerificationSubmission["status"],
    submitted_at: row.submitted_at as Date,
    reviewed_at: (row.reviewed_at as Date | null) ?? null,
    reviewed_by_admin_id: (row.reviewed_by_admin_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    rejection_reason: (row.rejection_reason as string | null) ?? null
  };
}

export class PostgresMembershipRepository implements MembershipRepository {
  constructor(private readonly pool: Pool) {}

  async getProfile(userId: string): Promise<MembershipProfile | null> {
    const result = await this.pool.query(
      `SELECT ${PROFILE_FIELDS} FROM "user" u WHERE u.id = $1 AND u.deleted_at IS NULL LIMIT 1`,
      [userId]
    );
    return result.rows[0] ? rowToProfile(result.rows[0]) : null;
  }

  async updateProfile(userId: string, update: MembershipUpdate): Promise<MembershipProfile | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const setIfDefined = (column: string, value: unknown) => {
      if (value !== undefined) {
        fields.push(`${column} = $${i++}`);
        values.push(value);
      }
    };

    setIfDefined("display_name", update.display_name);
    setIfDefined("birth_year", update.birth_year);
    setIfDefined("region", update.region);
    setIfDefined("bio", update.bio);
    setIfDefined("initiator_role", update.initiator_role);
    setIfDefined("face_visibility", update.face_visibility);
    setIfDefined("onboarded_at", update.onboarded_at);
    setIfDefined("paused_at", update.paused_at);

    if (fields.length === 0) {
      return this.getProfile(userId);
    }

    values.push(userId);
    await this.pool.query(
      `UPDATE "user" SET ${fields.join(", ")}, "updatedAt" = NOW() WHERE id = $${i}`,
      values
    );
    return this.getProfile(userId);
  }

  async softDelete(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE "user" SET deleted_at = NOW(), paused_at = NOW(), "updatedAt" = NOW() WHERE id = $1`,
      [userId]
    );
  }

  async hardDelete(userId: string): Promise<void> {
    await this.pool.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
  }

  async listVerifiedMembers(excludeUserId: string): Promise<MembershipProfile[]> {
    const result = await this.pool.query(
      `SELECT ${PROFILE_FIELDS}
       FROM "user" u
       WHERE u.verification_status = 'verified'
         AND u.deleted_at IS NULL
         AND u.paused_at IS NULL
         AND u.id <> $1
         AND COALESCE(u.role, 'user') = 'user'
       ORDER BY u."createdAt" DESC
       LIMIT 200`,
      [excludeUserId]
    );
    return result.rows.map(rowToProfile);
  }

  async getPublicProfile(userId: string, viewerId: string) {
    const profile = await this.getProfile(userId);
    if (!profile) {
      return null;
    }
    if (profile.paused_at !== null && userId !== viewerId) {
      return null;
    }
    if (profile.verification_status !== "verified" && userId !== viewerId) {
      return null;
    }

    const photos = await this.listPhotos(userId, null);
    const couple = await this.getCoupleByUser(userId);

    let relation: "self" | "verified" | "match" | "private_grant" = "verified";
    if (userId === viewerId) {
      relation = "self";
    } else {
      const grantResult = await this.pool.query(
        `SELECT 1 FROM private_album_grant
         WHERE owner_user_id = $1 AND recipient_user_id = $2 AND revoked_at IS NULL
         LIMIT 1`,
        [userId, viewerId]
      );
      if (grantResult.rowCount && grantResult.rowCount > 0) {
        relation = "private_grant";
      }
    }

    return { profile, photos, couple, relation };
  }

  async createCouple(input: CoupleUpsert): Promise<CoupleProfile> {
    const result = await this.pool.query(
      `INSERT INTO couple_profile (
         primary_user_id, partner_user_id, display_name, bio, region,
         open_to_singles, accepts_mixed_events
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${COUPLE_FIELDS}`,
      [
        input.primary_user_id,
        input.partner_user_id,
        input.display_name,
        input.bio,
        input.region,
        input.open_to_singles,
        input.accepts_mixed_events
      ]
    );
    return rowToCouple(result.rows[0]);
  }

  async updateCouple(id: string, update: CoupleUpdate): Promise<CoupleProfile | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const setIfDefined = (column: string, value: unknown) => {
      if (value !== undefined) {
        fields.push(`${column} = $${i++}`);
        values.push(value);
      }
    };

    setIfDefined("display_name", update.display_name);
    setIfDefined("bio", update.bio);
    setIfDefined("region", update.region);
    setIfDefined("open_to_singles", update.open_to_singles);
    setIfDefined("accepts_mixed_events", update.accepts_mixed_events);
    setIfDefined("paused_at", update.paused_at);

    if (fields.length === 0) {
      const existing = await this.pool.query(
        `SELECT ${COUPLE_FIELDS} FROM couple_profile WHERE id = $1`,
        [id]
      );
      return existing.rows[0] ? rowToCouple(existing.rows[0]) : null;
    }

    values.push(id);
    const result = await this.pool.query(
      `UPDATE couple_profile SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${i} RETURNING ${COUPLE_FIELDS}`,
      values
    );
    return result.rows[0] ? rowToCouple(result.rows[0]) : null;
  }

  async getCoupleByUser(userId: string): Promise<CoupleProfile | null> {
    const result = await this.pool.query(
      `SELECT ${COUPLE_FIELDS} FROM couple_profile
       WHERE (primary_user_id = $1 OR partner_user_id = $1)
         AND deleted_at IS NULL
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] ? rowToCouple(result.rows[0]) : null;
  }

  async deleteCouple(id: string, requestedBy: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE couple_profile SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND (primary_user_id = $2 OR partner_user_id = $2)
         AND deleted_at IS NULL`,
      [id, requestedBy]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async insertPhoto(input: PhotoInsert): Promise<ProfilePhoto> {
    const result = await this.pool.query(
      `INSERT INTO profile_photo (
         owner_user_id, owner_couple_id, kind, visibility, storage_path,
         mime_type, byte_size, position
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${PHOTO_FIELDS}`,
      [
        input.owner_user_id,
        input.owner_couple_id,
        input.kind,
        input.visibility,
        input.storage_path,
        input.mime_type,
        input.byte_size,
        input.position
      ]
    );
    return rowToPhoto(result.rows[0]);
  }

  async listPhotos(
    ownerUserId: string | null,
    ownerCoupleId: string | null
  ): Promise<ProfilePhoto[]> {
    if (ownerUserId) {
      const result = await this.pool.query(
        `SELECT ${PHOTO_FIELDS} FROM profile_photo WHERE owner_user_id = $1 ORDER BY position, created_at`,
        [ownerUserId]
      );
      return result.rows.map(rowToPhoto);
    }
    if (ownerCoupleId) {
      const result = await this.pool.query(
        `SELECT ${PHOTO_FIELDS} FROM profile_photo WHERE owner_couple_id = $1 ORDER BY position, created_at`,
        [ownerCoupleId]
      );
      return result.rows.map(rowToPhoto);
    }
    return [];
  }

  async getPhotoById(id: string): Promise<ProfilePhoto | null> {
    const result = await this.pool.query(
      `SELECT ${PHOTO_FIELDS} FROM profile_photo WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ? rowToPhoto(result.rows[0]) : null;
  }

  async deletePhoto(id: string, requestedBy: string): Promise<ProfilePhoto | null> {
    const result = await this.pool.query(
      `DELETE FROM profile_photo
       WHERE id = $1
         AND (
           owner_user_id = $2
           OR owner_couple_id IN (
             SELECT id FROM couple_profile
             WHERE primary_user_id = $2 OR partner_user_id = $2
           )
         )
       RETURNING ${PHOTO_FIELDS}`,
      [id, requestedBy]
    );
    return result.rows[0] ? rowToPhoto(result.rows[0]) : null;
  }

  async grantPrivateAlbum(
    ownerUserId: string | null,
    ownerCoupleId: string | null,
    recipientUserId: string
  ): Promise<PrivateAlbumGrant> {
    const result = await this.pool.query(
      `INSERT INTO private_album_grant (owner_user_id, owner_couple_id, recipient_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING ${GRANT_FIELDS}`,
      [ownerUserId, ownerCoupleId, recipientUserId]
    );

    if (result.rows[0]) {
      return rowToGrant(result.rows[0]);
    }

    const existing = await this.pool.query(
      `SELECT ${GRANT_FIELDS} FROM private_album_grant
       WHERE recipient_user_id = $3
         AND ((owner_user_id IS NOT NULL AND owner_user_id = $1) OR (owner_couple_id IS NOT NULL AND owner_couple_id = $2))
         AND revoked_at IS NULL
       LIMIT 1`,
      [ownerUserId, ownerCoupleId, recipientUserId]
    );
    return rowToGrant(existing.rows[0]);
  }

  async revokePrivateAlbum(
    ownerUserId: string | null,
    ownerCoupleId: string | null,
    recipientUserId: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE private_album_grant SET revoked_at = NOW()
       WHERE recipient_user_id = $3
         AND ((owner_user_id IS NOT NULL AND owner_user_id = $1) OR (owner_couple_id IS NOT NULL AND owner_couple_id = $2))
         AND revoked_at IS NULL`,
      [ownerUserId, ownerCoupleId, recipientUserId]
    );
  }

  async listPrivateAlbumGrantsForOwner(
    ownerUserId: string | null,
    ownerCoupleId: string | null
  ): Promise<PrivateAlbumGrant[]> {
    const result = await this.pool.query(
      `SELECT ${GRANT_FIELDS} FROM private_album_grant
       WHERE ((owner_user_id IS NOT NULL AND owner_user_id = $1) OR (owner_couple_id IS NOT NULL AND owner_couple_id = $2))
       ORDER BY granted_at DESC`,
      [ownerUserId, ownerCoupleId]
    );
    return result.rows.map(rowToGrant);
  }

  async recordPrivateAlbumView(
    ownerUserId: string | null,
    ownerCoupleId: string | null,
    recipientUserId: string
  ): Promise<PrivateAlbumGrant | null> {
    const result = await this.pool.query(
      `UPDATE private_album_grant
       SET view_count = view_count + 1, last_viewed_at = NOW()
       WHERE recipient_user_id = $3
         AND ((owner_user_id IS NOT NULL AND owner_user_id = $1) OR (owner_couple_id IS NOT NULL AND owner_couple_id = $2))
         AND revoked_at IS NULL
       RETURNING ${GRANT_FIELDS}`,
      [ownerUserId, ownerCoupleId, recipientUserId]
    );
    return result.rows[0] ? rowToGrant(result.rows[0]) : null;
  }

  async acceptFutureVerificationPolicy(userId: string): Promise<MembershipProfile | null> {
    // Mens MitID-flow ikke er klart, accepterer brugeren at gennemgå verificering
    // når det er klart. De får 'verified' status nu og kan bruge platformen,
    // men markeret med en note så vi senere kan kræve rigtig verificering.
    await this.pool.query(
      `UPDATE "user"
       SET verification_status = 'verified',
           verified_at = COALESCE(verified_at, NOW()),
           "updatedAt" = NOW()
       WHERE id = $1 AND verification_status <> 'verified'`,
      [userId]
    );
    return this.getProfile(userId);
  }

  async submitVerification(input: VerificationInsert): Promise<VerificationSubmission> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Markér ældre pending submissions som rejected, så der kun er én aktiv ad gangen.
      await client.query(
        `UPDATE verification_submission SET status = 'rejected', reviewed_at = NOW(),
           rejection_reason = COALESCE(rejection_reason, 'Erstattet af nyere indsendelse')
         WHERE user_id = $1 AND status = 'pending'`,
        [input.user_id]
      );

      const result = await client.query(
        `INSERT INTO verification_submission (user_id, id_document_path, selfie_path)
         VALUES ($1, $2, $3) RETURNING ${VERIFICATION_FIELDS}`,
        [input.user_id, input.id_document_path, input.selfie_path]
      );

      await client.query(
        `UPDATE "user" SET verification_status = 'pending', "updatedAt" = NOW()
         WHERE id = $1 AND verification_status NOT IN ('verified')`,
        [input.user_id]
      );

      await client.query("COMMIT");
      return rowToVerification(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getVerificationById(id: string): Promise<VerificationSubmission | null> {
    const result = await this.pool.query(
      `SELECT ${VERIFICATION_FIELDS} FROM verification_submission WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ? rowToVerification(result.rows[0]) : null;
  }

  async listPendingVerifications(): Promise<Array<VerificationSubmission & { email: string }>> {
    const result = await this.pool.query(
      `SELECT ${VERIFICATION_FIELDS}, u.email AS email
       FROM verification_submission v
       JOIN "user" u ON u.id = v.user_id
       WHERE v.status = 'pending'
       ORDER BY v.submitted_at`
    );
    return result.rows.map((row) => ({ ...rowToVerification(row), email: String(row.email) }));
  }

  async approveVerification(
    id: string,
    adminId: string
  ): Promise<VerificationSubmission | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `UPDATE verification_submission
         SET status = 'approved', reviewed_at = NOW(), reviewed_by_admin_id = $2
         WHERE id = $1 AND status = 'pending'
         RETURNING ${VERIFICATION_FIELDS}`,
        [id, adminId]
      );
      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }
      const submission = rowToVerification(result.rows[0]);
      await client.query(
        `UPDATE "user" SET verification_status = 'verified', verified_at = NOW(), "updatedAt" = NOW()
         WHERE id = $1`,
        [submission.user_id]
      );
      await client.query("COMMIT");
      return submission;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectVerification(
    id: string,
    adminId: string,
    reason: string
  ): Promise<VerificationSubmission | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `UPDATE verification_submission
         SET status = 'rejected', reviewed_at = NOW(), reviewed_by_admin_id = $2, rejection_reason = $3
         WHERE id = $1 AND status = 'pending'
         RETURNING ${VERIFICATION_FIELDS}`,
        [id, adminId, reason]
      );
      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }
      const submission = rowToVerification(result.rows[0]);
      await client.query(
        `UPDATE "user" SET verification_status = 'rejected', "updatedAt" = NOW()
         WHERE id = $1 AND verification_status = 'pending'`,
        [submission.user_id]
      );
      await client.query("COMMIT");
      return submission;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
