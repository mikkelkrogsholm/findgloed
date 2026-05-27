import type { Hono, MiddlewareHandler } from "hono";
import type { EventRepository } from "./events";
import type { AuthService, EmailService, MembershipRepository, RateLimiter } from "./types";
import type { MessagingRepository } from "./messaging";

type AuthSessionData = {
  user: { id: string; email: string; role?: string | null };
  session: { id: string; userId: string; expiresAt: Date | string };
};

type MessagingDeps = {
  authService: AuthService;
  membershipRepository: MembershipRepository;
  eventRepository: EventRepository;
  messagingRepository: MessagingRepository;
  // Issue B13: per-user rate-limit på message_send + interest_signal.
  // Hvis undefined: ingen rate-limit (fx i tests). Vi bucketes på userId
  // i stedet for fingerprint så samme bruger ikke kan undgå limiten ved
  // at skifte enhed.
  rateLimiter?: RateLimiter;
  rateLimitEnabled?: boolean;
  rateLimitFailOpen?: boolean;
  trustProxy?: boolean;
  // C12: email-notifikationer for interest-signal + ny besked. Hvis undefined
  // (fx i tests) skippes notifikationer helt — alt funktionalitet virker stadig.
  emailService?: EmailService;
  appUrl?: string;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Issue B15: pagination-helper — samme contract som i membership-routes.
function parsePagination(
  url: URL,
  defaults: { limit: number; max: number }
): { limit: number; offset: number } {
  const limitRaw = Number(url.searchParams.get("limit"));
  const offsetRaw = Number(url.searchParams.get("offset"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0
    ? Math.min(defaults.max, Math.floor(limitRaw))
    : defaults.limit;
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0
    ? Math.floor(offsetRaw)
    : 0;
  return { limit, offset };
}

const MAX_MESSAGE_LENGTH = 4000;

export function registerMessagingRoutes(
  app: Hono<{ Variables: { authSession: AuthSessionData } }>,
  deps: MessagingDeps
): void {
  const { authService, membershipRepository, eventRepository, messagingRepository } = deps;
  const rateLimiter = deps.rateLimiter;
  const rateLimitEnabled = deps.rateLimitEnabled ?? true;
  const rateLimitFailOpen = deps.rateLimitFailOpen ?? false;
  const emailService = deps.emailService;
  const appUrl = (deps.appUrl ?? "").replace(/\/+$/, "");

  // C12: lookup display_name + email til notifikations-recipient. Returnerer
  // null hvis brugeren ikke findes eller mangler email — i begge tilfælde
  // skipper vi notifikationen stille i stedet for at fejle requesten.
  async function loadNotificationRecipient(
    userId: string
  ): Promise<{ email: string; displayName: string } | null> {
    const profile = await membershipRepository.getProfile(userId);
    if (!profile || !profile.email) return null;
    return {
      email: profile.email,
      displayName: profile.display_name?.trim() || "Et medlem"
    };
  }

  // C12: best-effort notifikation. Email-fejl må aldrig blokere besked-flowet.
  async function notify(task: () => Promise<void>): Promise<void> {
    try {
      await task();
    } catch (error) {
      console.error("email notification failed", error);
    }
  }

  // Issue B13: helper der returnerer 429-response hvis rate-limit overskrides.
  // Vi bucketes på userId (smuglet ind via email-feltet) så samme bruger har
  // én konto-bucket uanset enhed.
  async function checkUserRateLimit(
    c: Parameters<MiddlewareHandler>[0],
    scope: "message_send" | "interest_signal",
    userId: string
  ): Promise<Response | null> {
    if (!rateLimitEnabled || !rateLimiter) {
      return null;
    }
    try {
      const result = await rateLimiter.check({
        scope,
        fingerprint: userId,
        email: userId
      });
      if (result.limited) {
        c.header("Retry-After", String(result.retryAfterSeconds));
        return c.json(
          {
            ok: false,
            code: "RATE_LIMITED",
            message: "For mange forsøg. Prøv igen om lidt."
          },
          429
        );
      }
      return null;
    } catch (error) {
      console.error("Rate limiter check failed", error);
      if (rateLimitFailOpen) {
        return null;
      }
      c.header("Retry-After", "60");
      return c.json(
        { ok: false, code: "RATE_LIMITED", message: "For mange forsøg. Prøv igen om lidt." },
        429
      );
    }
  }

  const verifiedMemberOnly: MiddlewareHandler<{ Variables: { authSession: AuthSessionData } }> =
    async (c, next) => {
      const session = await authService.getSession(c.req.raw.headers);
      if (!session) return c.json({ ok: false, code: "UNAUTHORIZED" }, 401);
      const profile = await membershipRepository.getProfile(session.user.id);
      if (!profile || profile.verification_status !== "verified") {
        return c.json({ ok: false, code: "VERIFICATION_REQUIRED" }, 403);
      }
      c.set("authSession", session);
      await next();
    };

  app.use("/api/me/interests", verifiedMemberOnly);
  app.use("/api/me/interests/*", verifiedMemberOnly);
  app.use("/api/conversations", verifiedMemberOnly);
  app.use("/api/conversations/*", verifiedMemberOnly);
  app.use("/api/me/blocks", verifiedMemberOnly);
  app.use("/api/me/blocks/*", verifiedMemberOnly);
  app.use("/api/reports", verifiedMemberOnly);

  // ---------- Interesse-signaler (Frederiks gradueret model) ----------

  app.post("/api/me/interests/:user_id", async (c) => {
    const session = c.get("authSession");
    const targetId = c.req.param("user_id");
    if (targetId === session.user.id) {
      return c.json({ ok: false, code: "SELF_INTEREST" }, 422);
    }

    const limit = await checkUserRateLimit(c, "interest_signal", session.user.id);
    if (limit) return limit;

    const target = await membershipRepository.getProfile(targetId);
    if (!target || target.verification_status !== "verified") {
      return c.json({ ok: false, code: "RECIPIENT_NOT_FOUND" }, 404);
    }

    if (await messagingRepository.isBlocked(session.user.id, targetId)) {
      return c.json({ ok: false, code: "BLOCKED" }, 403);
    }

    // Beslutning 8: Singles → par kræver paret har open_to_singles = true.
    const myCouple = await membershipRepository.getCoupleByUser(session.user.id);
    const targetCouple = await membershipRepository.getCoupleByUser(targetId);
    if (!myCouple && targetCouple && !targetCouple.open_to_singles) {
      return c.json(
        { ok: false, code: "COUPLE_NOT_OPEN_TO_SINGLES" },
        403
      );
    }

    // Issue A12: samlet signal+mutual-check+conversation-creation i én transaktion
    // for at undgå race conditions ved parallelle signaler mellem samme par.
    const { signal, conversation } = await messagingRepository.signalInterestAndOpenIfMutual(
      session.user.id,
      targetId
    );

    // C12: notifér modtageren om at nogen har vist interesse. Hvis det blev
    // mutual og samtale blev åbnet, sender vi i stedet besked-notifikationen
    // via det normale besked-flow (ingen besked sendt endnu = ingen mail).
    // Vi sender altid interesse-mail på første signal — også når mutual er
    // opnået, fordi modtageren da netop ikke har sendt en besked til afsender
    // og derfor får én klar opfølgende handling: "se hvem du matchede med".
    if (emailService) {
      const sender = await loadNotificationRecipient(session.user.id);
      const recipient = await loadNotificationRecipient(targetId);
      if (sender && recipient) {
        const url = `${appUrl}/interests/incoming`;
        void notify(() =>
          emailService.sendInterestSignal(recipient.email, sender.displayName, url)
        );
      }
    }

    return c.json({
      ok: true,
      signal,
      conversation_opened: conversation !== null
    });
  });

  app.delete("/api/me/interests/:user_id", async (c) => {
    const session = c.get("authSession");
    const targetId = c.req.param("user_id");
    const ok = await messagingRepository.withdrawInterest(session.user.id, targetId);
    return c.json({ ok });
  });

  app.get("/api/me/interests", async (c) => {
    const session = c.get("authSession");
    const incoming = await messagingRepository.listIncomingInterest(session.user.id);
    const outgoing = await messagingRepository.listOutgoingInterest(session.user.id);
    const matches = await messagingRepository.listMatches(session.user.id);
    return c.json({ ok: true, incoming, outgoing, matches });
  });

  // ---------- Conversations ----------

  app.get("/api/conversations", async (c) => {
    const session = c.get("authSession");
    // Issue B15: pagination. Default 20, max 100.
    const { limit, offset } = parsePagination(new URL(c.req.url), {
      limit: 20,
      max: 100
    });
    const { items: conversations, total } = await messagingRepository.listConversations(
      session.user.id,
      { limit, offset }
    );

    // Issue B16: N+1-batch — vi henter profiles parallelt med Promise.all
    // (Postgres-pool håndterer concurrent queries fint). Tidligere blev de
    // hentet sekventielt via await i map-callback. For at gøre det helt
    // batch'et kunne vi tilføje en getProfilesIncludingDeleted([ids]) helper,
    // men her er parallel fetch tilstrækkeligt for typiske side-størrelser.
    const profiles = await Promise.all(
      conversations.map((conv) =>
        membershipRepository.getProfileIncludingDeleted(conv.other_user_id)
      )
    );
    const enriched = conversations.map((conv, idx) => {
      const other = profiles[idx];
      return {
        id: conv.id,
        origin: conv.origin,
        last_message_at: conv.last_message_at?.toISOString() ?? null,
        unread_count: conv.unread_count,
        other: other
          ? {
              user_id: other.user_id,
              display_name: other.display_name,
              region: other.region
            }
          : { user_id: conv.other_user_id, display_name: null, region: null }
      };
    });

    return c.json({
      ok: true,
      conversations: enriched,
      meta: {
        total,
        limit,
        offset,
        has_more: offset + enriched.length < total
      }
    });
  });

  app.post("/api/conversations", async (c) => {
    const session = c.get("authSession");
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return c.json({ ok: false, code: "INVALID_BODY" }, 400);

    const targetId = asString(body.user_id);
    const eventSlug = asString(body.event_slug);
    if (!targetId) return c.json({ ok: false, code: "MISSING_USER" }, 422);

    if (await messagingRepository.isBlocked(session.user.id, targetId)) {
      return c.json({ ok: false, code: "BLOCKED" }, 403);
    }

    let origin: "mutual_interest" | "shared_event" = "mutual_interest";
    let originEventId: string | null = null;

    if (eventSlug) {
      const event = await eventRepository.getBySlug(eventSlug);
      if (!event) return c.json({ ok: false, code: "EVENT_NOT_FOUND" }, 404);
      const myReg = await eventRepository.getRegistration(event.id, session.user.id);
      const otherReg = await eventRepository.getRegistration(event.id, targetId);
      const both =
        myReg &&
        otherReg &&
        ["confirmed", "attended"].includes(myReg.status) &&
        ["confirmed", "attended"].includes(otherReg.status);
      if (!both) {
        return c.json({ ok: false, code: "EVENT_PARTICIPATION_REQUIRED" }, 403);
      }
      origin = "shared_event";
      originEventId = event.id;
    } else {
      // Validér gensidig interesse for direkte chat.
      const mutual = await messagingRepository.hasMutualInterest(session.user.id, targetId);
      if (!mutual) {
        return c.json({ ok: false, code: "MUTUAL_INTEREST_REQUIRED" }, 403);
      }
    }

    const conversation = await messagingRepository.ensureConversation(
      session.user.id,
      targetId,
      origin,
      originEventId
    );
    return c.json({ ok: true, conversation });
  });

  app.get("/api/conversations/:id/messages", async (c) => {
    const session = c.get("authSession");
    const id = c.req.param("id");
    const conversation = await messagingRepository.getConversationById(id);
    if (!conversation) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    if (conversation.user_a_id !== session.user.id && conversation.user_b_id !== session.user.id) {
      return c.json({ ok: false, code: "FORBIDDEN" }, 403);
    }
    const messages = await messagingRepository.listMessages(id, 200);
    await messagingRepository.markRead(id, session.user.id);

    const otherId =
      conversation.user_a_id === session.user.id
        ? conversation.user_b_id
        : conversation.user_a_id;
    // getProfileIncludingDeleted: bevarer samtale-historik for slettede
    // brugere ved at vise dem som "[Slettet bruger]" frem for null.
    const other = await membershipRepository.getProfileIncludingDeleted(otherId);

    return c.json({
      ok: true,
      conversation: {
        id: conversation.id,
        origin: conversation.origin,
        other: other
          ? {
              user_id: other.user_id,
              display_name: other.display_name,
              region: other.region
            }
          : null
      },
      messages
    });
  });

  app.post("/api/conversations/:id/messages", async (c) => {
    const session = c.get("authSession");
    const id = c.req.param("id");

    const limit = await checkUserRateLimit(c, "message_send", session.user.id);
    if (limit) return limit;

    const body = (await c.req.json().catch(() => null)) as { body?: unknown } | null;
    const content = asString(body?.body);
    if (!content) return c.json({ ok: false, code: "EMPTY_BODY" }, 422);
    if (content.length > MAX_MESSAGE_LENGTH) {
      return c.json({ ok: false, code: "TOO_LONG" }, 422);
    }

    const conversation = await messagingRepository.getConversationById(id);
    if (!conversation) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    if (conversation.user_a_id !== session.user.id && conversation.user_b_id !== session.user.id) {
      return c.json({ ok: false, code: "FORBIDDEN" }, 403);
    }

    const otherId =
      conversation.user_a_id === session.user.id
        ? conversation.user_b_id
        : conversation.user_a_id;

    if (await messagingRepository.isBlocked(session.user.id, otherId)) {
      return c.json({ ok: false, code: "BLOCKED" }, 403);
    }

    const message = await messagingRepository.postMessage(id, session.user.id, content);

    // C12: notifér modtageren — men kun hvis dette er deres første ulæste
    // besked i samtalen. Hvis de allerede har ulæste beskeder, har de fået
    // mail før og vi vil ikke spamme.
    if (emailService) {
      const unread = await messagingRepository.countUnreadForRecipient(id, otherId);
      if (unread === 1) {
        const sender = await loadNotificationRecipient(session.user.id);
        const recipient = await loadNotificationRecipient(otherId);
        if (sender && recipient) {
          const url = `${appUrl}/messages/${id}`;
          void notify(() =>
            emailService.sendNewMessage(recipient.email, sender.displayName, url)
          );
        }
      }
    }

    return c.json({ ok: true, message });
  });

  // ---------- Event posts ----------

  app.get("/api/events/:slug/posts", async (c) => {
    const session = await authService.getSession(c.req.raw.headers);
    if (!session) return c.json({ ok: false, code: "UNAUTHORIZED" }, 401);
    const profile = await membershipRepository.getProfile(session.user.id);
    if (!profile || profile.verification_status !== "verified") {
      return c.json({ ok: false, code: "VERIFICATION_REQUIRED" }, 403);
    }

    const event = await eventRepository.getBySlug(c.req.param("slug"));
    if (!event) return c.json({ ok: false, code: "NOT_FOUND" }, 404);

    const posts = await messagingRepository.listEventPosts(event.id);

    // Berig med poster-display-name. Bruger getProfileIncludingDeleted
    // så slettede brugere vises som "[Slettet bruger]" (issue A10).
    const enriched = await Promise.all(
      posts.map(async (post) => {
        const author = await membershipRepository.getProfileIncludingDeleted(
          post.author_user_id
        );
        return {
          id: post.id,
          author: {
            user_id: post.author_user_id,
            display_name: author?.display_name ?? null
          },
          body: post.body,
          posted_at: post.posted_at.toISOString(),
          can_delete: post.author_user_id === session.user.id
        };
      })
    );

    return c.json({ ok: true, posts: enriched });
  });

  app.post("/api/events/:slug/posts", async (c) => {
    const session = await authService.getSession(c.req.raw.headers);
    if (!session) return c.json({ ok: false, code: "UNAUTHORIZED" }, 401);
    const profile = await membershipRepository.getProfile(session.user.id);
    if (!profile || profile.verification_status !== "verified") {
      return c.json({ ok: false, code: "VERIFICATION_REQUIRED" }, 403);
    }

    const event = await eventRepository.getBySlug(c.req.param("slug"));
    if (!event) return c.json({ ok: false, code: "NOT_FOUND" }, 404);

    // Kun deltagere kan poste i tråden.
    const reg = await eventRepository.getRegistration(event.id, session.user.id);
    if (!reg || (reg.status !== "confirmed" && reg.status !== "attended")) {
      return c.json({ ok: false, code: "PARTICIPATION_REQUIRED" }, 403);
    }

    const body = (await c.req.json().catch(() => null)) as { body?: unknown } | null;
    const content = asString(body?.body);
    if (!content) return c.json({ ok: false, code: "EMPTY_BODY" }, 422);

    const post = await messagingRepository.postEventComment(event.id, session.user.id, content);
    return c.json({ ok: true, post });
  });

  app.delete("/api/events/:slug/posts/:id", async (c) => {
    const session = await authService.getSession(c.req.raw.headers);
    if (!session) return c.json({ ok: false, code: "UNAUTHORIZED" }, 401);
    const ok = await messagingRepository.deleteEventPost(c.req.param("id"), session.user.id);
    return c.json({ ok });
  });

  // ---------- Blocks ----------

  app.get("/api/me/blocks", async (c) => {
    const session = c.get("authSession");
    const blocks = await messagingRepository.listBlocked(session.user.id);
    return c.json({ ok: true, blocks });
  });

  app.post("/api/me/blocks", async (c) => {
    const session = c.get("authSession");
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const targetId = asString(body?.user_id);
    if (!targetId) return c.json({ ok: false, code: "MISSING_USER" }, 422);
    if (targetId === session.user.id) return c.json({ ok: false, code: "SELF_BLOCK" }, 422);
    const block = await messagingRepository.block(
      session.user.id,
      targetId,
      asString(body?.reason)
    );
    return c.json({ ok: true, block });
  });

  app.delete("/api/me/blocks/:user_id", async (c) => {
    const session = c.get("authSession");
    const ok = await messagingRepository.unblock(session.user.id, c.req.param("user_id"));
    return c.json({ ok });
  });

  // ---------- Reports ----------

  app.post("/api/reports", async (c) => {
    const session = c.get("authSession");
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return c.json({ ok: false, code: "INVALID_BODY" }, 400);

    const reason = asString(body.reason);
    if (!reason) return c.json({ ok: false, code: "MISSING_REASON" }, 422);

    const report = await messagingRepository.createReport({
      reporter_user_id: session.user.id,
      reported_user_id: asString(body.reported_user_id),
      reported_message_id: asString(body.reported_message_id),
      reported_event_post_id: asString(body.reported_event_post_id),
      reason,
      details: asString(body.details)
    });
    return c.json({ ok: true, report });
  });

  // ---------- Admin reports ----------

  const adminOnly: MiddlewareHandler<{ Variables: { authSession: AuthSessionData } }> = async (
    c,
    next
  ) => {
    const session = await authService.getSession(c.req.raw.headers);
    if (!session) return c.json({ ok: false, code: "UNAUTHORIZED" }, 401);
    if (session.user.role !== "admin") return c.json({ ok: false, code: "FORBIDDEN" }, 403);
    c.set("authSession", session);
    await next();
  };

  app.use("/api/admin/reports", adminOnly);
  app.use("/api/admin/reports/*", adminOnly);
  // B17: admin-only event-post moderation. Skjuler en post via
  // hidden_by_admin_at — sletning ville hærge audit-spor og kan ikke
  // fortrydes. Den skjulte post forsvinder fra listEventPosts().
  app.use("/api/admin/event-posts/*", adminOnly);

  app.get("/api/admin/reports", async (c) => {
    // Issue B15: pagination.
    const { limit, offset } = parsePagination(new URL(c.req.url), {
      limit: 20,
      max: 100
    });
    const { items: reports, total } = await messagingRepository.listOpenReports({
      limit,
      offset
    });
    return c.json({
      ok: true,
      reports,
      meta: {
        total,
        limit,
        offset,
        has_more: offset + reports.length < total
      }
    });
  });

  app.get("/api/admin/event-posts/:id", async (c) => {
    const id = c.req.param("id");
    const post = await messagingRepository.getEventPostById(id);
    if (!post) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({
      ok: true,
      post: {
        id: post.id,
        event_id: post.event_id,
        author_user_id: post.author_user_id,
        body: post.body,
        posted_at: post.posted_at.toISOString(),
        hidden_by_admin_at: post.hidden_by_admin_at?.toISOString() ?? null,
        deleted_at: post.deleted_at?.toISOString() ?? null
      }
    });
  });

  app.delete("/api/admin/event-posts/:id", async (c) => {
    const id = c.req.param("id");
    const ok = await messagingRepository.hideEventPost(id);
    if (!ok) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true });
  });

  app.post("/api/admin/reports/:id/resolve", async (c) => {
    const session = c.get("authSession");
    const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
    const status = body?.status;
    if (status !== "reviewed" && status !== "dismissed" && status !== "actioned") {
      return c.json({ ok: false, code: "INVALID_STATUS" }, 422);
    }
    const report = await messagingRepository.resolveReport(
      c.req.param("id"),
      session.user.id,
      status,
      asString(body?.notes)
    );
    if (!report) return c.json({ ok: false, code: "NOT_FOUND" }, 404);
    return c.json({ ok: true, report });
  });
}
