import type { Pool } from "pg";
import type {
  CoupleInvitation,
  CoupleInvitationInsert,
  CoupleInvitationWithUsers,
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
import type { UploadStore } from "./uploads";

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
  u.verified_via,
  u.future_verification_accepted_at,
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

// Prefiks-version af VERIFICATION_FIELDS til JOINs hvor "user".id
// ellers ville give "ambiguous column"-fejl (issue A6).
const VERIFICATION_FIELDS_PREFIXED = `
  v.id,
  v.user_id,
  v.id_document_path,
  v.selfie_path,
  v.status,
  v.submitted_at,
  v.reviewed_at,
  v.reviewed_by_admin_id,
  v.notes,
  v.rejection_reason
`;

const COUPLE_INVITATION_FIELDS = `
  id,
  primary_user_id,
  partner_user_id,
  display_name,
  bio,
  region,
  open_to_singles,
  accepts_mixed_events,
  status,
  expires_at,
  created_at,
  responded_at
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
    verified_via: (row.verified_via as MembershipProfile["verified_via"]) ?? null,
    future_verification_accepted_at:
      (row.future_verification_accepted_at as Date | null) ?? null,
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

function rowToInvitation(row: Record<string, unknown>): CoupleInvitation {
  return {
    id: String(row.id),
    primary_user_id: String(row.primary_user_id),
    partner_user_id: String(row.partner_user_id),
    display_name: String(row.display_name),
    bio: (row.bio as string | null) ?? null,
    region: (row.region as string | null) ?? null,
    open_to_singles: Boolean(row.open_to_singles),
    accepts_mixed_events: Boolean(row.accepts_mixed_events),
    status: row.status as CoupleInvitation["status"],
    expires_at: row.expires_at as Date,
    created_at: row.created_at as Date,
    responded_at: (row.responded_at as Date | null) ?? null
  };
}

function rowToInvitationWithUsers(
  row: Record<string, unknown>
): CoupleInvitationWithUsers {
  return {
    ...rowToInvitation(row),
    primary_email: String(row.primary_email),
    primary_display_name: (row.primary_display_name as string | null) ?? null,
    partner_email: String(row.partner_email),
    partner_display_name: (row.partner_display_name as string | null) ?? null
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
  // uploadStore er optional så test-doubles og legacy-kald uden upload-store
  // stadig kan instantiere repoet. Når den er sat, bruges den til at fjerne
  // billeder fra disk ved hardDelete (issue A10 — GDPR-konform anonymisering).
  constructor(
    private readonly pool: Pool,
    private readonly uploadStore?: UploadStore
  ) {}

  async getProfile(userId: string): Promise<MembershipProfile | null> {
    const result = await this.pool.query(
      `SELECT ${PROFILE_FIELDS} FROM "user" u WHERE u.id = $1 AND u.deleted_at IS NULL LIMIT 1`,
      [userId]
    );
    return result.rows[0] ? rowToProfile(result.rows[0]) : null;
  }

  async getProfileIncludingDeleted(userId: string): Promise<MembershipProfile | null> {
    // Bypasser deleted_at-filteret. Bruges når vi har brug for at vise
    // afsenderens anonymiserede display_name ("[Slettet bruger]") i en
    // samtale eller event-tråd uden at lække andre detaljer (issue A10).
    const result = await this.pool.query(
      `SELECT ${PROFILE_FIELDS} FROM "user" u WHERE u.id = $1 LIMIT 1`,
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
    // Soft delete = skjul profil, men bevar data så brugeren teoretisk kan
    // gendannes manuelt. Vi rydder dog op i ting der har bivirkninger for
    // andre brugere (issue C9 + bonus: subscriptions, interest_signal,
    // couple_profile).
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // 1) Markér user som slettet + sat på pause.
      await client.query(
        `UPDATE "user"
           SET deleted_at = NOW(),
               paused_at = COALESCE(paused_at, NOW()),
               "updatedAt" = NOW()
         WHERE id = $1`,
        [userId]
      );

      // 2) Annullér aktive subscriptions ved periodens slut, så brugeren
      //    ikke bliver opkrævet igen efter sletning.
      await client.query(
        `UPDATE subscription
           SET cancel_at_period_end = true,
               cancelled_at = COALESCE(cancelled_at, NOW()),
               updated_at = NOW()
         WHERE user_id = $1
           AND status IN ('active', 'trialing', 'past_due')`,
        [userId]
      );

      // 3) Sæt couple_profile på pause hvor brugeren er medlem — partneren
      //    skal selv beslutte om paret skal opløses helt.
      await client.query(
        `UPDATE couple_profile
           SET paused_at = COALESCE(paused_at, NOW()),
               updated_at = NOW()
         WHERE (primary_user_id = $1 OR partner_user_id = $1)
           AND deleted_at IS NULL`,
        [userId]
      );

      // 4) Træk alle aktive interest-signaler tilbage.
      await client.query(
        `UPDATE interest_signal SET withdrawn_at = NOW()
         WHERE from_user_id = $1 AND withdrawn_at IS NULL`,
        [userId]
      );

      // 5) Annullér pending par-invitationer udsendt af brugeren.
      await client.query(
        `UPDATE couple_invitation
           SET status = 'cancelled', responded_at = NOW()
         WHERE primary_user_id = $1 AND status = 'pending'`,
        [userId]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async hardDelete(userId: string): Promise<void> {
    // GDPR-konform anonymisering (issue A10):
    // - Vi sletter IKKE user-rækken, fordi messages/event_post/conversation
    //   har FK'er til "user".id med ON DELETE CASCADE. Det ville fjerne
    //   beskeder hos andre brugere og ødelægge deres chat-historik.
    // - I stedet anonymiserer vi user-rækken, fjerner persondata, sletter
    //   fysiske filer (billeder + ID-dokumenter), opløser par, og rydder
    //   pending invitations.
    // - Alt sker i én transaktion. Hvis noget fejler, rulles tilbage så
    //   brugeren ikke ender i en halv-slettet tilstand.

    // Hent storage_paths for billeder + verification-uploads INDEN
    // transaktionen, så vi kun fjerner filer hvis DB-arbejdet lykkes.
    const photoPaths = await this.pool.query<{ storage_path: string }>(
      `SELECT storage_path FROM profile_photo WHERE owner_user_id = $1`,
      [userId]
    );
    const verificationPaths = await this.pool.query<{
      id_document_path: string;
      selfie_path: string;
    }>(
      `SELECT id_document_path, selfie_path FROM verification_submission WHERE user_id = $1`,
      [userId]
    );

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // 1) Annullér aktive subscriptions.
      await client.query(
        `UPDATE subscription
           SET cancel_at_period_end = true,
               cancelled_at = COALESCE(cancelled_at, NOW()),
               status = CASE WHEN status IN ('active', 'trialing', 'past_due') THEN 'cancelled' ELSE status END,
               updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      // 2) Træk alle aktive interest-signaler tilbage (issue C9-bonus).
      await client.query(
        `UPDATE interest_signal SET withdrawn_at = NOW()
         WHERE from_user_id = $1 AND withdrawn_at IS NULL`,
        [userId]
      );

      // 3) Opløs aktive par hvor user er primary eller partner (issue C9).
      //    Vi soft-deleter couple_profile-rækker så partneren stadig kan se
      //    "[Slettet bruger]"-historikken hvis ønsket.
      await client.query(
        `UPDATE couple_profile
           SET deleted_at = NOW(), updated_at = NOW()
         WHERE (primary_user_id = $1 OR partner_user_id = $1)
           AND deleted_at IS NULL`,
        [userId]
      );

      // 4) Ryd pending par-invitationer involverende user (begge retninger).
      await client.query(
        `UPDATE couple_invitation
           SET status = 'cancelled', responded_at = NOW()
         WHERE (primary_user_id = $1 OR partner_user_id = $1)
           AND status = 'pending'`,
        [userId]
      );

      // 5) Revoke alle private album grants givet af brugeren.
      await client.query(
        `UPDATE private_album_grant SET revoked_at = NOW()
         WHERE owner_user_id = $1 AND revoked_at IS NULL`,
        [userId]
      );

      // 6) Slet alle profile_photo-rækker for brugeren (filer slettes
      //    bagefter når transaktionen er committet).
      await client.query(
        `DELETE FROM profile_photo WHERE owner_user_id = $1`,
        [userId]
      );

      // 7) Markér eksisterende verification-submissions som rejected og
      //    nulstil persondata-felter (path til ID + selfie ryddes; filerne
      //    slettes bagefter).
      await client.query(
        `UPDATE verification_submission
           SET status = 'rejected',
               reviewed_at = COALESCE(reviewed_at, NOW()),
               rejection_reason = COALESCE(rejection_reason, 'Konto slettet af bruger'),
               notes = NULL,
               id_document_path = '',
               selfie_path = ''
         WHERE user_id = $1`,
        [userId]
      );

      // 8) Anonymisér user-rækken. Email får en unik dummy-værdi for at
      //    undgå UNIQUE-constraint-konflikter ved eventuel ny oprettelse.
      //    name-feltet er Better Auth's krav (NOT NULL) — vi sætter dummy.
      await client.query(
        `UPDATE "user"
           SET email = 'deleted-' || id || '@deleted.findgloed.dk',
               name = '[Slettet bruger]',
               display_name = '[Slettet bruger]',
               birth_year = NULL,
               region = NULL,
               bio = NULL,
               initiator_role = NULL,
               verification_status = 'unverified',
               verified_at = NULL,
               verified_via = NULL,
               future_verification_accepted_at = NULL,
               image = NULL,
               "emailVerified" = false,
               deleted_at = NOW(),
               paused_at = COALESCE(paused_at, NOW()),
               "updatedAt" = NOW()
         WHERE id = $1`,
        [userId]
      );

      // 9) Invalidér alle aktive sessions for den slettede bruger.
      await client.query(
        `DELETE FROM "session" WHERE "userId" = $1`,
        [userId]
      );

      // 10) Fjern OAuth/password-accounts (Better Auth) — credentials skal
      //     væk.
      await client.query(
        `DELETE FROM "account" WHERE "userId" = $1`,
        [userId]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    // 11) Slet de fysiske filer fra disk EFTER commit. Hvis vi gjorde dette
    //     før commit og DB-rollback skete, ville filerne være væk men
    //     ikke-anonymiseret bruger blive bevaret. Hvis disk-sletning fejler
    //     her, har vi i værste fald uoprydet diskplads — ikke et GDPR-brud,
    //     fordi DB ikke længere refererer til filerne.
    if (this.uploadStore) {
      for (const row of photoPaths.rows) {
        try {
          await this.uploadStore.delete(row.storage_path);
        } catch (error) {
          console.error("Failed to delete profile photo from disk", error);
        }
      }
      for (const row of verificationPaths.rows) {
        if (row.id_document_path) {
          try {
            await this.uploadStore.delete(row.id_document_path);
          } catch (error) {
            console.error("Failed to delete ID document from disk", error);
          }
        }
        if (row.selfie_path) {
          try {
            await this.uploadStore.delete(row.selfie_path);
          } catch (error) {
            console.error("Failed to delete selfie from disk", error);
          }
        }
      }
    }
  }

  async listVerifiedMembers(excludeUserId: string): Promise<MembershipProfile[]> {
    // Issue A7: kun brugere der har gennemført onboarding må optræde i /members.
    // Nye signups bliver auto-verified (verified_via='temporary') via auth-hook
    // før de har valgt rolle/photo, og må ikke være synlige som ghost-medlemmer.
    const result = await this.pool.query(
      `SELECT ${PROFILE_FIELDS}
       FROM "user" u
       WHERE u.verification_status = 'verified'
         AND u.onboarded_at IS NOT NULL
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
    // Issue A7: skjul ghost-profiler (ikke færdig-onboardede) for andre.
    if (profile.onboarded_at === null && userId !== viewerId) {
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

  async createCoupleInvitation(input: CoupleInvitationInsert): Promise<CoupleInvitation> {
    const result = await this.pool.query(
      `INSERT INTO couple_invitation (
         primary_user_id, partner_user_id, display_name, bio, region,
         open_to_singles, accepts_mixed_events, expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${COUPLE_INVITATION_FIELDS}`,
      [
        input.primary_user_id,
        input.partner_user_id,
        input.display_name,
        input.bio,
        input.region,
        input.open_to_singles,
        input.accepts_mixed_events,
        input.expires_at
      ]
    );
    return rowToInvitation(result.rows[0]);
  }

  async getCoupleInvitationById(id: string): Promise<CoupleInvitation | null> {
    const result = await this.pool.query(
      `SELECT ${COUPLE_INVITATION_FIELDS} FROM couple_invitation WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ? rowToInvitation(result.rows[0]) : null;
  }

  async listIncomingCoupleInvitations(
    userId: string
  ): Promise<CoupleInvitationWithUsers[]> {
    // Auto-udløb af inviteringer hvis tidsfristen er overskredet — så vi
    // ikke ender med pending-rækker der i praksis er døde.
    await this.pool.query(
      `UPDATE couple_invitation
         SET status = 'expired', responded_at = NOW()
       WHERE status = 'pending' AND expires_at < NOW()`
    );
    const result = await this.pool.query(
      `SELECT ci.id, ci.primary_user_id, ci.partner_user_id, ci.display_name,
              ci.bio, ci.region, ci.open_to_singles, ci.accepts_mixed_events,
              ci.status, ci.expires_at, ci.created_at, ci.responded_at,
              p.email AS primary_email, p.display_name AS primary_display_name,
              q.email AS partner_email, q.display_name AS partner_display_name
       FROM couple_invitation ci
       JOIN "user" p ON p.id = ci.primary_user_id
       JOIN "user" q ON q.id = ci.partner_user_id
       WHERE ci.partner_user_id = $1 AND ci.status = 'pending'
       ORDER BY ci.created_at DESC`,
      [userId]
    );
    return result.rows.map(rowToInvitationWithUsers);
  }

  async listOutgoingCoupleInvitations(
    userId: string
  ): Promise<CoupleInvitationWithUsers[]> {
    await this.pool.query(
      `UPDATE couple_invitation
         SET status = 'expired', responded_at = NOW()
       WHERE status = 'pending' AND expires_at < NOW()`
    );
    const result = await this.pool.query(
      `SELECT ci.id, ci.primary_user_id, ci.partner_user_id, ci.display_name,
              ci.bio, ci.region, ci.open_to_singles, ci.accepts_mixed_events,
              ci.status, ci.expires_at, ci.created_at, ci.responded_at,
              p.email AS primary_email, p.display_name AS primary_display_name,
              q.email AS partner_email, q.display_name AS partner_display_name
       FROM couple_invitation ci
       JOIN "user" p ON p.id = ci.primary_user_id
       JOIN "user" q ON q.id = ci.partner_user_id
       WHERE ci.primary_user_id = $1 AND ci.status = 'pending'
       ORDER BY ci.created_at DESC`,
      [userId]
    );
    return result.rows.map(rowToInvitationWithUsers);
  }

  async acceptCoupleInvitation(
    id: string,
    partnerUserId: string
  ): Promise<{ invitation: CoupleInvitation; couple: CoupleProfile } | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const invitationResult = await client.query(
        `UPDATE couple_invitation
           SET status = 'accepted', responded_at = NOW()
         WHERE id = $1
           AND partner_user_id = $2
           AND status = 'pending'
           AND expires_at >= NOW()
         RETURNING ${COUPLE_INVITATION_FIELDS}`,
        [id, partnerUserId]
      );
      if (invitationResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }
      const invitation = rowToInvitation(invitationResult.rows[0]);

      // Sørg for at ingen af parterne allerede er i en aktiv couple_profile.
      // Hvis så, ruller vi tilbage så invitationen forbliver pending og ikke
      // forbruges. (Pending-tilstand bevares så brugeren kan se den og evt.
      // declined manuelt — accept er blokeret indtil eksisterende par er væk.)
      const existing = await client.query(
        `SELECT 1 FROM couple_profile
         WHERE (primary_user_id IN ($1, $2) OR partner_user_id IN ($1, $2))
           AND deleted_at IS NULL
         LIMIT 1`,
        [invitation.primary_user_id, invitation.partner_user_id]
      );
      if ((existing.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        return null;
      }

      const coupleResult = await client.query(
        `INSERT INTO couple_profile (
           primary_user_id, partner_user_id, display_name, bio, region,
           open_to_singles, accepts_mixed_events
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${COUPLE_FIELDS}`,
        [
          invitation.primary_user_id,
          invitation.partner_user_id,
          invitation.display_name,
          invitation.bio,
          invitation.region,
          invitation.open_to_singles,
          invitation.accepts_mixed_events
        ]
      );
      const couple = rowToCouple(coupleResult.rows[0]);

      await client.query("COMMIT");
      return { invitation, couple };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async declineCoupleInvitation(
    id: string,
    partnerUserId: string
  ): Promise<CoupleInvitation | null> {
    const result = await this.pool.query(
      `UPDATE couple_invitation
         SET status = 'declined', responded_at = NOW()
       WHERE id = $1 AND partner_user_id = $2 AND status = 'pending'
       RETURNING ${COUPLE_INVITATION_FIELDS}`,
      [id, partnerUserId]
    );
    return result.rows[0] ? rowToInvitation(result.rows[0]) : null;
  }

  async cancelCoupleInvitation(
    id: string,
    primaryUserId: string
  ): Promise<CoupleInvitation | null> {
    const result = await this.pool.query(
      `UPDATE couple_invitation
         SET status = 'cancelled', responded_at = NOW()
       WHERE id = $1 AND primary_user_id = $2 AND status = 'pending'
       RETURNING ${COUPLE_INVITATION_FIELDS}`,
      [id, primaryUserId]
    );
    return result.rows[0] ? rowToInvitation(result.rows[0]) : null;
  }

  async hasPendingInvitationBetween(
    primaryUserId: string,
    partnerUserId: string
  ): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM couple_invitation
       WHERE primary_user_id = $1 AND partner_user_id = $2 AND status = 'pending'
       LIMIT 1`,
      [primaryUserId, partnerUserId]
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
    // Brugeren erkender at de skal gennemgå rigtig MitID-verificering når
    // systemet er klart. Selve verifikations-status er allerede sat til
    // 'verified' med 'temporary' via signup-hook'en (auth.ts), så det her
    // tracker bare samtykket — så vi senere kan minde dem om kravet.
    await this.pool.query(
      `UPDATE "user"
       SET future_verification_accepted_at = COALESCE(future_verification_accepted_at, NOW()),
           verification_status = 'verified',
           verified_at = COALESCE(verified_at, NOW()),
           verified_via = COALESCE(verified_via, 'temporary'),
           "updatedAt" = NOW()
       WHERE id = $1`,
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

      // Issue A23: Hvis brugeren allerede er 'verified' (typisk via
      // 'temporary'-markeringen fra signup-hook'en), bevarer vi den status
      // mens admin behandler den nye indsendelse — så de stadig kan bruge
      // platformen indtil afvisning. Kun ikke-verified-brugere flyttes til
      // 'pending' her.
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
    // Bruger PREFIXED-version pga. ambiguous "id"-kolonne mellem
    // verification_submission og "user" (issue A6).
    const result = await this.pool.query(
      `SELECT ${VERIFICATION_FIELDS_PREFIXED}, u.email AS email
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
      // Issue A23: Ved afvisning nedgraderer vi brugeren uanset gammel status.
      // Temporary-verified brugere (status='verified', verified_via='temporary')
      // skal også nedgraderes til 'rejected' når deres rigtige ID-indsendelse
      // afvises — ellers forbliver de verified på platformen efter afslag.
      // Vi rydder også verified_via og verified_at så vi ikke har inkonsistens.
      await client.query(
        `UPDATE "user"
           SET verification_status = 'rejected',
               verified_via = NULL,
               verified_at = NULL,
               "updatedAt" = NOW()
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
}
