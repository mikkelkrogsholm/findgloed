import type { Hono, MiddlewareHandler } from "hono";
import type {
  AuthService,
  CoupleInvitation,
  CoupleInvitationWithUsers,
  CoupleProfile,
  CoupleUpdate,
  FaceVisibility,
  InitiatorRole,
  MembershipProfile,
  MembershipRepository,
  MembershipUpdate,
  PhotoVisibility,
  ProfilePhoto
} from "./types";
import type { UploadStore } from "./uploads";

const COUPLE_INVITATION_TTL_DAYS = 7;

type AuthSessionData = {
  user: { id: string; email: string; role?: string | null };
  session: { id: string; userId: string; expiresAt: Date | string };
};

type MembershipDeps = {
  authService: AuthService;
  membershipRepository: MembershipRepository;
  uploadStore: UploadStore;
};

const INITIATOR_ROLES: InitiatorRole[] = ["inviting", "deciding", "balanced"];
const FACE_VISIBILITIES: FaceVisibility[] = ["after_interest", "all_verified"];
const PHOTO_VISIBILITIES: PhotoVisibility[] = ["verified", "match", "private"];
const PHOTO_KINDS = ["face", "body", "ambient", "private"] as const;

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function profileToJson(profile: MembershipProfile, viewerCanSeeFace: boolean) {
  return {
    user_id: profile.user_id,
    display_name: profile.display_name,
    birth_year: profile.birth_year,
    age: profile.birth_year ? new Date().getFullYear() - profile.birth_year : null,
    region: profile.region,
    bio: profile.bio,
    initiator_role: profile.initiator_role,
    face_visibility: profile.face_visibility,
    verification_status: profile.verification_status,
    onboarded_at: profile.onboarded_at?.toISOString() ?? null,
    paused_at: profile.paused_at?.toISOString() ?? null,
    can_see_face: viewerCanSeeFace
  };
}

function ownProfileToJson(profile: MembershipProfile) {
  return {
    ...profileToJson(profile, true),
    email: profile.email,
    role: profile.role,
    verified_at: profile.verified_at?.toISOString() ?? null,
    verified_via: profile.verified_via,
    future_verification_accepted_at:
      profile.future_verification_accepted_at?.toISOString() ?? null
  };
}

function coupleInvitationToJson(invitation: CoupleInvitation) {
  return {
    id: invitation.id,
    primary_user_id: invitation.primary_user_id,
    partner_user_id: invitation.partner_user_id,
    display_name: invitation.display_name,
    bio: invitation.bio,
    region: invitation.region,
    open_to_singles: invitation.open_to_singles,
    accepts_mixed_events: invitation.accepts_mixed_events,
    status: invitation.status,
    expires_at: invitation.expires_at.toISOString(),
    created_at: invitation.created_at.toISOString(),
    responded_at: invitation.responded_at?.toISOString() ?? null
  };
}

function coupleInvitationWithUsersToJson(invitation: CoupleInvitationWithUsers) {
  return {
    ...coupleInvitationToJson(invitation),
    primary_email: invitation.primary_email,
    primary_display_name: invitation.primary_display_name,
    partner_email: invitation.partner_email,
    partner_display_name: invitation.partner_display_name
  };
}

function coupleToJson(couple: CoupleProfile) {
  return {
    id: couple.id,
    primary_user_id: couple.primary_user_id,
    partner_user_id: couple.partner_user_id,
    display_name: couple.display_name,
    bio: couple.bio,
    region: couple.region,
    open_to_singles: couple.open_to_singles,
    accepts_mixed_events: couple.accepts_mixed_events,
    paused_at: couple.paused_at?.toISOString() ?? null
  };
}

function photoToJson(photo: ProfilePhoto) {
  return {
    id: photo.id,
    kind: photo.kind,
    visibility: photo.visibility,
    storage_path: photo.storage_path,
    url: `/api/members/photo/${photo.id}`,
    mime_type: photo.mime_type,
    byte_size: photo.byte_size,
    position: photo.position
  };
}

