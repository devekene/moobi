"use client";

import { useEffect, useMemo, useState } from "react";
import { useInstalledAppsStore } from "@/stores/useInstalledAppsStore";
import { usePhoneStore } from "@/stores/usePhoneStore";
import {
  downloadPrivateRelease,
  notifyPrivateStoreChange,
  privateRequest,
} from "@/lib/private-store-client";
import {
  parseMiniAppPackage,
  type MiniAppPackage,
} from "@/lib/mini-app-package";
import { externalAppId } from "@/lib/phone-apps";
import type { PrivateRelease } from "@/lib/private-store-contract";
import InstallConfirmation from "./InstallConfirmation";
import { compareVersions, newestRelease } from "@/lib/store-catalog";
import SandboxFrame from "./SandboxFrame";
import styles from "./private-store.module.css";
import { installationRepository } from "@/lib/mini-app-installations";

function PrivateAppLibrarySession() {
  const state = useInstalledAppsStore();
  const [action, setAction] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [developer, setDeveloper] = useState(false);
  const [uninstall, setUninstall] = useState<string | null>(null);
  const [deleteData, setDeleteData] = useState(false);
  const [preview, setPreview] = useState<{
    app: MiniAppPackage;
    accountId: string;
  } | null>(null);
  const [previewed, setPreviewed] = useState<Set<string>>(new Set());
  const userId = state.user?.id;
  const previewStorage = useMemo(
    () => (userId ? installationRepository.storage(userId, true) : undefined),
    [userId],
  );
  useEffect(() => {
    if (userId) void useInstalledAppsStore.getState().loadCatalog();
  }, [userId]);
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
  const authenticate = (form: HTMLFormElement) => {
    const data = new FormData(form);
    void run(async () => {
      await privateRequest("session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      form.reset();
      await state.refresh();
      notifyPrivateStoreChange("auth");
      if (!useInstalledAppsStore.getState().user)
        setMessage(
          action === "signup"
            ? "Check your email to confirm your account, then sign in."
            : "Check your email confirmation and try signing in again.",
        );
    });
  };
  const previewRelease = async (release: PrivateRelease) => {
    if (!state.runtimeOrigin)
      throw new Error("The separate app runtime is not configured yet.");
    const source = await downloadPrivateRelease(
      release,
      new AbortController().signal,
      () => {},
    );
    setPreview({ app: parseMiniAppPackage(source), accountId: userId ?? "" });
    setPreviewed((previous) => new Set([...previous, release.id]));
  };
  if (preview && state.runtimeOrigin && preview.accountId === userId)
    return (
      <SandboxFrame
        app={preview.app}
        storage={previewStorage}
        runtimeOrigin={state.runtimeOrigin}
        onStop={() => setPreview(null)}
      />
    );
  return (
    <section
      className={styles.library}
      aria-label="Private app library"
      data-private-preview
    >
      <header>
        <p className={styles.eyebrow}>YOUR MOOBI LIBRARY</p>
        <h1>My apps</h1>
        <p>Your account library, private releases, and updates.</p>
      </header>
      {(failure || state.error || state.catalogError) && (
        <p role="alert" className={styles.notice}>
          {failure || state.error || state.catalogError}
        </p>
      )}
      {state.updateNotice && (
        <p role="status" className={styles.notice}>
          {state.updateNotice}
        </p>
      )}
      {message && (
        <p role="status" className={styles.notice}>
          {message}
        </p>
      )}
      {state.loading ? (
        <p role="status">Opening your account…</p>
      ) : !state.configured ? (
        <div className={styles.card}>
          <h2>Not available yet</h2>
          <p>
            Private accounts and publishing have not been enabled on this
            deployment.
          </p>
          <button type="button" onClick={() => void state.refresh()}>
            Check again
          </button>
        </div>
      ) : !state.user ? (
        <form
          className={styles.card}
          onSubmit={(event) => {
            event.preventDefault();
            authenticate(event.currentTarget);
          }}
        >
          <h2>
            {action === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={
                action === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <p>Use a password of at least 12 characters.</p>
          <button className={styles.primary} disabled={busy}>
            {busy
              ? "Working…"
              : action === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setAction(action === "signin" ? "signup" : "signin")}
          >
            {action === "signin"
              ? "Create an account"
              : "I already have an account"}
          </button>
        </form>
      ) : (
        <>
          <div className={styles.account}>
            <span>{state.user.email}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  state.cancelInstall();
                  await privateRequest("session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "signout" }),
                  });
                  state.clearSession();
                  notifyPrivateStoreChange("auth");
                  setPreview(null);
                  setPreviewed(new Set());
                })
              }
            >
              Sign out
            </button>
          </div>
          <div className={styles.tabs}>
            <button
              type="button"
              aria-pressed={!developer}
              onClick={() => setDeveloper(false)}
            >
              My apps
            </button>
            <button
              type="button"
              aria-pressed={developer}
              onClick={() => setDeveloper(true)}
            >
              Developer
            </button>
          </div>
          {!state.publishingEnabled && (
            <p role="status">
              Publishing and new installations are unavailable until the private
              app service is enabled.
            </p>
          )}
          {state.brokenAppIds.map((appId) => (
            <section key={appId} className={styles.card}>
              <h2>App files need repair</h2>
              <p>
                {appId}: the saved package could not be verified. Remove its
                installation entry, then download again. Saved app data will be
                kept.
              </p>
              <button
                disabled={busy}
                onClick={() => void run(() => state.uninstall(appId, false))}
              >
                Remove broken installation
              </button>
            </section>
          ))}
          {developer && state.publishingEnabled && (
            <form
              className={styles.card}
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                void run(async () => {
                  await privateRequest("apps", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: data.get("id"),
                      name: data.get("name"),
                      description: data.get("description"),
                    }),
                  });
                  form.reset();
                  await state.loadCatalog();
                  setMessage("App created. Upload its first package below.");
                });
              }}
            >
              <h2>Create an app</h2>
              <label>
                App ID
                <input
                  name="id"
                  required
                  pattern="[a-z][a-z0-9.\-]{2,63}"
                  placeholder="yourname.appname"
                  maxLength={64}
                />
              </label>
              <label>
                Name
                <input name="name" required maxLength={60} />
              </label>
              <label>
                Description
                <textarea name="description" maxLength={1000} />
              </label>
              <button disabled={busy}>Create app</button>
            </form>
          )}
          <InstallConfirmation busy={busy} run={run} />
          {state.catalog.apps
            .filter((app) => !developer || app.ownerId === userId)
            .map((app) => {
              const releases = state.catalog.releases.filter(
                (release) => release.appId === app.id,
              );
              const published = newestRelease(
                state.publicStoreEnabled
                  ? releases.filter((release) =>
                      state.storeCatalog.availableReleaseIds.includes(
                        release.id,
                      ),
                    )
                  : releases,
                app.id,
              );
              const control = state.storeCatalog.controls.find(
                (entry) => entry.appId === app.id,
              );
              const installed = state.installations.find(
                (entry) => entry.app.id === app.id,
              );
              const mine = app.ownerId === userId;
              return (
                <article key={app.id} className={styles.card}>
                  <p className={styles.eyebrow}>
                    {mine ? "YOUR APP" : "SHARED WITH YOU"}
                  </p>
                  <h2>{app.name}</h2>
                  <p>{app.description || app.id}</p>
                  {control?.suspended && (
                    <p role="alert">
                      App suspended: {control.reason}. Saved data is kept.
                    </p>
                  )}
                  {installed ? (
                    <>
                      <p>Installed v{installed.release.version}</p>
                      {state.publicStoreEnabled &&
                        !state.storeCatalog.availableReleaseIds.includes(
                          installed.release.id,
                        ) && (
                          <p role="status">
                            This installed release is unavailable or revoked.
                            Your data is kept; install an available newer
                            version or wait for access to be restored.
                          </p>
                        )}
                      {published &&
                        compareVersions(
                          published.version,
                          installed.release.version,
                        ) > 0 && (
                          <button
                            disabled={busy || Boolean(state.downloading)}
                            onClick={() =>
                              void run(() =>
                                state.prepareInstall(published, true),
                              )
                            }
                          >
                            Update to v{published.version}
                          </button>
                        )}
                      {state.publicStoreEnabled && (
                        <label className={styles.check}>
                          <input
                            type="checkbox"
                            checked={installed.autoUpdate === true}
                            disabled={busy}
                            onChange={(event) => {
                              const enabled = event.target.checked;
                              void run(() =>
                                state.setAutoUpdate(app.id, enabled),
                              );
                            }}
                          />
                          Automatically update when I open the Store
                        </label>
                      )}
                      {installed.rollbackVersion && (
                        <button
                          disabled={busy}
                          onClick={() => void run(() => state.rollback(app.id))}
                        >
                          Restore v{installed.rollbackVersion} (keep data)
                        </button>
                      )}

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
                      <button
                        disabled={busy}
                        onClick={() => {
                          setUninstall(app.id);
                          setDeleteData(false);
                        }}
                      >
                        Uninstall
                      </button>
                    </>
                  ) : published ? (
                    <>
                      <p>
                        v{published.version} ·{" "}
                        {Math.ceil(published.byteSize / 1024)} KiB
                      </p>
                      <button
                        className={styles.primary}
                        disabled={
                          busy ||
                          Boolean(state.downloading) ||
                          !state.publishingEnabled
                        }
                        onClick={() =>
                          void run(() => state.prepareInstall(published))
                        }
                      >
                        Get
                      </button>
                    </>
                  ) : (
                    <p>No published release yet.</p>
                  )}
                  {uninstall === app.id && (
                    <section aria-label={`Uninstall ${app.name}`}>
                      <p>
                        Remove the downloaded app from this phone? Your account
                        library is kept.
                      </p>
                      <label className={styles.check}>
                        <input
                          type="checkbox"
                          checked={deleteData}
                          onChange={(event) =>
                            setDeleteData(event.target.checked)
                          }
                        />
                        Also delete its saved data from this browser
                      </label>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await state.uninstall(app.id, deleteData);
                            usePhoneStore
                              .getState()
                              .removeFromHistory(externalAppId(app.id));
                            setUninstall(null);
                            setMessage(
                              deleteData
                                ? "App and its saved data removed from this phone."
                                : "App removed. Saved data is kept for reinstalling.",
                            );
                          })
                        }
                      >
                        Confirm uninstall
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => setUninstall(null)}
                      >
                        Keep app
                      </button>
                    </section>
                  )}
                  {developer && mine && (
                    <>
                      <label>
                        Upload release (ZIP or Moobi JSON)
                        <input
                          type="file"
                          accept=".zip,.json,application/zip,application/json"
                          disabled={busy || !state.publishingEnabled}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            event.currentTarget.value = "";
                            if (!file) return;
                            void run(async () => {
                              const zip = file.name
                                .toLowerCase()
                                .endsWith(".zip");
                              if (file.size > (zip ? 524288 : 262144))
                                throw new Error(
                                  "Package exceeds the upload limit (512 KiB ZIP / 256 KiB JSON).",
                                );
                              await privateRequest(`apps/${app.id}/releases`, {
                                method: "POST",
                                headers: {
                                  "Content-Type": zip
                                    ? "application/zip"
                                    : "application/json",
                                },
                                body: await file.arrayBuffer(),
                              });
                              await state.loadCatalog();
                              setMessage(
                                "Release uploaded as a private draft. Preview it before publishing.",
                              );
                            });
                          }}
                        />
                      </label>
                      {releases.map((release) => (
                        <div className={styles.release} key={release.id}>
                          <p>
                            v{release.version} · {release.status}
                          </p>
                          <code>{release.digest.slice(0, 16)}…</code>
                          {state.storeCatalog.publications
                            .filter((entry) => entry.releaseId === release.id)
                            .map((publication) => (
                              <p key={publication.releaseId}>
                                Public review: {publication.status}.{" "}
                                {publication.notes}
                              </p>
                            ))}
                          {release.status === "published" &&
                            state.publicStoreEnabled &&
                            !state.storeCatalog.publications.some(
                              (entry) => entry.releaseId === release.id,
                            ) && (
                              <button
                                disabled={busy}
                                onClick={() =>
                                  void run(async () => {
                                    await privateRequest(
                                      `store/releases/${release.id}/submit`,
                                      { method: "POST" },
                                    );
                                    await state.loadCatalog();
                                    setMessage(
                                      "Submitted for public review. This release stays private until approved.",
                                    );
                                  })
                                }
                              >
                                Submit for public review
                              </button>
                            )}

                          <button
                            disabled={busy || !state.runtimeOrigin}
                            onClick={() =>
                              void run(() => previewRelease(release))
                            }
                          >
                            Preview v{release.version}
                          </button>
                          {release.status === "draft" && (
                            <button
                              disabled={
                                busy ||
                                !previewed.has(release.id) ||
                                !state.publishingEnabled
                              }
                              onClick={() =>
                                void run(async () => {
                                  await privateRequest(
                                    `releases/${release.id}/publish`,
                                    { method: "POST" },
                                  );
                                  await state.loadCatalog();
                                  setMessage(
                                    "Release published privately. Invited accounts can now install it.",
                                  );
                                })
                              }
                            >
                              Publish privately
                            </button>
                          )}
                        </div>
                      ))}
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = event.currentTarget;
                          const email = new FormData(form).get("email");
                          void run(async () => {
                            await privateRequest(`apps/${app.id}/invite`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ email }),
                            });
                            form.reset();
                            setMessage(
                              "Access granted. The recipient can sign in and find this app in Private apps.",
                            );
                          });
                        }}
                      >
                        <label>
                          Grant access by account email
                          <input
                            type="email"
                            name="email"
                            required
                            maxLength={254}
                          />
                        </label>
                        <button disabled={busy || !state.publishingEnabled}>
                          Grant access
                        </button>
                      </form>
                    </>
                  )}
                </article>
              );
            })}
          {!state.catalog.apps.some(
            (app) => !developer || app.ownerId === userId,
          ) && (
            <div className={styles.card}>
              <h2>
                {developer
                  ? "Build your first app"
                  : "Your library starts here"}
              </h2>
              <p>
                {developer
                  ? "Create an app above, then upload and preview a release."
                  : "Apps you create or receive access to will appear here."}
              </p>
            </div>
          )}
          {state.publicStoreEnabled && (
            <>
              <p>
                Library access follows your account across browsers. App files,
                saved data, recovery copies, and automatic-update choices stay
                on this browser; saved app data does not sync.
              </p>
              <button
                disabled={busy}
                onClick={() => void run(() => state.checkUpdates())}
              >
                Check for updates
              </button>
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await state.refresh();
                await state.loadCatalog();
              })
            }
          >
            Refresh library
          </button>
        </>
      )}
    </section>
  );
}

export default function PrivateAppLibrary() {
  const accountId = useInstalledAppsStore((state) => state.user?.id);
  // Account transitions dispose private package bytes and form/preview state.
  return <PrivateAppLibrarySession key={accountId ?? "signed-out"} />;
}
