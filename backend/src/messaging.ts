import type { Pool } from "pg";

export type InterestSignal = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  created_at: Date;
  withdrawn_at: Date | null;
};

export type ConversationOrigin = "mutual_interest" | "shared_event";

export type Conversation = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  origin: ConversationOrigin;
  origin_event_id: string | null;
  last_message_at: Date | null;
  closed_at: Date | null;
  created_at: Date;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  sent_at: Date;
  read_at: Date | null;
};

export type EventPost = {
  id: string;
  event_id: string;
  author_user_id: string;
  body: string;
  posted_at: Date;
  edited_at: Date | null;
  deleted_at: Date | null;
  hidden_by_admin_at: Date | null;
};

export type UserBlock = {
  id: string;
  blocker_user_id: string;
  blocked_user_id: string;
  reason: string | null;
  created_at: Date;
};

export type UserReport = {
  id: string;
  reporter_user_id: string;
  reported_user_id: string | null;
  reported_message_id: string | null;
  reported_event_post_id: string | null;
  reason: string;
  details: string | null;
  status: "open" | "reviewed" | "dismissed" | "actioned";
  created_at: Date;
  reviewed_at: Date | null;
  reviewed_by_admin_id: string | null;
  resolution_notes: string | null;
};

function rowToInterest(row: Record<string, unknown>): InterestSignal {
  return {
    id: String(row.id),
    from_user_id: String(row.from_user_id),
    to_user_id: String(row.to_user_id),
    created_at: row.created_at as Date,
    withdrawn_at: (row.withdrawn_at as Date | null) ?? null
  };
}

function rowToConversation(row: Record<string, unknown>): Conversation {
  return {
    id: String(row.id),
    user_a_id: String(row.user_a_id),
    user_b_id: String(row.user_b_id),
    origin: row.origin as ConversationOrigin,
    origin_event_id: (row.origin_event_id as string | null) ?? null,
    last_message_at: (row.last_message_at as Date | null) ?? null,
    closed_at: (row.closed_at as Date | null) ?? null,
    created_at: row.created_at as Date
  };
}

function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    conversation_id: String(row.conversation_id),
    sender_user_id: String(row.sender_user_id),
    body: String(row.body),
    sent_at: row.sent_at as Date,
    read_at: (row.read_at as Date | null) ?? null
  };
}

function rowToEventPost(row: Record<string, unknown>): EventPost {
  return {
    id: String(row.id),
    event_id: String(row.event_id),
    author_user_id: String(row.author_user_id),
    body: String(row.body),
    posted_at: row.posted_at as Date,
    edited_at: (row.edited_at as Date | null) ?? null,
    deleted_at: (row.deleted_at as Date | null) ?? null,
    hidden_by_admin_at: (row.hidden_by_admin_at as Date | null) ?? null
  };
}

function rowToBlock(row: Record<string, unknown>): UserBlock {
  return {
    id: String(row.id),
    blocker_user_id: String(row.blocker_user_id),
    blocked_user_id: String(row.blocked_user_id),
    reason: (row.reason as string | null) ?? null,
    created_at: row.created_at as Date
  };
}

