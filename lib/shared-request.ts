/** Share one network call while letting individual tabs cancel their subscription. */
export function createSharedRequest<T>() {
  interface Pending {
    promise: Promise<T>;
    controller: AbortController;
    users: number;
    settled: boolean;
  }
  const pending = new Map<string, Pending>();
  return (
    key: string,
    signal: AbortSignal,
    load: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> => {
    if (signal.aborted) return Promise.reject(signal.reason);
    let job = pending.get(key);
    if (!job || job.controller.signal.aborted) {
      const controller = new AbortController();
      let promise: Promise<T>;
      try {
        promise = load(controller.signal);
      } catch (error) {
        promise = Promise.reject(error);
      }
      const created: Pending = {
        promise,
        controller,
        users: 0,
        settled: false,
      };
      job = created;
      pending.set(key, job);
      const settled = () => {
        created.settled = true;
        if (pending.get(key) === created) pending.delete(key);
      };
      void promise.then(settled, settled);
    }
    const current = job;
    current.users++;
    return new Promise<T>((resolve, reject) => {
      let done = false;
      const release = () => {
        if (done) return;
        done = true;
        signal.removeEventListener("abort", abort);
        current.users--;
        if (!current.users && !current.settled) {
          current.controller.abort();
          if (pending.get(key) === current) pending.delete(key);
        }
      };
      const abort = () => {
        release();
        reject(signal.reason);
      };
      signal.addEventListener("abort", abort, { once: true });
      void current.promise.then(
        (value) => {
          if (!done) {
            release();
            resolve(value);
          }
        },
        (error: unknown) => {
          if (!done) {
            release();
            reject(error);
          }
        },
      );
    });
  };
}
