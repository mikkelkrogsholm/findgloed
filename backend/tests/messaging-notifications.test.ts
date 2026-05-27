import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { registerMessagingRoutes } from "../src/messaging-routes";
import type { Conversation, MessagingRepository } from "../src/messaging";
import type {
  AuthService,
  EmailService,
  MembershipProfile,
  MembershipRepository
} from "../src/types";
import type { EventRepository } from "../src/events";

const ALICE = "user-alice";
const BOB = "user-bob";

type AuthSessionData = {
  user: { id: string; email: string; role?: string | null };
  session: { id: string; userId: string; expiresAt: Date | string };
};

function profile(userId: string, email: string, name: string): MembershipProfile {
  return {
    user_id: userId,
    email,
    display_name: name,
    birth_year: 1985,
    region: "København",
    bio: null,
    initiator_role: null,
    face_visibility: "after_interest",
    verification_status: "verified",
    verified_at: new Date(),
    verified_via: "temporary",
    future_verification_accepted_at: null,
    onboarded_at: new Date(),
    paused_at: null,
    role: "user",
    created_at: new Date()
  };
}

type EmailSpy = {
  interestCalls: Array<{ to: string; from: string; url: string }>;
  messageCalls: Array<{ to: string; from: string; url: string }>;
};

function createSpyEmailService(): EmailService & { spy: EmailSpy } {
  const spy: EmailSpy = { interestCalls: [], messageCalls: [] };
  return {
    spy,
    sendWaitlistConfirm: async () => undefined,
    sendWaitlistWelcome: async () => undefined,
    sendPartnerInterestConfirm: async () => undefined,
    sendPartnerInterestReceived: async () => undefined,
    sendInterestSignal: async (to, from, url) => {
      spy.interestCalls.push({ to, from, url });
    },
    sendNewMessage: async (to, from, url) => {
      spy.messageCalls.push({ to, from, url });
    }
  };
}

function createApp(opts: {
  session: AuthSessionData;
  membershipById: Record<string, MembershipProfile>;
  messaging: Partial<MessagingRepository>;
  emailService?: EmailService;
}) {
  const app = new Hono<{ Variables: { authSession: AuthSessionData } }>();

  const authService: AuthService = {
    handler: async () => new Response("ok"),
    getSession: async () => opts.session,
    ensureSuperAdmin: async () => undefined
  } as unknown as AuthService;

  const membership: MembershipRepository = {
    getProfile: async (id: string) => opts.membershipById[id] ?? null,
    getCoupleByUser: async () => null
  } as unknown as MembershipRepository;

  const messaging: MessagingRepository = {
    isBlocked: async () => false,
    signalInterestAndOpenIfMutual: async (from, to) => ({
      signal: {
        id: "sig-1",
        from_user_id: from,
        to_user_id: to,
        created_at: new Date(),
        withdrawn_at: null
      },
      conversation: null
    }),
    getConversationById: async () => ({
      id: "conv-1",
      user_a_id: ALICE,
      user_b_id: BOB,
      origin: "mutual_interest",
      origin_event_id: null,
      last_message_at: new Date(),
      closed_at: null,
      created_at: new Date()
    } satisfies Conversation),
    postMessage: async (cid, sender, body) => ({
      id: "msg-1",
      conversation_id: cid,
      sender_user_id: sender,
      body,
      sent_at: new Date(),
      read_at: null
    }),
    countUnreadForRecipient: async () => 1,
    ...opts.messaging
  } as unknown as MessagingRepository;

  const eventRepo = {} as unknown as EventRepository;

  registerMessagingRoutes(app, {
    authService,
    membershipRepository: membership,
    eventRepository: eventRepo,
    messagingRepository: messaging,
    rateLimitEnabled: false,
    emailService: opts.emailService,
    appUrl: "https://findgloed.dk"
  });

  return app;
}

