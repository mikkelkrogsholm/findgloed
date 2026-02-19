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
  | "Styrke trygge rammer"
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