function filterPhotosForViewer(
  photos: ProfilePhoto[],
  ownerFaceVisibility: FaceVisibility,
  relation: "self" | "verified" | "match" | "private_grant"
): ProfilePhoto[] {
  return photos.filter((photo) => {
    if (relation === "self") {
      return true;
    }
    if (photo.visibility === "private") {
      return relation === "private_grant";
    }
    if (photo.visibility === "match") {
      return relation === "match" || relation === "private_grant";
    }
    if (photo.visibility === "verified") {
      if (photo.kind === "face" && ownerFaceVisibility === "after_interest") {
        return relation === "match" || relation === "private_grant";
      }
      return true;
    }
    return false;
  });
}

export function registerMembershipRoutes(
  app: Hono<{ Variables: { authSession: AuthSessionData } }>,
  deps: MembershipDeps
): void {
  const { authService, membershipRepository, uploadStore } = deps;

  const memberAuthMiddleware: MiddlewareHandler<{ Variables: { authSession: AuthSessionData } }> =
    async (c, next) => {
      const authSession = await authService.getSession(c.req.raw.headers);
      if (!authSession) {
        return c.json({ ok: false, code: "UNAUTHORIZED", message: "Log ind." }, 401);
      }
      c.set("authSession", authSession);
      await next();
    };

  // Hono's "*" path-matcher kræver enten præcis path eller "/path/*" for subpaths.
  // Vi registrerer derfor både eksakt og wildcard for hver gruppe.
  app.use("/api/me", memberAuthMiddleware);
  app.use("/api/me/*", memberAuthMiddleware);
  app.use("/api/members", memberAuthMiddleware);
  app.use("/api/members/*", memberAuthMiddleware);
  app.use("/api/couples", memberAuthMiddleware);
  app.use("/api/couples/*", memberAuthMiddleware);

  app.get("/api/me", async (c) => {
    const session = c.get("authSession");
    const profile = await membershipRepository.getProfile(session.user.id);
    if (!profile) {
      return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    }
    const couple = await membershipRepository.getCoupleByUser(profile.user_id);
    const photos = await membershipRepository.listPhotos(profile.user_id, null);
    return c.json({
      ok: true,
      profile: ownProfileToJson(profile),
      couple: couple ? coupleToJson(couple) : null,
      photos: photos.map(photoToJson)
    });
  });

  app.patch("/api/me", async (c) => {
    const session = c.get("authSession");
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return c.json({ ok: false, code: "INVALID_BODY" }, 400);
    }

    const update: MembershipUpdate = {};

    if ("display_name" in body) {
      update.display_name = asString(body.display_name);
    }
    if ("region" in body) {
      update.region = asString(body.region);
    }
    if ("bio" in body) {
      update.bio = asString(body.bio);
    }
    if ("birth_year" in body) {
      const year = Number(body.birth_year);
      const currentYear = new Date().getFullYear();
      if (!Number.isInteger(year) || year < 1900 || year > currentYear - 18) {
        return c.json(
          { ok: false, code: "INVALID_BIRTH_YEAR", message: "Du skal være mindst 18 år." },
          422
        );
      }
      update.birth_year = year;
    }
    if ("initiator_role" in body) {
      const role = body.initiator_role;
      if (role !== null && (typeof role !== "string" || !INITIATOR_ROLES.includes(role as InitiatorRole))) {
        return c.json({ ok: false, code: "INVALID_INITIATOR_ROLE" }, 422);
      }
      update.initiator_role = (role as InitiatorRole | null) ?? null;
    }
    if ("face_visibility" in body) {
      const value = body.face_visibility;
      if (typeof value !== "string" || !FACE_VISIBILITIES.includes(value as FaceVisibility)) {
        return c.json({ ok: false, code: "INVALID_FACE_VISIBILITY" }, 422);
      }
      update.face_visibility = value as FaceVisibility;
    }
    if (body.complete_onboarding === true) {
      update.onboarded_at = new Date();
    }
    if ("paused_at" in body) {
      update.paused_at = body.paused_at === null ? null : new Date();
    }

    const profile = await membershipRepository.updateProfile(session.user.id, update);
    if (!profile) {
      return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    }
    return c.json({ ok: true, profile: ownProfileToJson(profile) });
  });

  app.delete("/api/me", async (c) => {
    const session = c.get("authSession");
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const hard = body?.hard_delete === true;
    if (hard) {
      await membershipRepository.hardDelete(session.user.id);
    } else {
      await membershipRepository.softDelete(session.user.id);
    }
    return c.json({ ok: true });
  });

  app.post("/api/me/photos", async (c) => {
    const session = c.get("authSession");
    let formData: FormData;
    try {
      formData = await c.req.formData();
    } catch {
      return c.json({ ok: false, code: "INVALID_MULTIPART" }, 400);
    }

    const file = formData.get("file");
    const kindRaw = formData.get("kind");
    const visibilityRaw = formData.get("visibility");
    const positionRaw = formData.get("position");

    if (!(file instanceof File)) {
      return c.json({ ok: false, code: "FILE_REQUIRED" }, 422);
    }
    const kind = typeof kindRaw === "string" ? kindRaw : "ambient";
    const visibility = typeof visibilityRaw === "string" ? visibilityRaw : "verified";

    if (!PHOTO_KINDS.includes(kind as (typeof PHOTO_KINDS)[number])) {
      return c.json({ ok: false, code: "INVALID_KIND" }, 422);
    }
    if (!PHOTO_VISIBILITIES.includes(visibility as PhotoVisibility)) {
      return c.json({ ok: false, code: "INVALID_VISIBILITY" }, 422);
    }
    if (kind === "private" && visibility !== "private") {
      return c.json({ ok: false, code: "PRIVATE_KIND_REQUIRES_PRIVATE_VISIBILITY" }, 422);
    }

    let upload;
    try {
      upload = await uploadStore.saveImage("profile", session.user.id, file);
    } catch (error) {
      const message = (error as Error).message;
      if (message === "UNSUPPORTED_MIME_TYPE") {
        return c.json({ ok: false, code: "UNSUPPORTED_MIME_TYPE" }, 422);
      }
      if (message === "FILE_TOO_LARGE") {
        return c.json({ ok: false, code: "FILE_TOO_LARGE" }, 413);
      }
      throw error;
    }

    const photo = await membershipRepository.insertPhoto({
      owner_user_id: session.user.id,
      owner_couple_id: null,
      kind: kind as ProfilePhoto["kind"],
      visibility: visibility as PhotoVisibility,
      storage_path: upload.storagePath,
      mime_type: upload.mimeType,
      byte_size: upload.byteSize,
      position: Number(positionRaw ?? 0) || 0
    });

    return c.json({ ok: true, photo: photoToJson(photo) });
  });

  app.delete("/api/me/photos/:id", async (c) => {
    const session = c.get("authSession");
    const id = c.req.param("id");
    const deleted = await membershipRepository.deletePhoto(id, session.user.id);
    if (!deleted) {
      return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    }
    await uploadStore.delete(deleted.storage_path);
    return c.json({ ok: true });
  });

  app.post("/api/me/album-grants", async (c) => {
    const session = c.get("authSession");
    const body = (await c.req.json().catch(() => null)) as { recipient_user_id?: unknown } | null;
    const recipient = asString(body?.recipient_user_id);
    if (!recipient) {
      return c.json({ ok: false, code: "RECIPIENT_REQUIRED" }, 422);
    }
    const grant = await membershipRepository.grantPrivateAlbum(session.user.id, null, recipient);
    return c.json({ ok: true, grant });
  });

  app.delete("/api/me/album-grants/:recipient", async (c) => {
    const session = c.get("authSession");
    const recipient = c.req.param("recipient");
    await membershipRepository.revokePrivateAlbum(session.user.id, null, recipient);
    return c.json({ ok: true });
  });

  app.get("/api/me/album-grants", async (c) => {
    const session = c.get("authSession");
    const grants = await membershipRepository.listPrivateAlbumGrantsForOwner(
      session.user.id,
      null
    );
    return c.json({ ok: true, grants });
  });

  app.post("/api/me/verification/accept-future-policy", async (c) => {
    const session = c.get("authSession");
    const body = (await c.req.json().catch(() => null)) as { accepted?: unknown } | null;
    if (body?.accepted !== true) {
      return c.json({ ok: false, code: "ACCEPT_REQUIRED" }, 422);
    }
    const profile = await membershipRepository.acceptFutureVerificationPolicy(session.user.id);
    if (!profile) {
      return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    }
    return c.json({ ok: true, profile: ownProfileToJson(profile) });
  });

  app.post("/api/me/verification", async (c) => {
    const session = c.get("authSession");
    let formData: FormData;
    try {
      formData = await c.req.formData();
    } catch {
      return c.json({ ok: false, code: "INVALID_MULTIPART" }, 400);
    }

    const idDocument = formData.get("id_document");
    const selfie = formData.get("selfie");

    if (!(idDocument instanceof File) || !(selfie instanceof File)) {
      return c.json({ ok: false, code: "FILES_REQUIRED" }, 422);
    }

    let idDocResult, selfieResult;
    try {
      idDocResult = await uploadStore.saveImage("verification", session.user.id, idDocument);
      selfieResult = await uploadStore.saveImage("verification", session.user.id, selfie);
    } catch (error) {
      const message = (error as Error).message;
      if (message === "UNSUPPORTED_MIME_TYPE") {
        return c.json({ ok: false, code: "UNSUPPORTED_MIME_TYPE" }, 422);
      }
      if (message === "FILE_TOO_LARGE") {
        return c.json({ ok: false, code: "FILE_TOO_LARGE" }, 413);
      }
      throw error;
    }

    const submission = await membershipRepository.submitVerification({
      user_id: session.user.id,
      id_document_path: idDocResult.storagePath,
      selfie_path: selfieResult.storagePath
    });
    return c.json({ ok: true, submission_id: submission.id, status: submission.status });
  });

  // Issue A4: Par oprettes ikke direkte ved POST /api/couples — i stedet
  // sendes en invitation som partneren skal acceptere før couple_profile
  // skabes. Det sikrer at ingen kan "påtvinges" et par.
  app.post("/api/couples", async (c) => {
    const session = c.get("authSession");
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return c.json({ ok: false, code: "INVALID_BODY" }, 400);
    }
    const partnerEmailRaw = asString(body.partner_email);
    const displayName = asString(body.display_name);
    if (!partnerEmailRaw || !displayName) {
      return c.json({ ok: false, code: "MISSING_FIELDS" }, 422);
    }

    const ownProfile = await membershipRepository.getProfile(session.user.id);
    if (!ownProfile) {
      return c.json({ ok: false, code: "PROFILE_NOT_FOUND" }, 404);
    }

    if (partnerEmailRaw.toLowerCase() === ownProfile.email.toLowerCase()) {
      return c.json({ ok: false, code: "CANNOT_INVITE_SELF" }, 422);
    }

    // Du må ikke have et aktivt couple_profile allerede.
    const ownCouple = await membershipRepository.getCoupleByUser(session.user.id);
    if (ownCouple) {
      return c.json({ ok: false, code: "ALREADY_IN_COUPLE" }, 409);
    }

    const partnerByEmail = await membershipRepository
      .listVerifiedMembers(session.user.id)
      .then((members) => members.find((m) => m.email.toLowerCase() === partnerEmailRaw.toLowerCase()));
    if (!partnerByEmail) {
      return c.json({ ok: false, code: "PARTNER_NOT_FOUND_OR_NOT_VERIFIED" }, 404);
    }

    // Hvis partneren allerede er i et par, kan vi ikke invitere.
    const partnerCouple = await membershipRepository.getCoupleByUser(
      partnerByEmail.user_id
    );
    if (partnerCouple) {
      return c.json({ ok: false, code: "PARTNER_ALREADY_IN_COUPLE" }, 409);
    }

    // Hvis en eksisterende pending invitation findes for samme par, brug den
    // som idempotent svar i stedet for at fejle med UNIQUE-violation.
    const existingPending =
      await membershipRepository.hasPendingInvitationBetween(
        session.user.id,
        partnerByEmail.user_id
      );
    if (existingPending) {
      return c.json({ ok: false, code: "INVITATION_ALREADY_PENDING" }, 409);
    }

    const expiresAt = new Date(
      Date.now() + COUPLE_INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    const invitation = await membershipRepository.createCoupleInvitation({
      primary_user_id: session.user.id,
      partner_user_id: partnerByEmail.user_id,
      display_name: displayName,
      bio: asString(body.bio),
      region: asString(body.region),
      open_to_singles: body.open_to_singles === true,
      accepts_mixed_events: body.accepts_mixed_events === true,
      expires_at: expiresAt
    });

    return c.json({ ok: true, invitation: coupleInvitationToJson(invitation) });
  });

  app.get("/api/me/couple-invitations", async (c) => {
    const session = c.get("authSession");
    const [incoming, outgoing] = await Promise.all([
      membershipRepository.listIncomingCoupleInvitations(session.user.id),
      membershipRepository.listOutgoingCoupleInvitations(session.user.id)
    ]);
    return c.json({
      ok: true,
      incoming: incoming.map(coupleInvitationWithUsersToJson),
      outgoing: outgoing.map(coupleInvitationWithUsersToJson)
    });
  });

  app.post("/api/couples/invitations/:id/accept", async (c) => {
    const session = c.get("authSession");
    const id = c.req.param("id");
    const result = await membershipRepository.acceptCoupleInvitation(
      id,
      session.user.id
    );
    if (!result) {
      // Gå nærmere på årsagen for klarere fejlmelding.
      const invitation = await membershipRepository.getCoupleInvitationById(id);
      if (!invitation) {
        return c.json({ ok: false, code: "NOT_FOUND" }, 404);
      }
      if (invitation.partner_user_id !== session.user.id) {
        return c.json({ ok: false, code: "FORBIDDEN" }, 403);
      }
      if (invitation.status !== "pending") {
        return c.json({ ok: false, code: "INVITATION_NOT_PENDING" }, 409);
      }
      if (invitation.expires_at < new Date()) {
        return c.json({ ok: false, code: "INVITATION_EXPIRED" }, 410);
      }
      // Falder typisk her hvis en af parterne nu er i et par.
      return c.json({ ok: false, code: "COUPLE_CONFLICT" }, 409);
    }
    return c.json({
      ok: true,
      invitation: coupleInvitationToJson(result.invitation),
      couple: coupleToJson(result.couple)
    });
  });

  app.post("/api/couples/invitations/:id/decline", async (c) => {
    const session = c.get("authSession");
    const id = c.req.param("id");
    const invitation = await membershipRepository.declineCoupleInvitation(
      id,
      session.user.id
    );
    if (!invitation) {
      return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    }
    return c.json({ ok: true, invitation: coupleInvitationToJson(invitation) });
  });

  app.post("/api/couples/invitations/:id/cancel", async (c) => {
    const session = c.get("authSession");
    const id = c.req.param("id");
    const invitation = await membershipRepository.cancelCoupleInvitation(
      id,
      session.user.id
    );
    if (!invitation) {
      return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    }
    return c.json({ ok: true, invitation: coupleInvitationToJson(invitation) });
  });

  app.patch("/api/couples/:id", async (c) => {
    const session = c.get("authSession");
    const id = c.req.param("id");
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return c.json({ ok: false, code: "INVALID_BODY" }, 400);
    }

    const update: CoupleUpdate = {};
    if ("display_name" in body) {
      const name = asString(body.display_name);
      if (!name) return c.json({ ok: false, code: "INVALID_DISPLAY_NAME" }, 422);
      update.display_name = name;
    }
    if ("bio" in body) update.bio = asString(body.bio);
    if ("region" in body) update.region = asString(body.region);
    if ("open_to_singles" in body) update.open_to_singles = body.open_to_singles === true;
    if ("accepts_mixed_events" in body) update.accepts_mixed_events = body.accepts_mixed_events === true;
    if ("paused_at" in body) update.paused_at = body.paused_at === null ? null : new Date();

    const couple = await deps.membershipRepository.getCoupleByUser(session.user.id);
    if (!couple || couple.id !== id) {
      return c.json({ ok: false, code: "FORBIDDEN" }, 403);
    }

    const updated = await deps.membershipRepository.updateCouple(id, update);
    if (!updated) {
      return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    }
    return c.json({ ok: true, couple: coupleToJson(updated) });
  });

  app.delete("/api/couples/:id", async (c) => {
    const session = c.get("authSession");
    const id = c.req.param("id");
    const ok = await deps.membershipRepository.deleteCouple(id, session.user.id);
    if (!ok) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true });
  });

  app.get("/api/members", async (c) => {
    const session = c.get("authSession");
    const profile = await membershipRepository.getProfile(session.user.id);
    if (!profile || profile.verification_status !== "verified") {
      return c.json(
        { ok: false, code: "VERIFICATION_REQUIRED", message: "Bliv verificeret for at se medlemmer." },
        403
      );
    }

    const members = await membershipRepository.listVerifiedMembers(session.user.id);
    const enriched = await Promise.all(
      members.map(async (member) => {
        const photos = await membershipRepository.listPhotos(member.user_id, null);
        const visiblePhotos = filterPhotosForViewer(photos, member.face_visibility, "verified");
        return {
          ...profileToJson(member, member.face_visibility === "all_verified"),
          photos: visiblePhotos.map(photoToJson)
        };
      })
    );

    return c.json({ ok: true, members: enriched });
  });

  app.get("/api/members/:id", async (c) => {
    const session = c.get("authSession");
    const viewer = await membershipRepository.getProfile(session.user.id);
    if (!viewer || viewer.verification_status !== "verified") {
      if (c.req.param("id") !== session.user.id) {
        return c.json({ ok: false, code: "VERIFICATION_REQUIRED" }, 403);
      }
    }

    const id = c.req.param("id");
    const result = await membershipRepository.getPublicProfile(id, session.user.id);
    if (!result) {
      return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    }

    const visiblePhotos = filterPhotosForViewer(
      result.photos,
      result.profile.face_visibility,
      result.relation
    );
    const canSeeFace =
      result.relation === "self" ||
      result.relation === "match" ||
      result.relation === "private_grant" ||
      result.profile.face_visibility === "all_verified";

    if (result.relation === "private_grant") {
      await membershipRepository.recordPrivateAlbumView(id, null, session.user.id);
    }

    return c.json({
      ok: true,
      profile: profileToJson(result.profile, canSeeFace),
      couple: result.couple ? coupleToJson(result.couple) : null,
      photos: visiblePhotos.map(photoToJson),
      relation: result.relation
    });
  });

  app.get("/api/members/photo/:id", async (c) => {
    const session = c.get("authSession");
    const viewer = await membershipRepository.getProfile(session.user.id);
    const photoId = c.req.param("id");
    const photo = await membershipRepository.getPhotoById(photoId);

    if (!photo) {
      return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    }

    if (!viewer || viewer.verification_status !== "verified") {
      if (photo.owner_user_id !== session.user.id) {
        return c.json({ ok: false, code: "FORBIDDEN" }, 403);
      }
    }

    if (photo.visibility === "private" && photo.owner_user_id !== session.user.id) {
      const grant = await membershipRepository.recordPrivateAlbumView(
        photo.owner_user_id,
        photo.owner_couple_id,
        session.user.id
      );
      if (!grant) {
        return c.json({ ok: false, code: "FORBIDDEN" }, 403);
      }
    }

    if (photo.visibility === "match" && photo.owner_user_id !== session.user.id) {
      // Issue A2 + B48: Match-niveau billeder må ses ved gensidig interesse.
      // Vi tjekker mutual interest via membership-repo's isMatched (som
      // delegerer til messaging-laget). Hvis ejeren er et par (owner_couple_id
      // sat i stedet for owner_user_id), accepterer vi ikke match — det
      // kræver private grant, da par ikke har én entydig "match"-modpart.
      const matched = photo.owner_user_id
        ? await membershipRepository.isMatched(session.user.id, photo.owner_user_id)
        : false;
      if (!matched) {
        return c.json(
          { ok: false, code: "MATCH_REQUIRED", message: "Kræver gensidig interesse." },
          403
        );
      }
    }

    // Issue B48: Face-photos hvor ejeren har face_visibility='after_interest'
    // skal også gates på enkelt-foto-endpoint — ellers kan en ikke-matched
    // viewer bare gemme URL'en fra en match-tilstand og bypasse fremtidigt.
    if (
      photo.kind === "face" &&
      photo.visibility === "verified" &&
      photo.owner_user_id &&
      photo.owner_user_id !== session.user.id
    ) {
      const owner = await membershipRepository.getProfile(photo.owner_user_id);
      if (owner && owner.face_visibility === "after_interest") {
        const matched = await membershipRepository.isMatched(
          session.user.id,
          photo.owner_user_id
        );
        if (!matched) {
          return c.json(
            { ok: false, code: "FACE_HIDDEN", message: "Ansigtsbillede vises efter gensidig interesse." },
            403
          );
        }
      }
    }

    const fs = await uploadStore.read(photo.storage_path);
    return new Response(new Uint8Array(fs.data) as unknown as BodyInit, {
      headers: {
        "Content-Type": photo.mime_type,
        "Cache-Control": "private, no-store"
      }
    });
  });

  // Admin verifications
  const adminVerificationsMiddleware: MiddlewareHandler<{
    Variables: { authSession: AuthSessionData };
  }> = async (c, next) => {
    const session = await authService.getSession(c.req.raw.headers);
    if (!session) {
      return c.json({ ok: false, code: "UNAUTHORIZED" }, 401);
    }
    if (session.user.role !== "admin") {
      return c.json({ ok: false, code: "FORBIDDEN" }, 403);
    }
    c.set("authSession", session);
    await next();
  };
  app.use("/api/admin/verifications", adminVerificationsMiddleware);
  app.use("/api/admin/verifications/*", adminVerificationsMiddleware);

  app.get("/api/admin/verifications", async (c) => {
    const items = await membershipRepository.listPendingVerifications();
    return c.json({ ok: true, items });
  });

  app.post("/api/admin/verifications/:id/approve", async (c) => {
    const session = c.get("authSession");
    const submission = await membershipRepository.approveVerification(
      c.req.param("id"),
      session.user.id
    );
    if (!submission) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true, submission });
  });

  app.post("/api/admin/verifications/:id/reject", async (c) => {
    const session = c.get("authSession");
    const body = (await c.req.json().catch(() => null)) as { reason?: unknown } | null;
    const reason = asString(body?.reason) ?? "Ikke godkendt";
    const submission = await membershipRepository.rejectVerification(
      c.req.param("id"),
      session.user.id,
      reason
    );
    if (!submission) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true, submission });
  });

  // Admin verifierings-billeder kan ses af admin
  app.get("/api/admin/verifications/:id/files/:kind", async (c) => {
    const session = c.get("authSession");
    if (session.user.role !== "admin") {
      return c.json({ ok: false, code: "FORBIDDEN" }, 403);
    }
    const id = c.req.param("id");
    const kind = c.req.param("kind");
    if (kind !== "id" && kind !== "selfie") {
      return c.json({ ok: false, code: "INVALID_KIND" }, 400);
    }
    const submission = await membershipRepository.getVerificationById(id);
    if (!submission) {
      return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    }

    const path = kind === "id" ? submission.id_document_path : submission.selfie_path;
    const fs = await uploadStore.read(path);
    return new Response(new Uint8Array(fs.data) as unknown as BodyInit, {
      headers: {
        "Content-Type": fs.mimeType,
        "Cache-Control": "private, no-store"
      }
    });
  });
}
