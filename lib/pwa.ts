export const MOOBI_SERVICE_WORKER_URL = "/sw.js";

type ServiceWorkerRegistrar = Pick<ServiceWorkerContainer, "register">;

export function registerMoobiServiceWorker(
  serviceWorker: ServiceWorkerRegistrar | undefined,
) {
  if (!serviceWorker) return undefined;

  return serviceWorker.register(MOOBI_SERVICE_WORKER_URL, {
    scope: "/",
    updateViaCache: "none",
  });
}
