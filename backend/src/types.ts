export type WaitlistLeadStatus =
  | "created_pending"
  | "pending_resent"
  | "pending_cooldown"
  | "already_confirmed";

export type WaitlistUpsertInput = {
  email: string;
  source: "landing";
  acceptedAt: Date;
  marketingOptIn: boolean;
  confirmationTokenHash: string;
  confirmationTokenExpiresAt: Date;
  resendCooldownMinutes: number;
};

export type WaitlistUpsertResult = {
  status: WaitlistLeadStatus;
  shouldSendConfirm: boolean;
};

export type ConfirmLeadResult =
  | { status: "confirmed"; email: string }
  | { status: "already_confirmed" }
  | { status: "expired" }
  | { status: "invalid" };

export type WaitlistRepository = {
  upsertWaitlistLead: (input: WaitlistUpsertInput) => Promise<WaitlistUpsertResult>;
  confirmLeadByToken: (tokenHash: string, now: Date) => Promise<ConfirmLeadResult>;
  emailExistsInLeads: (email: string) => Promise<boolean>;
  listAdminLeads: () => Promise<AdminLeadsResult>;
};

export type AdminLead = {
  id: string;
  email: string;
  status: "pending" | "confirmed" | "unsubscribed";
  source: string;
  marketing_opt_in: boolean;
  created_at: Date;
  confirmed_at: Date | null;
  terms_accepted_at: Date | null;
  privacy_accepted_at: Date | null;
};

export type AdminLeadsMeta = {
  total: number;
  confirmed: number;
  pending: number;
};

export type AdminLeadsResult = {
  items: AdminLead[];
  meta: AdminLeadsMeta;
};

export type PartnerLeadStatus =
  | "created_pending"
  | "pending_resent"
  | "pending_cooldown"
  | "already_confirmed";

export type PartnerSource = "vision_modal";

export type PartnerInterestOption =
  | "Oprette events"
  | "Nå nye deltagere"
  | "Styrke rammer for samtykke og respekt"
  | "Samarbejde om platformen";

export type PartnerRole =
  | "Forening/organisation"
  | "Eventarrangør"
  | "Fagperson/behandler"
  | "Andet";

export type PartnerUpsertInput = {
  email: string;
  name: string;
  organization: string;
  role: PartnerRole;
  region: string | null;
  interests: PartnerInterestOption[];
  source: PartnerSource;
  acceptedAt: Date;
  marketingOptIn: boolean;
  confirmationTokenHash: string;
  confirmationTokenExpiresAt: Date;
  resendCooldownMinutes: number;
};

export type PartnerUpsertResult = {
  status: PartnerLeadStatus;
  shouldSendConfirm: boolean;
};

export type PartnerConfirmResult =
  | { status: "confirmed"; email: string }
  | { status: "already_confirmed" }
  | { status: "expired" }
  | { status: "invalid" };

export type PartnerInterestRepository = {
  upsertPartnerInterest: (input: PartnerUpsertInput) => Promise<PartnerUpsertResult>;
  confirmPartnerByToken: (tokenHash: string, now: Date) => Promise<PartnerConfirmResult>;
};

export type EmailService = {
  sendWaitlistConfirm: (email: string, confirmUrl: string) => Promise<void>;
  sendWaitlistWelcome: (email: string) => Promise<void>;
  sendPartnerInterestConfirm: (email: string, confirmUrl: string) => Promise<void>;
  sendPartnerInterestReceived: (email: string) => Promise<void>;
  sendInterestSignal: (
    toEmail: string,
    fromDisplayName: string,
    interestsUrl: string
  ) => Promise<void>;
  sendNewMessage: (
    toEmail: string,
    fromDisplayName: string,
    conversationUrl: string
  ) => Promise<void>;
};

// Issue B13: Per-scope rate-limit. Hver scope har sit eget bucket-mønster:
// - "waitlist"/"partner_interest": fingerprint + email
// - "confirm"/"partner_confirm": fingerprint
// - "login_attempt": fingerprint + email (forhindrer brute-force pr. konto)
// - "signup_attempt": fingerprint (forhindrer mass-signup pr. enhed)
// - "message_send"/"interest_signal"/"upload": userId (sat ind via email-feltet
//   af kalderen, fordi vi allerede har en autentificeret bruger).
export type RateLimitScope =
  | "waitlist"
  | "confirm"
  | "partner_interest"
  | "partner_confirm"
  | "login_attempt"
  | "signup_attempt"
  | "message_send"
  | "interest_signal"
  | "article_search"
  | "upload";

