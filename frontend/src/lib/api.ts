const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:39564";

export type InitiatorRole = "inviting" | "deciding" | "balanced";
export type FaceVisibility = "after_interest" | "all_verified";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type PhotoVisibility = "verified" | "match" | "private";
export type PhotoKind = "face" | "body" | "ambient" | "private";

export type ProfileSummary = {
  user_id: string;
  display_name: string | null;
  birth_year: number | null;
  age: number | null;
  region: string | null;
  bio: string | null;
  initiator_role: InitiatorRole | null;
  face_visibility: FaceVisibility;
  verification_status: VerificationStatus;
  onboarded_at: string | null;
  paused_at: string | null;
  can_see_face: boolean;
};

export type OwnProfile = ProfileSummary & {
  email: string;
  role: string | null;
  verified_at: string | null;
};

export type CoupleSummary = {
  id: string;
  primary_user_id: string;
  partner_user_id: string;
  display_name: string;
  bio: string | null;
  region: string | null;
  open_to_singles: boolean;
  accepts_mixed_events: boolean;
  paused_at: string | null;
};

export type PhotoSummary = {
  id: string;
  kind: PhotoKind;
  visibility: PhotoVisibility;
  url: string;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  position: number;
};

export type MeResponse = {
  ok: true;
  profile: OwnProfile;
  couple: CoupleSummary | null;
  photos: PhotoSummary[];
};

export type MembersResponse = {
  ok: true;
  members: Array<ProfileSummary & { photos: PhotoSummary[] }>;
};

export type MemberDetailResponse = {
  ok: true;
  profile: ProfileSummary;
  couple: CoupleSummary | null;
  photos: PhotoSummary[];
  relation: "self" | "verified" | "match" | "private_grant";
};

export type ApiError = {
  ok: false;
  code: string;
  message?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T | ApiError> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      ...init,
      headers: init?.body instanceof FormData
        ? { ...(init?.headers ?? {}) }
        : { "Content-Type": "application/json", ...(init?.headers ?? {}) }
    });

    const data = (await response.json().catch(() => null)) as T | ApiError | null;
    if (!data) {
      return { ok: false, code: "EMPTY_RESPONSE" };
    }
    return data;
  } catch {
    return { ok: false, code: "NETWORK_ERROR", message: "Kunne ikke forbinde til serveren." };
  }
}

