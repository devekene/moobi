/** Combine simultaneous identical requests; failures are never retained. */
export function createSingleFlight<T>() {
  const pending = new Map<string, Promise<T>>();
  return (key: string, load: () => Promise<T>): Promise<T> => {
    const existing = pending.get(key);
    if (existing) return existing;
    const promise = Promise.resolve().then(load);
    pending.set(key, promise);
    const clear = () => {
      if (pending.get(key) === promise) pending.delete(key);
    };
    void promise.then(clear, clear);
    return promise;
  };
}
