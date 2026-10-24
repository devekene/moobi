"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInstalledAppsStore } from "@/stores/useInstalledAppsStore";
import { usePhoneStore } from "@/stores/usePhoneStore";
import {
  emptyStoreCatalog,
  newestRelease,
  parseStoreCatalog,
  compareVersions,
} from "@/lib/store-catalog";
import {
  downloadPrivateRelease,
  privateRequest,
} from "@/lib/private-store-client";
import { installationRepository } from "@/lib/mini-app-installations";
import {
  parseMiniAppPackage,
  type MiniAppPackage,
} from "@/lib/mini-app-package";
import { externalAppId } from "@/lib/phone-apps";
import InstallConfirmation from "./InstallConfirmation";
import SandboxFrame from "./SandboxFrame";
import styles from "./private-store.module.css";

export default function PublicAppStore({
  onAccount,
}: {
  onAccount: () => void;
}) {
  const state = useInstalledAppsStore();
  const [catalog, setCatalog] = useState(emptyStoreCatalog);
  const [query, setQuery] = useState("");
  const [reviews, setReviews] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<MiniAppPackage | null>(null);
  const [previewed, setPreviewed] = useState<Set<string>>(new Set());
  const userId = state.user?.id;
  const canReview = state.reviewer === true;
  const enabled = state.publicStoreEnabled === true;
  const refreshTicket = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = ++refreshTicket.current;
    try {
      const nextCatalog = parseStoreCatalog(
        await privateRequest(
          reviews && canReview ? "store/reviews" : "store/catalog",
        ),
      );
      if (ticket === refreshTicket.current) {
        setCatalog(nextCatalog);
        setFailure("");
      }
    } catch (error) {
      if (ticket === refreshTicket.current)
        setFailure(
          error instanceof Error ? error.message : "Could not load the Store.",
        );
    } finally {
      if (ticket === refreshTicket.current) setLoading(false);
    }
  }, [reviews, canReview]);
  useEffect(() => {
    let active = true;
    if (enabled)
      void Promise.resolve().then(() => {
        if (active) return refresh();
      });
    return () => {
      active = false;
      refreshTicket.current++;
    };
  }, [enabled, refresh]);
  useEffect(() => {
    if (userId && enabled) void useInstalledAppsStore.getState().checkUpdates();
  }, [userId, enabled]);
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setFailure("");
    setMessage("");
    try {
      await work();
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "This action failed. Retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  const apps = useMemo(
    () =>
      catalog.apps.filter((app) =>
        `${app.name} ${app.description} ${app.id}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [catalog, query],
  );
  if (preview && state.runtimeOrigin && userId)
    return (
      <>
        <section className={styles.library}>
          <h2>Review v{preview.manifest.version}</h2>
          <p>
            SDK {preview.manifest.sdkVersion} · Storage schema{" "}
            {preview.manifest.storageVersion ?? 1} · Permissions:{" "}
            {preview.manifest.permissions.join(", ") || "none"}
          </p>
        </section>
        <SandboxFrame
          app={preview}
          storage={installationRepository.storage(userId, true)}
          runtimeOrigin={state.runtimeOrigin}
          onStop={() => setPreview(null)}
        />
      </>
    );
  return (
    <section className={styles.library} aria-label="Community App Store">
      <header>
        <p className={styles.eyebrow}>MADE FOR YOUR MOOBI</p>
        <h1>{reviews ? "Review desk" : "Community apps"}</h1>
        <p>
          {reviews
            ? "Preview the exact package and record a decision. You cannot review your own app."
            : "Discover reviewed mini apps. Install them on your virtual phone."}
        </p>
      </header>
      {failure && (
        <p role="alert" className={styles.notice}>
          {failure}
        </p>
      )}
      {(message || state.updateNotice) && (
        <p role="status" className={styles.notice}>
          {message || state.updateNotice}
        </p>
      )}
      {!enabled ? (
        <div className={styles.card}>
          <h2>Community Store is being prepared</h2>
          <p>
            Community apps will be available here soon. Explore the bundled apps
            or visit your private library in the meantime.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.tabs}>
            <button onClick={onAccount}>
              {userId ? "My library & publishing" : "Sign in to install"}
            </button>
            {canReview && (
              <button
                aria-pressed={reviews}
                onClick={() => {
                  setReviews(!reviews);
                  setCatalog(emptyStoreCatalog());
                }}
              >
                {reviews ? "Browse apps" : "Review submissions"}
              </button>
            )}
          </div>
          <label>
            Search community apps
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or description"
            />
          </label>
          <button disabled={busy || loading} onClick={() => void refresh()}>
            Refresh Store
          </button>
          <InstallConfirmation busy={busy} run={run} />
          {loading ? (
            <p role="status">Loading apps…</p>
          ) : !apps.length ? (
            <div className={styles.card}>
              <h2>
                {reviews ? "No submissions yet" : "Room for the next great app"}
              </h2>
              <p>
                {query
                  ? "Try another search."
                  : "Approved releases will appear here. Private uploads stay private until reviewed."}
              </p>
            </div>
          ) : (
            apps.map((app) => {
              const releases = catalog.releases.filter(
                (release) => release.appId === app.id,
              );
              const available = releases.filter((release) =>
                catalog.availableReleaseIds.includes(release.id),
              );
              const latest = newestRelease(available, app.id);
              const installed = state.installations.find(
                (entry) => entry.app.id === app.id,
              );
              const update =
                installed &&
                latest &&
                compareVersions(latest.version, installed.release.version) > 0;
              const control = catalog.controls.find(
                (entry) => entry.appId === app.id,
              );
              return (
                <article key={app.id} className={styles.card}>
                  <p className={styles.eyebrow}>
                    {reviews ? app.id : "REVIEWED MINI APP"}
                  </p>
                  <h2>{app.name}</h2>
                  <p>{app.description || app.id}</p>
                  {!reviews && (
                    <>
                      {latest && (
                        <p>
                          v{latest.version} ·{" "}
                          {Math.ceil(latest.byteSize / 1024)} KiB · SDK 1
                        </p>
                      )}
                      {installed ? (
                        <>
                          <p>Installed v{installed.release.version}</p>
                          <button
                            className={styles.primary}
                            onClick={() =>
                              usePhoneStore
                                .getState()
                                .setCurrentScreen(externalAppId(app.id))
                            }
                          >
                            Open
                          </button>
                          {update && (
                            <button
                              disabled={busy || Boolean(state.downloading)}
                              onClick={() =>
                                void run(() =>
                                  state.prepareInstall(latest, true),
                                )
                              }
                            >
                              Update to v{latest.version}
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          className={styles.primary}
                          disabled={
                            busy || Boolean(state.downloading) || !latest
                          }
                          onClick={() => {
                            if (!userId) onAccount();
                            else if (latest)
                              void run(() => state.prepareInstall(latest));
                          }}
                        >
                          {userId ? "Get" : "Sign in to get"}
                        </button>
                      )}
                    </>
                  )}
                  {reviews && (
                    <>
                      {control?.suspended && (
                        <p role="status">Suspended: {control.reason}</p>
                      )}
                      {releases
                        .filter((release) =>
                          catalog.publications.some(
                            (entry) => entry.releaseId === release.id,
                          ),
                        )
                        .map((release) => {
                          const publication = catalog.publications.find(
                            (entry) => entry.releaseId === release.id,
                          );
                          return (
                            <section
                              key={release.id}
                              className={styles.release}
                            >
                              <h3>
                                v{release.version} · {publication?.status}
                              </h3>
                              <code>{release.digest}</code>
                              <p>{publication?.notes}</p>
                              <button
                                disabled={busy || !state.runtimeOrigin}
                                onClick={() =>
                                  void run(async () => {
                                    const source = await downloadPrivateRelease(
                                      release,
                                      new AbortController().signal,
                                      () => {},
                                      true,
                                    );
                                    setPreview(parseMiniAppPackage(source));
                                    setPreviewed(
                                      (ids) => new Set([...ids, release.id]),
                                    );
                                  })
                                }
                              >
                                Preview submitted v{release.version}
                              </button>
                              {(publication?.status === "pending" ||
                                publication?.status === "approved") &&
                                app.ownerId !== userId && (
                                  <form
                                    onSubmit={(event) => {
                                      event.preventDefault();
                                      const data = new FormData(
                                        event.currentTarget,
                                      );
                                      void run(async () => {
                                        await privateRequest(
                                          `store/releases/${release.id}/review`,
                                          {
                                            method: "POST",
                                            headers: {
                                              "Content-Type":
                                                "application/json",
                                            },
                                            body: JSON.stringify({
                                              decision: data.get("decision"),
                                              notes: data.get("notes"),
                                            }),
                                          },
                                        );
                                        await refresh();
                                        setMessage("Review decision saved.");
                                      });
                                    }}
                                  >
                                    <label>
                                      Review notes
                                      <textarea
                                        name="notes"
                                        required
                                        maxLength={1000}
                                      />
                                    </label>
                                    <label>
                                      Decision
                                      <select name="decision">
                                        {publication.status === "pending" ? (
                                          <>
                                            <option value="rejected">
                                              Reject
                                            </option>
                                            <option value="approved">
                                              Approve for public Store
                                            </option>
                                          </>
                                        ) : (
                                          <option value="revoked">
                                            Revoke this release
                                          </option>
                                        )}
                                      </select>
                                    </label>
                                    <button
                                      disabled={
                                        busy ||
                                        (publication.status === "pending" &&
                                          !previewed.has(release.id))
                                      }
                                    >
                                      Save review decision
                                    </button>
                                  </form>
                                )}
                            </section>
                          );
                        })}
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          const data = new FormData(event.currentTarget);
                          void run(async () => {
                            await privateRequest(
                              `store/apps/${app.id}/moderate`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  suspended: !control?.suspended,
                                  reason: data.get("reason"),
                                }),
                              },
                            );
                            await refresh();
                            setMessage("App availability updated.");
                          });
                        }}
                      >
                        <label>
                          Availability reason
                          <textarea name="reason" required maxLength={1000} />
                        </label>
                        <button disabled={busy}>
                          {control?.suspended
                            ? "Restore app availability"
                            : "Suspend this app"}
                        </button>
                      </form>
                    </>
                  )}
                </article>
              );
            })
          )}
        </>
      )}
    </section>
  );
}
