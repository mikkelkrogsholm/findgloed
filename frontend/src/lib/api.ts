const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4564";

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
    })
};
