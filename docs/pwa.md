# Moobi PWA and offline boundary

Moobi is installable as a Progressive Web App on browsers that support web app
installation. The installed experience uses the same virtual-phone state and
browser storage as the website for that origin.

## What works offline

The service worker caches only the root application shell, its versioned Next.js
static files, the PWA icons, and the small set of images needed to present the
initial phone. After one successful production load, reopening the installed app
without a connection can start the shell and restore locally persisted state.

The cache is versioned. A new worker prepares a complete replacement before it
activates, then removes only older `moobi-shell-*` caches. Development builds do
not register the worker, which avoids stale local assets while building Moobi.

## What stays network-only

The worker does not intercept or cache:

- API routes, authentication, or account-specific Store responses;
- external sites opened in Browser;
- weather, news, search, music catalogs, or audio streams;
- private/public mini-app packages or the separate mini-app runtime;
- arbitrary same-origin requests outside the explicit shell allowlist.

Those features keep their existing loading, empty, and error behavior when the
network is unavailable. An installed mini app is not promised to launch offline;
that requires a separately reviewed package/runtime strategy. Installing Moobi
does not grant access to the visitor's physical phone hardware.

## Release checks

Run a production build and serve it over HTTPS (or localhost). In browser
developer tools, verify that `/manifest.webmanifest` is valid, `/sw.js` controls
the root scope, install icons are present, and a reload of `/` works after the
network is disabled. Separately confirm that `/api/*` and mini-app runtime
requests are absent from Cache Storage.
