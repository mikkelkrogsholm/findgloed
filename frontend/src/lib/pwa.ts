import { registerSW } from "virtual:pwa-register";

type PwaListener = (state: PwaState) => void;

export type PwaState = {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: (reload?: boolean) => Promise<void>;
};

const listeners = new Set<PwaListener>();
let currentState: PwaState = {
  needRefresh: false,
  offlineReady: false,
  updateServiceWorker: async () => {}
};

function emit() {
  for (const listener of listeners) {
    listener(currentState);
  }
}

export function initPwa(): void {
  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      currentState = { ...currentState, needRefresh: true };
      emit();
    },
    onOfflineReady() {
      currentState = { ...currentState, offlineReady: true };
      emit();
    }
  });

  currentState = {
    ...currentState,
    updateServiceWorker: async (reload = true) => {
      await updateServiceWorker(reload);
    }
  };
  emit();
}

export function subscribePwa(listener: PwaListener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}