function rowToReport(row: Record<string, unknown>): UserReport {
  return {
    id: String(row.id),
    reporter_user_id: String(row.reporter_user_id),
    reported_user_id: (row.reported_user_id as string | null) ?? null,
    reported_message_id: (row.reported_message_id as string | null) ?? null,
    reported_event_post_id: (row.reported_event_post_id as string | null) ?? null,
    reason: String(row.reason),
    details: (row.details as string | null) ?? null,
    status: row.status as UserReport["status"],
    created_at: row.created_at as Date,
    reviewed_at: (row.reviewed_at as Date | null) ?? null,
    reviewed_by_admin_id: (row.reviewed_by_admin_id as string | null) ?? null,
    resolution_notes: (row.resolution_notes as string | null) ?? null
  };
}

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export type MessagingRepository = {
  // Interest signals
  signalInterest: (fromUserId: string, toUserId: string) => Promise<InterestSignal>;
  // Issue A12: Atomisk variant — signal + mutual-check + conversation-creation
  // i samme transaktion, så to parallelle signaler ikke kan ende med duplicate
  // conversation eller falsk-negativ mutual-check.
  signalInterestAndOpenIfMutual: (
    fromUserId: string,
    toUserId: string
  ) => Promise<{
    signal: InterestSignal;
    conversation: Conversation | null;
  }>;
  withdrawInterest: (fromUserId: string, toUserId: string) => Promise<boolean>;
  hasMutualInterest: (userIdA: string, userIdB: string) => Promise<boolean>;
  listIncomingInterest: (userId: string) => Promise<InterestSignal[]>;
  listOutgoingInterest: (userId: string) => Promise<InterestSignal[]>;
  listMatches: (userId: string) => Promise<string[]>;

  // Conversations
  ensureConversation: (
    userA: string,
    userB: string,
    origin: ConversationOrigin,
    originEventId: string | null
  ) => Promise<Conversation>;
  getConversationByUsers: (userA: string, userB: string) => Promise<Conversation | null>;
  getConversationById: (id: string) => Promise<Conversation | null>;
  // Issue B15: pagination.
  listConversations: (
    userId: string,
    options?: { limit?: number; offset?: number }
  ) => Promise<{
    items: Array<Conversation & { other_user_id: string; unread_count: number }>;
    total: number;
  }>;
  postMessage: (
    conversationId: string,
    senderUserId: string,
    body: string
  ) => Promise<Message>;
  listMessages: (conversationId: string, limit: number) => Promise<Message[]>;
  markRead: (conversationId: string, userId: string) => Promise<void>;

  // Event posts
  postEventComment: (eventId: string, userId: string, body: string) => Promise<EventPost>;
  listEventPosts: (eventId: string) => Promise<EventPost[]>;
  deleteEventPost: (id: string, userId: string) => Promise<boolean>;
  hideEventPost: (id: string) => Promise<boolean>;
  // B17: admin har brug for at se preview af en rapporteret post —
  // også selvom den allerede er hidden_by_admin_at, så audit-spor kan
  // gennemgås. Returnerer null hvis post er hard-slettet (deleted_at)
  // eller ikke findes.
  getEventPostById: (id: string) => Promise<EventPost | null>;

  // Blocks
  block: (blockerId: string, blockedId: string, reason: string | null) => Promise<UserBlock>;
  unblock: (blockerId: string, blockedId: string) => Promise<boolean>;
  isBlocked: (blockerId: string, blockedId: string) => Promise<boolean>;
  listBlocked: (userId: string) => Promise<UserBlock[]>;

  // Reports
  createReport: (input: {
    reporter_user_id: string;
    reported_user_id?: string | null;
    reported_message_id?: string | null;
    reported_event_post_id?: string | null;
    reason: string;
    details?: string | null;
  }) => Promise<UserReport>;
  // Issue B15: pagination.
  listOpenReports: (options?: { limit?: number; offset?: number }) => Promise<{
    items: UserReport[];
    total: number;
  }>;
  resolveReport: (
    id: string,
    adminId: string,
    status: "reviewed" | "dismissed" | "actioned",
    notes: string | null
  ) => Promise<UserReport | null>;
};

export class PostgresMessagingRepository implements MessagingRepository {
  constructor(private readonly pool: Pool) {}

  async signalInterest(fromUserId: string, toUserId: string): Promise<InterestSignal> {
    const result = await this.pool.query(
      `INSERT INTO interest_signal (from_user_id, to_user_id)
       VALUES ($1, $2)
       ON CONFLICT (from_user_id, to_user_id) WHERE withdrawn_at IS NULL DO NOTHING
       RETURNING id, from_user_id, to_user_id, created_at, withdrawn_at`,
      [fromUserId, toUserId]
    );
    if (result.rows[0]) {
      return rowToInterest(result.rows[0]);
    }
    const existing = await this.pool.query(
      `SELECT id, from_user_id, to_user_id, created_at, withdrawn_at
       FROM interest_signal
       WHERE from_user_id = $1 AND to_user_id = $2 AND withdrawn_at IS NULL
       LIMIT 1`,
      [fromUserId, toUserId]
    );
    return rowToInterest(existing.rows[0]);
  }

