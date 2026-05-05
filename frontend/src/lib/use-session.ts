import { useEffect, useState } from "react";

import { api, type OwnProfile } from "@/lib/api";

export type SessionState =
  | { status: "loading"; profile: null }
  | { status: "anonymous"; profile: null }
  | { status: "authenticated"; profile: OwnProfile };

type Listener = (state: SessionState) => void;

let cachedState: SessionState = { status: "loading", profile: null };
const listeners = new Set<Listener>();
let fetchInFlight: Promise<void> | null = null;

function emit(next: SessionState): void {
  cachedState = next;
  for (const listener of listeners) {
    listener(cachedState);
  }
}

export async function refreshSession(): Promise<void> {
  if (fetchInFlight) return fetchInFlight;
  fetchInFlight = (async () => {
    const result = await api.getMe();
    if (result.ok) {
      emit({ status: "authenticated", profile: result.profile });
    } else {
      emit({ status: "anonymous", profile: null });
    }
  })().finally(() => {
    fetchInFlight = null;
  });
  return fetchInFlight;
}

export function clearSession(): void {
  emit({ status: "anonymous", profile: null });
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>(cachedState);

  useEffect(() => {
    listeners.add(setState);
    if (cachedState.status === "loading") {
      void refreshSession();
    }
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}