export const api = {
  asset: (path: string) => `${API_URL}${path}`,

  getMe: () => request<MeResponse>("/api/me"),

  updateMe: (body: Partial<OwnProfile> & {
    display_name?: string | null;
    birth_year?: number | null;
    region?: string | null;
    bio?: string | null;
    initiator_role?: InitiatorRole | null;
    face_visibility?: FaceVisibility;
    complete_onboarding?: boolean;
    paused_at?: null | true;
  }) =>
    request<{ ok: true; profile: OwnProfile }>("/api/me", {
      method: "PATCH",
      body: JSON.stringify(body)
    }),

  deleteMe: (hard = false) =>
    request<{ ok: true }>("/api/me", {
      method: "DELETE",
      body: JSON.stringify({ hard_delete: hard })
    }),

  uploadPhoto: (file: File, kind: PhotoKind, visibility: PhotoVisibility, position = 0) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    fd.append("visibility", visibility);
    fd.append("position", String(position));
    return request<{ ok: true; photo: PhotoSummary }>("/api/me/photos", {
      method: "POST",
      body: fd
    });
  },

  deletePhoto: (id: string) =>
    request<{ ok: true }>(`/api/me/photos/${id}`, { method: "DELETE" }),

  uploadVerification: (idDocument: File, selfie: File) => {
    const fd = new FormData();
    fd.append("id_document", idDocument);
    fd.append("selfie", selfie);
    return request<{ ok: true; submission_id: string; status: string }>(
      "/api/me/verification",
      { method: "POST", body: fd }
    );
  },

  createCouple: (body: {
    partner_email: string;
    display_name: string;
    bio?: string | null;
    region?: string | null;
    open_to_singles?: boolean;
    accepts_mixed_events?: boolean;
  }) =>
    request<{ ok: true; couple: CoupleSummary }>("/api/couples", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  updateCouple: (
    id: string,
    body: Partial<{
      display_name: string;
      bio: string | null;
      region: string | null;
      open_to_singles: boolean;
      accepts_mixed_events: boolean;
      paused_at: null | true;
    }>
  ) =>
    request<{ ok: true; couple: CoupleSummary }>(`/api/couples/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),

  listMembers: () => request<MembersResponse>("/api/members"),
  getMember: (id: string) => request<MemberDetailResponse>(`/api/members/${id}`),
  grantPrivateAlbum: (recipient_user_id: string) =>
    request<{ ok: true }>("/api/me/album-grants", {
      method: "POST",
      body: JSON.stringify({ recipient_user_id })
    }),
  revokePrivateAlbum: (recipient_user_id: string) =>
    request<{ ok: true }>(`/api/me/album-grants/${recipient_user_id}`, {
      method: "DELETE"
    }),

  listPendingVerifications: () =>
    request<{
      ok: true;
      items: Array<{
        id: string;
        user_id: string;
        email: string;
        status: string;
        submitted_at: string;
      }>;
    }>("/api/admin/verifications"),

  approveVerification: (id: string) =>
    request<{ ok: true }>(`/api/admin/verifications/${id}/approve`, {
      method: "POST"
    }),

  rejectVerification: (id: string, reason: string) =>
    request<{ ok: true }>(`/api/admin/verifications/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason })
    }),

  // ---------- Events ----------
  listEvents: (filters: {
    category?: EventCategory;
    level?: EventLevel;
    region?: string;
    beginner_friendly?: boolean;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.level) params.set("level", filters.level);
    if (filters.region) params.set("region", filters.region);
    if (filters.beginner_friendly !== undefined) {
      params.set("beginner_friendly", String(filters.beginner_friendly));
    }
    const qs = params.toString();
    return request<{ ok: true; events: PublicEvent[] }>(
      `/api/events${qs ? `?${qs}` : ""}`
    );
  },

  getEvent: (slug: string) =>
    request<{ ok: true; event: PublicEvent }>(`/api/events/${slug}`),

  registerEvent: (slug: string) =>
    request<{ ok: true }>(`/api/events/${slug}/register`, { method: "POST" }),

  cancelEventRegistration: (slug: string) =>
    request<{ ok: true }>(`/api/events/${slug}/register`, { method: "DELETE" }),

  myEvents: () =>
    request<{
      ok: true;
      registrations: Array<{
        id: string;
        status: string;
        registered_at: string;
        event: PublicEvent;
      }>;
    }>("/api/me/events"),

  // Admin
  listAdminEvents: () =>
    request<{ ok: true; events: AdminEvent[] }>("/api/admin/events"),

  createEvent: (body: AdminEventInput) =>
    request<{ ok: true; event: AdminEvent }>("/api/admin/events", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  updateEvent: (id: string, body: Partial<AdminEventInput>) =>
    request<{ ok: true; event: AdminEvent }>(`/api/admin/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),

  deleteEvent: (id: string) =>
    request<{ ok: true }>(`/api/admin/events/${id}`, { method: "DELETE" }),

  listEventRegistrations: (id: string) =>
    request<{
      ok: true;
      registrations: Array<{
        id: string;
        user_id: string;
        couple_id: string | null;
        status: string;
        registered_at: string;
      }>;
    }>(`/api/admin/events/${id}/registrations`),

  // ---------- Messaging ----------
  signalInterest: (userId: string) =>
    request<{
      ok: true;
      signal: { id: string; from_user_id: string; to_user_id: string; created_at: string };
      conversation_opened: boolean;
    }>(`/api/me/interests/${userId}`, { method: "POST" }),

  withdrawInterest: (userId: string) =>
    request<{ ok: true }>(`/api/me/interests/${userId}`, { method: "DELETE" }),

  listInterests: () =>
    request<{
      ok: true;
      incoming: InterestSignal[];
      outgoing: InterestSignal[];
      matches: string[];
    }>("/api/me/interests"),

  listConversations: () =>
    request<{ ok: true; conversations: ConversationSummary[] }>("/api/conversations"),

  startConversation: (userId: string, eventSlug?: string) =>
    request<{ ok: true; conversation: { id: string } }>("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, event_slug: eventSlug })
    }),

  getConversation: (id: string) =>
    request<{
      ok: true;
      conversation: {
        id: string;
        origin: "mutual_interest" | "shared_event";
        other: { user_id: string; display_name: string | null; region: string | null } | null;
      };
      messages: Array<{
        id: string;
        sender_user_id: string;
        body: string;
        sent_at: string;
        read_at: string | null;
      }>;
    }>(`/api/conversations/${id}/messages`),

  sendMessage: (conversationId: string, body: string) =>
    request<{ ok: true; message: { id: string; sent_at: string } }>(
      `/api/conversations/${conversationId}/messages`,
      { method: "POST", body: JSON.stringify({ body }) }
    ),

  listEventPosts: (slug: string) =>
    request<{
      ok: true;
      posts: Array<{
        id: string;
        author: { user_id: string; display_name: string | null };
        body: string;
        posted_at: string;
        can_delete: boolean;
      }>;
    }>(`/api/events/${slug}/posts`),

  postEventComment: (slug: string, body: string) =>
    request<{ ok: true; post: { id: string } }>(`/api/events/${slug}/posts`, {
      method: "POST",
      body: JSON.stringify({ body })
    }),

  deleteEventPost: (slug: string, id: string) =>
    request<{ ok: true }>(`/api/events/${slug}/posts/${id}`, { method: "DELETE" }),

  blockUser: (userId: string, reason?: string) =>
    request<{ ok: true }>("/api/me/blocks", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, reason })
    }),

  unblockUser: (userId: string) =>
    request<{ ok: true }>(`/api/me/blocks/${userId}`, { method: "DELETE" }),

  reportUser: (
    body: {
      reported_user_id?: string;
      reported_message_id?: string;
      reported_event_post_id?: string;
      reason: string;
      details?: string;
    }
  ) =>
    request<{ ok: true }>("/api/reports", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  // ---------- Subscriptions ----------
  listPlans: () =>
    request<{ ok: true; audience: "single" | "couple"; plans: MembershipPlan[] }>(
      "/api/plans"
    ),

  getMySubscription: () =>
    request<{
      ok: true;
      subscription: ActiveSubscription | null;
      plan?: MembershipPlan;
    }>("/api/me/subscription"),

  startSubscription: (planId: string) =>
    request<{
      ok: true;
      subscription: ActiveSubscription;
      plan: MembershipPlan;
      mock_notice?: string;
    }>("/api/me/subscription", {
      method: "POST",
      body: JSON.stringify({ plan_id: planId })
    }),

  cancelSubscription: (id: string) =>
    request<{ ok: true; subscription: ActiveSubscription }>(
      `/api/me/subscription/${id}/cancel`,
      { method: "POST" }
    ),

  resumeSubscription: (id: string) =>
    request<{ ok: true; subscription: ActiveSubscription }>(
      `/api/me/subscription/${id}/resume`,
      { method: "POST" }
    )
};

export type MembershipPlan = {
  id: string;
  name: string;
  audience: "single" | "couple";
  monthly_price_cents: number;
  intro_price_cents: number | null;
  intro_months: number;
  trial_days: number;
};

export type ActiveSubscription = {
  id: string;
  user_id: string;
  plan_id: string;
  status: "pending" | "active" | "past_due" | "cancelled" | "trialing";
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  trial_ends_at: string | null;
  invoice_descriptor: string;
};

export type InterestSignal = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
};

export type ConversationSummary = {
  id: string;
  origin: "mutual_interest" | "shared_event";
  last_message_at: string | null;
  unread_count: number;
  other: { user_id: string; display_name: string | null; region: string | null };
};

export type EventCategory = "single_only" | "couple_only" | "mixed";
export type EventLevel = "sensual_social" | "sensual" | "explicit";

export type PublicEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  not_for: string | null;
  category: EventCategory;
  level: EventLevel;
  beginner_friendly: boolean;
  experience_required: boolean;
  facilitator_name: string;
  facilitator_credential: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  spots_taken: number;
  spots_left: number;
  price_cents: number;
  region: string | null;
  location_label: string | null;
  location_address: string | null;
  dresscode: string | null;
  exit_strategy: string | null;
  cover_path: string | null;
  status: string;
  is_registered: boolean;
};

export type AdminEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  not_for: string | null;
  category: EventCategory;
  level: EventLevel;
  beginner_friendly: boolean;
  experience_required: boolean;
  facilitator_name: string;
  facilitator_credential: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price_cents: number;
  region: string | null;
  location_label: string | null;
  location_address: string | null;
  dresscode: string | null;
  exit_strategy: string | null;
  status: string;
};

export type AdminEventInput = {
  slug?: string;
  title?: string;
  description?: string;
  not_for?: string | null;
  category?: EventCategory;
  level?: EventLevel;
  beginner_friendly?: boolean;
  experience_required?: boolean;
  facilitator_name?: string;
  facilitator_credential?: string | null;
  starts_at?: string;
  ends_at?: string;
  capacity?: number;
  price_cents?: number;
  region?: string | null;
  location_label?: string | null;
  location_address?: string | null;
  dresscode?: string | null;
  exit_strategy?: string | null;
  status?: "draft" | "published" | "cancelled" | "completed";
};
