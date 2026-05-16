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
};

export type RateLimitScope = "waitlist" | "confirm" | "partner_interest" | "partner_confirm";

export type RateLimitCheckInput = {
  scope: RateLimitScope;
  fingerprint: string;
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

export type MembershipRepository = {
  getProfile: (userId: string) => Promise<MembershipProfile | null>;
  updateProfile: (userId: string, update: MembershipUpdate) => Promise<MembershipProfile | null>;
  softDelete: (userId: string) => Promise<void>;
  hardDelete: (userId: string) => Promise<void>;

  listVerifiedMembers: (excludeUserId: string) => Promise<MembershipProfile[]>;
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

  insertPhoto: (input: PhotoInsert) => Promise<ProfilePhoto>;
  listPhotos: (ownerUserId: string | null, ownerCoupleId: string | null) => Promise<ProfilePhoto[]>;
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
    ownerCoupleId: string | null
  ) => Promise<PrivateAlbumGrant[]>;
  recordPrivateAlbumView: (
    ownerUserId: string | null,
    ownerCoupleId: string | null,
    recipientUserId: string
  ) => Promise<PrivateAlbumGrant | null>;

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