export type RateLimitCheckInput = {
  scope: RateLimitScope;
  fingerprint: string;
  // For waitlist/partner/login: brugerens email. For authenticated scopes
  // bruges samme felt til at smugle userId ind (det er bare en bucket-discriminator).
  email?: string;
};

export type RateLimitCheckResult = {
  limited: boolean;
  retryAfterSeconds: number;
};

export type RateLimiter = {
  check: (input: RateLimitCheckInput) => Promise<RateLimitCheckResult>;
  close?: () => Promise<void>;
};

export type AuthSessionUser = {
  id: string;
  email: string;
  role?: string | null;
};

export type AuthSession = {
  user: AuthSessionUser;
  session: {
    id: string;
    userId: string;
    expiresAt: Date | string;
  };
};

export type AuthService = {
  handler: (request: Request) => Promise<Response>;
  getSession: (headers: Headers) => Promise<AuthSession | null>;
  ensureSuperAdmin: (email: string, password: string) => Promise<void>;
};

// ---------- Membership ----------

export type InitiatorRole = "inviting" | "deciding" | "balanced";
export type FaceVisibility = "after_interest" | "all_verified";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type VerifiedVia = "temporary" | "manual" | "mitid";
export type PhotoVisibility = "verified" | "match" | "private";
export type PhotoKind = "face" | "body" | "ambient" | "private";

export type MembershipProfile = {
  user_id: string;
  email: string;
  display_name: string | null;
  birth_year: number | null;
  region: string | null;
  bio: string | null;
  initiator_role: InitiatorRole | null;
  face_visibility: FaceVisibility;
  verification_status: VerificationStatus;
  verified_at: Date | null;
  verified_via: VerifiedVia | null;
  future_verification_accepted_at: Date | null;
  onboarded_at: Date | null;
  paused_at: Date | null;
  role: string | null;
  created_at: Date;
};

// Issue A24: Profil til ikke-self lookups (lister af verificerede medlemmer).
// Indeholder ALT undtagen email — email må kun læses af brugeren selv eller
// admins. Tidligere blev MembershipProfile (inkl. email) sendt fra
// listVerifiedMembers, hvilket lod en route-handler iterere alle medlemmer
// for at finde en med matching email — et klassisk enumeration-leak.
export type PublicMembershipProfile = Omit<MembershipProfile, "email">;

export type CoupleProfile = {
  id: string;
  primary_user_id: string;
  partner_user_id: string;
  display_name: string;
  bio: string | null;
  region: string | null;
  open_to_singles: boolean;
  accepts_mixed_events: boolean;
  paused_at: Date | null;
  created_at: Date;
};

export type ProfilePhoto = {
  id: string;
  owner_user_id: string | null;
  owner_couple_id: string | null;
  kind: PhotoKind;
  visibility: PhotoVisibility;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  position: number;
  created_at: Date;
};

export type PrivateAlbumGrant = {
  id: string;
  owner_user_id: string | null;
  owner_couple_id: string | null;
  recipient_user_id: string;
  granted_at: Date;
  revoked_at: Date | null;
  last_viewed_at: Date | null;
  view_count: number;
};

export type VerificationSubmission = {
  id: string;
  user_id: string;
  id_document_path: string;
  selfie_path: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: Date;
  reviewed_at: Date | null;
  reviewed_by_admin_id: string | null;
  notes: string | null;
  rejection_reason: string | null;
};

export type MembershipUpdate = {
  display_name?: string | null;
  birth_year?: number | null;
  region?: string | null;
  bio?: string | null;
  initiator_role?: InitiatorRole | null;
  face_visibility?: FaceVisibility;
  onboarded_at?: Date | null;
  paused_at?: Date | null;
};

export type CoupleUpsert = {
  primary_user_id: string;
  partner_user_id: string;
  display_name: string;
  bio: string | null;
  region: string | null;
  open_to_singles: boolean;
  accepts_mixed_events: boolean;
};