describe("C12 — interest-signal notifikation", () => {
  test("sender mail til modtager med korrekt afsendernavn og URL", async () => {
    const email = createSpyEmailService();
    const app = createApp({
      session: {
        user: { id: ALICE, email: "alice@example.com", role: "user" },
        session: { id: "s1", userId: ALICE, expiresAt: new Date() }
      },
      membershipById: {
        [ALICE]: profile(ALICE, "alice@example.com", "Alice"),
        [BOB]: profile(BOB, "bob@example.com", "Bob")
      },
      messaging: {},
      emailService: email
    });

    const res = await app.request(`/api/me/interests/${BOB}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });

    expect(res.status).toBe(200);
    expect(email.spy.interestCalls).toHaveLength(1);
    expect(email.spy.interestCalls[0]).toEqual({
      to: "bob@example.com",
      from: "Alice",
      url: "https://findgloed.dk/interests/incoming"
    });
  });

  test("skipper notifikation hvis emailService er undefined", async () => {
    const app = createApp({
      session: {
        user: { id: ALICE, email: "alice@example.com", role: "user" },
        session: { id: "s1", userId: ALICE, expiresAt: new Date() }
      },
      membershipById: {
        [ALICE]: profile(ALICE, "alice@example.com", "Alice"),
        [BOB]: profile(BOB, "bob@example.com", "Bob")
      },
      messaging: {}
    });

    const res = await app.request(`/api/me/interests/${BOB}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });

    expect(res.status).toBe(200);
  });

  test("mail-fejl må ikke fejle requesten", async () => {
    const email = createSpyEmailService();
    email.sendInterestSignal = async () => {
      throw new Error("resend down");
    };
    const app = createApp({
      session: {
        user: { id: ALICE, email: "alice@example.com", role: "user" },
        session: { id: "s1", userId: ALICE, expiresAt: new Date() }
      },
      membershipById: {
        [ALICE]: profile(ALICE, "alice@example.com", "Alice"),
        [BOB]: profile(BOB, "bob@example.com", "Bob")
      },
      messaging: {},
      emailService: email
    });

    const res = await app.request(`/api/me/interests/${BOB}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });

    expect(res.status).toBe(200);
  });
});

describe("C12 — ny-besked notifikation", () => {
  test("sender mail til modtager når besked er deres første ulæste", async () => {
    const email = createSpyEmailService();
    const app = createApp({
      session: {
        user: { id: ALICE, email: "alice@example.com", role: "user" },
        session: { id: "s1", userId: ALICE, expiresAt: new Date() }
      },
      membershipById: {
        [ALICE]: profile(ALICE, "alice@example.com", "Alice"),
        [BOB]: profile(BOB, "bob@example.com", "Bob")
      },
      messaging: { countUnreadForRecipient: async () => 1 },
      emailService: email
    });

    const res = await app.request(`/api/conversations/conv-1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "Hej Bob" })
    });

    expect(res.status).toBe(200);
    expect(email.spy.messageCalls).toHaveLength(1);
    expect(email.spy.messageCalls[0]).toEqual({
      to: "bob@example.com",
      from: "Alice",
      url: "https://findgloed.dk/messages/conv-1"
    });
  });

  test("debouncer mail når modtager allerede har ulæste beskeder", async () => {
    const email = createSpyEmailService();
    const app = createApp({
      session: {
        user: { id: ALICE, email: "alice@example.com", role: "user" },
        session: { id: "s1", userId: ALICE, expiresAt: new Date() }
      },
      membershipById: {
        [ALICE]: profile(ALICE, "alice@example.com", "Alice"),
        [BOB]: profile(BOB, "bob@example.com", "Bob")
      },
      messaging: { countUnreadForRecipient: async () => 3 },
      emailService: email
    });

    const res = await app.request(`/api/conversations/conv-1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "Endnu en besked" })
    });

    expect(res.status).toBe(200);
    expect(email.spy.messageCalls).toHaveLength(0);
  });
});