  // Issue A12: Atomisk signal + mutual-check + conversation-creation.
  // Tidligere kørte vi tre separate queries fra route-laget, hvilket gav
  // race conditions hvis to brugere signalerede samtidig:
  // 1) Begge sender signal samtidigt
  // 2) Begge hasMutualInterest-tjek ser den andens signal
  // 3) Begge forsøger ensureConversation → ON CONFLICT DO UPDATE
  //    der dog kan ende med inkonsistent origin.
  //
  // Vi løser det ved at:
  // - Køre alt i én transaktion
  // - Bruge SELECT FOR UPDATE på interest_signal-rækken (eller låse via
  //   pg_advisory_xact_lock på det sorterede user-par) for at serialisere
  //   concurrent signaler mellem samme par.
  //
  // Vi vælger pg_advisory_xact_lock med en hash af de to user-ids
  // (sorteret) — det er billigere end at låse hele interest_signal-tabellen
  // og garanterer at to processer for samme par kører sekventielt.
  //
  // conversation_origin bevares hvis conversation allerede findes (en
  // tidligere shared_event-conversation skal ikke degraderes til
  // mutual_interest selv om der nu også er gensidig interesse).
  async signalInterestAndOpenIfMutual(
    fromUserId: string,
    toUserId: string
  ): Promise<{ signal: InterestSignal; conversation: Conversation | null }> {
    const [a, b] = pair(fromUserId, toUserId);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Advisory-lock på det sorterede par — hashCode af "a|b" via
      // hashtext() der er deterministisk pr. par. To processer der vil
      // signalere mellem samme par serialiseres her.
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`${a}|${b}`]);

      // 1) Indsæt signalet (idempotent via ON CONFLICT).
      const inserted = await client.query(
        `INSERT INTO interest_signal (from_user_id, to_user_id)
         VALUES ($1, $2)
         ON CONFLICT (from_user_id, to_user_id) WHERE withdrawn_at IS NULL DO NOTHING
         RETURNING id, from_user_id, to_user_id, created_at, withdrawn_at`,
        [fromUserId, toUserId]
      );
      let signalRow = inserted.rows[0];
      if (!signalRow) {
        const existing = await client.query(
          `SELECT id, from_user_id, to_user_id, created_at, withdrawn_at
           FROM interest_signal
           WHERE from_user_id = $1 AND to_user_id = $2 AND withdrawn_at IS NULL
           LIMIT 1`,
          [fromUserId, toUserId]
        );
        signalRow = existing.rows[0];
      }
      const signal = rowToInterest(signalRow);

      // 2) Tjek mutual interest under låsen. PostgreSQL tillader IKKE
      //    FOR UPDATE direkte sammen med aggregate (COUNT) — derfor
      //    låser vi rækkerne i en subquery og tæller bagefter.
      //    pg_advisory_xact_lock (line 274) serialiserer i forvejen
      //    parallelle signaler for samme par, men FOR UPDATE giver
      //    forsvar i dybden mod fremtidige bugs der ikke ville bruge
      //    den samme advisory-lock-key.
      const mutualResult = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM (
           SELECT 1 FROM interest_signal
           WHERE withdrawn_at IS NULL
             AND ((from_user_id = $1 AND to_user_id = $2)
               OR (from_user_id = $2 AND to_user_id = $1))
           FOR UPDATE
         ) locked`,
        [fromUserId, toUserId]
      );
      const isMutual = Number(mutualResult.rows[0]?.count ?? 0) >= 2;

      let conversation: Conversation | null = null;
      if (isMutual) {
        // 3) Insert conversation. ON CONFLICT bevarer eksisterende origin
        //    (vi sætter origin = conversation.origin, hvilket lader en
        //    tidligere shared_event-conversation forblive shared_event).
        const conversationResult = await client.query(
          `INSERT INTO conversation (user_a_id, user_b_id, origin, origin_event_id)
           VALUES ($1, $2, 'mutual_interest', NULL)
           ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET origin = conversation.origin
           RETURNING id, user_a_id, user_b_id, origin, origin_event_id, last_message_at, closed_at, created_at`,
          [a, b]
        );
        conversation = rowToConversation(conversationResult.rows[0]);
      }

      await client.query("COMMIT");
      return { signal, conversation };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async withdrawInterest(fromUserId: string, toUserId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE interest_signal SET withdrawn_at = NOW()
       WHERE from_user_id = $1 AND to_user_id = $2 AND withdrawn_at IS NULL`,
      [fromUserId, toUserId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async hasMutualInterest(userIdA: string, userIdB: string): Promise<boolean> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM interest_signal
       WHERE withdrawn_at IS NULL
         AND ((from_user_id = $1 AND to_user_id = $2)
           OR (from_user_id = $2 AND to_user_id = $1))`,
      [userIdA, userIdB]
    );
    return Number(result.rows[0]?.count ?? 0) >= 2;
  }

  async listIncomingInterest(userId: string): Promise<InterestSignal[]> {
    const result = await this.pool.query(
      `SELECT id, from_user_id, to_user_id, created_at, withdrawn_at
       FROM interest_signal
       WHERE to_user_id = $1 AND withdrawn_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(rowToInterest);
  }

  async listOutgoingInterest(userId: string): Promise<InterestSignal[]> {
    const result = await this.pool.query(
      `SELECT id, from_user_id, to_user_id, created_at, withdrawn_at
       FROM interest_signal
       WHERE from_user_id = $1 AND withdrawn_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(rowToInterest);
  }

  async listMatches(userId: string): Promise<string[]> {
    const result = await this.pool.query<{ other_id: string }>(
      `SELECT DISTINCT
         CASE WHEN s1.from_user_id = $1 THEN s1.to_user_id ELSE s1.from_user_id END AS other_id
       FROM interest_signal s1
       JOIN interest_signal s2
         ON s1.from_user_id = s2.to_user_id
         AND s1.to_user_id = s2.from_user_id
         AND s2.withdrawn_at IS NULL
       WHERE s1.withdrawn_at IS NULL
         AND ($1 IN (s1.from_user_id, s1.to_user_id))`,
      [userId]
    );
    return result.rows.map((row) => row.other_id);
  }

  async ensureConversation(
    userA: string,
    userB: string,
    origin: ConversationOrigin,
    originEventId: string | null
  ): Promise<Conversation> {
    const [a, b] = pair(userA, userB);
    const result = await this.pool.query(
      `INSERT INTO conversation (user_a_id, user_b_id, origin, origin_event_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET origin = conversation.origin
       RETURNING id, user_a_id, user_b_id, origin, origin_event_id, last_message_at, closed_at, created_at`,
      [a, b, origin, originEventId]
    );
    return rowToConversation(result.rows[0]);
  }

  async getConversationByUsers(userA: string, userB: string): Promise<Conversation | null> {
    const [a, b] = pair(userA, userB);
    const result = await this.pool.query(
      `SELECT id, user_a_id, user_b_id, origin, origin_event_id, last_message_at, closed_at, created_at
       FROM conversation WHERE user_a_id = $1 AND user_b_id = $2 LIMIT 1`,
      [a, b]
    );
    return result.rows[0] ? rowToConversation(result.rows[0]) : null;
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    const result = await this.pool.query(
      `SELECT id, user_a_id, user_b_id, origin, origin_event_id, last_message_at, closed_at, created_at
       FROM conversation WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ? rowToConversation(result.rows[0]) : null;
  }

  async listConversations(
    userId: string,
    options?: { limit?: number; offset?: number }
  ) {
    // Issue B15: pagination med limit/offset (default 20, max 100).
    const limit = Math.max(1, Math.min(100, options?.limit ?? 20));
    const offset = Math.max(0, options?.offset ?? 0);
    const [itemsResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT c.id, c.user_a_id, c.user_b_id, c.origin, c.origin_event_id,
                c.last_message_at, c.closed_at, c.created_at,
                CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END AS other_user_id,
                COALESCE((SELECT COUNT(*) FROM message m
                          WHERE m.conversation_id = c.id
                            AND m.sender_user_id <> $1
                            AND m.read_at IS NULL), 0)::text AS unread_count
         FROM conversation c
         WHERE ($1 = c.user_a_id OR $1 = c.user_b_id)
         ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM conversation c
         WHERE ($1 = c.user_a_id OR $1 = c.user_b_id)`,
        [userId]
      )
    ]);
    return {
      items: itemsResult.rows.map((row) => ({
        ...rowToConversation(row),
        other_user_id: String(row.other_user_id),
        unread_count: Number(row.unread_count)
      })),
      total: Number(countResult.rows[0]?.count ?? 0)
    };
  }

  async postMessage(
    conversationId: string,
    senderUserId: string,
    body: string
  ): Promise<Message> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO message (conversation_id, sender_user_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, conversation_id, sender_user_id, body, sent_at, read_at`,
        [conversationId, senderUserId, body]
      );
      await client.query(
        `UPDATE conversation SET last_message_at = NOW() WHERE id = $1`,
        [conversationId]
      );
      await client.query("COMMIT");
      return rowToMessage(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listMessages(conversationId: string, limit: number): Promise<Message[]> {
    const result = await this.pool.query(
      `SELECT id, conversation_id, sender_user_id, body, sent_at, read_at
       FROM message WHERE conversation_id = $1 ORDER BY sent_at DESC LIMIT $2`,
      [conversationId, limit]
    );
    return result.rows.map(rowToMessage).reverse();
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE message SET read_at = NOW()
       WHERE conversation_id = $1 AND sender_user_id <> $2 AND read_at IS NULL`,
      [conversationId, userId]
    );
  }

  async postEventComment(eventId: string, userId: string, body: string): Promise<EventPost> {
    const result = await this.pool.query(
      `INSERT INTO event_post (event_id, author_user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, event_id, author_user_id, body, posted_at, edited_at, deleted_at, hidden_by_admin_at`,
      [eventId, userId, body]
    );
    return rowToEventPost(result.rows[0]);
  }

  async listEventPosts(eventId: string): Promise<EventPost[]> {
    const result = await this.pool.query(
      `SELECT id, event_id, author_user_id, body, posted_at, edited_at, deleted_at, hidden_by_admin_at
       FROM event_post
       WHERE event_id = $1 AND deleted_at IS NULL AND hidden_by_admin_at IS NULL
       ORDER BY posted_at`,
      [eventId]
    );
    return result.rows.map(rowToEventPost);
  }

  async deleteEventPost(id: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE event_post SET deleted_at = NOW()
       WHERE id = $1 AND author_user_id = $2 AND deleted_at IS NULL`,
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async hideEventPost(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE event_post SET hidden_by_admin_at = NOW() WHERE id = $1`,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getEventPostById(id: string): Promise<EventPost | null> {
    const result = await this.pool.query(
      `SELECT id, event_id, author_user_id, body, posted_at, edited_at, deleted_at, hidden_by_admin_at
       FROM event_post WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return rowToEventPost(result.rows[0]);
  }

  async block(blockerId: string, blockedId: string, reason: string | null): Promise<UserBlock> {
    const result = await this.pool.query(
      `INSERT INTO user_block (blocker_user_id, blocked_user_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (blocker_user_id, blocked_user_id) DO UPDATE SET reason = COALESCE($3, user_block.reason)
       RETURNING id, blocker_user_id, blocked_user_id, reason, created_at`,
      [blockerId, blockedId, reason]
    );
    return rowToBlock(result.rows[0]);
  }

  async unblock(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM user_block WHERE blocker_user_id = $1 AND blocked_user_id = $2`,
      [blockerId, blockedId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM user_block
       WHERE (blocker_user_id = $1 AND blocked_user_id = $2)
          OR (blocker_user_id = $2 AND blocked_user_id = $1)`,
      [blockerId, blockedId]
    );
    return Number(result.rows[0]?.count ?? 0) > 0;
  }

  async listBlocked(userId: string): Promise<UserBlock[]> {
    const result = await this.pool.query(
      `SELECT id, blocker_user_id, blocked_user_id, reason, created_at
       FROM user_block WHERE blocker_user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(rowToBlock);
  }

  async createReport(input: {
    reporter_user_id: string;
    reported_user_id?: string | null;
    reported_message_id?: string | null;
    reported_event_post_id?: string | null;
    reason: string;
    details?: string | null;
  }): Promise<UserReport> {
    const result = await this.pool.query(
      `INSERT INTO user_report (
         reporter_user_id, reported_user_id, reported_message_id, reported_event_post_id,
         reason, details
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, reporter_user_id, reported_user_id, reported_message_id, reported_event_post_id,
                 reason, details, status, created_at, reviewed_at, reviewed_by_admin_id, resolution_notes`,
      [
        input.reporter_user_id,
        input.reported_user_id ?? null,
        input.reported_message_id ?? null,
        input.reported_event_post_id ?? null,
        input.reason,
        input.details ?? null
      ]
    );
    return rowToReport(result.rows[0]);
  }

  async listOpenReports(options?: { limit?: number; offset?: number }): Promise<{
    items: UserReport[];
    total: number;
  }> {
    // Issue B15: pagination med limit/offset (default 20, max 100).
    const limit = Math.max(1, Math.min(100, options?.limit ?? 20));
    const offset = Math.max(0, options?.offset ?? 0);
    const [itemsResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT id, reporter_user_id, reported_user_id, reported_message_id, reported_event_post_id,
                reason, details, status, created_at, reviewed_at, reviewed_by_admin_id, resolution_notes
         FROM user_report WHERE status = 'open' ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM user_report WHERE status = 'open'`
      )
    ]);
    return {
      items: itemsResult.rows.map(rowToReport),
      total: Number(countResult.rows[0]?.count ?? 0)
    };
  }

  async resolveReport(
    id: string,
    adminId: string,
    status: "reviewed" | "dismissed" | "actioned",
    notes: string | null
  ): Promise<UserReport | null> {
    const result = await this.pool.query(
      `UPDATE user_report
       SET status = $2, reviewed_by_admin_id = $3, reviewed_at = NOW(), resolution_notes = $4
       WHERE id = $1
       RETURNING id, reporter_user_id, reported_user_id, reported_message_id, reported_event_post_id,
                 reason, details, status, created_at, reviewed_at, reviewed_by_admin_id, resolution_notes`,
      [id, status, adminId, notes]
    );
    return result.rows[0] ? rowToReport(result.rows[0]) : null;
  }
}
