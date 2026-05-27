type RegisterSWOptions = {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: () => void;
  onRegisteredSW?: () => void;
  onRegisterError?: (error: unknown) => void;
};

export function registerSW(_options?: RegisterSWOptions): (reload?: boolean) => Promise<void> {
  return async () => {};
}