export type CoupleInvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "expired";

export type CoupleInvitation = {
  id: string;
  primary_user_id: string;
  partner_user_id: string;
  display_name: string;
  bio: string | null;
  region: string | null;
  open_to_singles: boolean;
  accepts_mixed_events: boolean;
  status: CoupleInvitationStatus;
  expires_at: Date;
  created_at: Date;
  responded_at: Date | null;
};

export type CoupleInvitationWithUsers = CoupleInvitation & {
  primary_email: string;
  primary_display_name: string | null;
  partner_email: string;
  partner_display_name: string | null;
};

export type CoupleInvitationInsert = {
  primary_user_id: string;
  partner_user_id: string;
  display_name: string;
  bio: string | null;
  region: string | null;
  open_to_singles: boolean;
  accepts_mixed_events: boolean;
  expires_at: Date;
};

export type CoupleUpdate = {
  display_name?: string;
  bio?: string | null;
  region?: string | null;
  open_to_singles?: boolean;
  accepts_mixed_events?: boolean;
  paused_at?: Date | null;
};

export type PhotoInsert = {
  owner_user_id: string | null;
  owner_couple_id: string | null;
  kind: PhotoKind;
  visibility: PhotoVisibility;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  position: number;
};

export type VerificationInsert = {
  user_id: string;
  id_document_path: string;
  selfie_path: string;
};

// Issue A2: Membership-laget skal kunne se gensidig interesse uden at
// importere messaging-laget direkte (cirkulær afhængighed). Vi bruger
// dette minimal-interface som DI-port — PostgresMessagingRepository
// implementerer det allerede via hasMutualInterest.
export type MatchChecker = {
  hasMutualInterest: (userIdA: string, userIdB: string) => Promise<boolean>;
};

