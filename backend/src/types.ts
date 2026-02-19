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

export type EmailService = {
  sendWaitlistConfirm: (email: string, confirmUrl: string) => Promise<void>;
  sendWaitlistWelcome: (email: string) => Promise<void>;
};

export type RateLimitScope = "waitlist" | "confirm";

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