export type MembershipRepository = {
  getProfile: (userId: string) => Promise<MembershipProfile | null>;
  // Returnerer en minimal profil-stub for brugere der er soft-deleted
  // eller anonymiserede via hardDelete. Bruges i messaging/event-threads
  // hvor afsender skal vises som "[Slettet bruger]" frem for null
  // (issue A10 — bevar samtale-historik for andre brugere).
  getProfileIncludingDeleted: (userId: string) => Promise<MembershipProfile | null>;
  updateProfile: (userId: string, update: MembershipUpdate) => Promise<MembershipProfile | null>;
  softDelete: (userId: string) => Promise<void>;
  hardDelete: (userId: string) => Promise<void>;
  // Issue A2: Match-checker injiceres efter construction (cirkulær DI).
  // isMatched bruges af routes-laget til at gate match-visibility-billeder
  // uden at importere messaging-laget direkte.
  setMatchChecker: (checker: MatchChecker) => void;
  isMatched: (viewerId: string, targetId: string) => Promise<boolean>;

  listVerifiedMembers: (
    excludeUserId: string,
    options?: { limit?: number; offset?: number }
  ) => Promise<{ items: PublicMembershipProfile[]; total: number }>;

  // Admin-only: liste over ALLE brugere (inkl. admins, ikke-verificerede,
  // pauseed) med pagination. Slettede brugere udelades. Bruges af /admin/users
  // til at promote/demote admins.
  listAllUsersForAdmin: (
    options?: { limit?: number; offset?: number }
  ) => Promise<{ items: MembershipProfile[]; total: number }>;

  // Admin-only: skift role på en bruger. Returnerer den opdaterede profil
  // eller null hvis brugeren ikke findes / er slettet.
  setUserRole: (
    userId: string,
    role: "admin" | "organizer" | "user"
  ) => Promise<MembershipProfile | null>;
  // Issue A24: Direkte opslag af en verificeret + onboarded bruger via email.
  // Returnerer null hvis ingen matcher — eller hvis matchen ikke er
  // færdig-onboarded eller ikke verificeret. Bruges af createCouple så vi
  // kan finde en partner uden at iterere alle medlemmer (og dermed eksponere
  // hele email-listen mod kalderen).
  findVerifiedByEmail: (email: string) => Promise<MembershipProfile | null>;
  // Email-opslag uden role-filter. Bruges når en org-owner tilføjer et
  // teammedlem (target kan være user/organizer/admin). Udelukker slettede.
  findProfileByEmail: (email: string) => Promise<MembershipProfile | null>;
  getPublicProfile: (
    userId: string,
    viewerId: string
  ) => Promise<{
    profile: MembershipProfile;
    photos: ProfilePhoto[];
    couple: CoupleProfile | null;
    relation: "self" | "verified" | "match" | "private_grant";
  } | null>;

  createCouple: (input: CoupleUpsert) => Promise<CoupleProfile>;
  updateCouple: (id: string, update: CoupleUpdate) => Promise<CoupleProfile | null>;
  getCoupleByUser: (userId: string) => Promise<CoupleProfile | null>;
  deleteCouple: (id: string, requestedBy: string) => Promise<boolean>;

  createCoupleInvitation: (input: CoupleInvitationInsert) => Promise<CoupleInvitation>;
  getCoupleInvitationById: (id: string) => Promise<CoupleInvitation | null>;
  listIncomingCoupleInvitations: (
    userId: string
  ) => Promise<CoupleInvitationWithUsers[]>;
  listOutgoingCoupleInvitations: (
    userId: string
  ) => Promise<CoupleInvitationWithUsers[]>;
  acceptCoupleInvitation: (
    id: string,
    partnerUserId: string
  ) => Promise<{ invitation: CoupleInvitation; couple: CoupleProfile } | null>;
  declineCoupleInvitation: (
    id: string,
    partnerUserId: string
  ) => Promise<CoupleInvitation | null>;
  cancelCoupleInvitation: (
    id: string,
    primaryUserId: string
  ) => Promise<CoupleInvitation | null>;
  hasPendingInvitationBetween: (
    primaryUserId: string,
    partnerUserId: string
  ) => Promise<boolean>;

  insertPhoto: (input: PhotoInsert) => Promise<ProfilePhoto>;
  listPhotos: (ownerUserId: string | null, ownerCoupleId: string | null) => Promise<ProfilePhoto[]>;
  // Issue B16: Batch-fetch af fotos for flere brugere på én gang —
  // erstatter N+1-loop i /api/members. Returnerer Map fra owner_user_id
  // til foto-listen (sorteret efter position, created_at) så routen kan
  // slå op uden ekstra queries.
  listPhotosForUsers: (ownerUserIds: string[]) => Promise<Map<string, ProfilePhoto[]>>;
  getPhotoById: (id: string) => Promise<ProfilePhoto | null>;
  deletePhoto: (id: string, requestedBy: string) => Promise<ProfilePhoto | null>;

  grantPrivateAlbum: (
    ownerUserId: string | null,
    ownerCoupleId: string | null,
    recipientUserId: string
  ) => Promise<PrivateAlbumGrant>;
  revokePrivateAlbum: (
    ownerUserId: string | null,
    ownerCoupleId: string | null,
    recipientUserId: string
  ) => Promise<void>;
  listPrivateAlbumGrantsForOwner: (
    ownerUserId: string | null,
    ownerCoupleId: string | null,
    options?: { limit?: number; offset?: number }
  ) => Promise<{ items: PrivateAlbumGrant[]; total: number }>;
  recordPrivateAlbumView: (
    ownerUserId: string | null,
    ownerCoupleId: string | null,
    recipientUserId: string
  ) => Promise<PrivateAlbumGrant | null>;
  // Issue A13: Adgangs-check uden side-effekt. Bruges til at gates adgang
  // til private fotos *før* vi inkrementerer view_count — så et 403-svar
  // ikke længere tæller med i ejerens "set af N gange"-statistik.
  existsPrivateAlbumGrant: (
    ownerUserId: string | null,
    ownerCoupleId: string | null,
    recipientUserId: string
  ) => Promise<boolean>;

  submitVerification: (input: VerificationInsert) => Promise<VerificationSubmission>;
  acceptFutureVerificationPolicy: (userId: string) => Promise<MembershipProfile | null>;
  listPendingVerifications: () => Promise<Array<VerificationSubmission & { email: string }>>;
  getVerificationById: (id: string) => Promise<VerificationSubmission | null>;
  approveVerification: (id: string, adminId: string) => Promise<VerificationSubmission | null>;
  rejectVerification: (
    id: string,
    adminId: string,
    reason: string
  ) => Promise<VerificationSubmission | null>;
};
