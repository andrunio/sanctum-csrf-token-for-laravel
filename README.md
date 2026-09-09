# Sanctum CSRF Token for Laravel

[![CI](https://github.com/andrunio/sanctum-csrf-token-for-laravel/actions/workflows/ci.yml/badge.svg)](https://github.com/andrunio/sanctum-csrf-token-for-laravel/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/andrunio/sanctum-csrf-token-for-laravel)](https://github.com/andrunio/sanctum-csrf-token-for-laravel/releases/latest)

A Dynamic Value extension for [RapidAPI for Mac](https://paw.cloud) (formerly Paw) that reads the
`XSRF-TOKEN` cookie of the current request, URL-decodes it and returns the raw token — ready to be
dropped into the `X-XSRF-TOKEN` header.

## Why

Laravel Sanctum's SPA authentication is cookie-based and CSRF-protected:

1. The client calls `GET /sanctum/csrf-cookie`. Sanctum responds with an `XSRF-TOKEN` cookie whose
   value is **URL-encoded**.
2. Every subsequent state-changing request must send that value back, **decoded**, in the
   `X-XSRF-TOKEN` header. Laravel compares it against the session token and answers
   `419 CSRF token mismatch` when it does not match.

In a browser an HTTP library such as Axios does step 2 automatically. In an API client you have to do
it by hand, and the token changes on every session refresh. This extension resolves the header value
at request time, so the token is never copy-pasted.

## Requirements

RapidAPI for Mac 4.x (or any Paw 3.x build) on macOS.

## Installation

1. Download `com.andrunio.SanctumCsrfTokenForLaravel.zip` from the
   [latest release](https://github.com/andrunio/sanctum-csrf-token-for-laravel/releases/latest).
2. Open **Preferences ‣ Extensions ‣ Open Extensions Directory**.
3. Unzip the archive there and restart the app.

The archive already has the layout the app expects — a folder named after the extension identifier,
holding a `.js` file named after the identifier's last component:

```
Extensions/
  com.andrunio.SanctumCsrfTokenForLaravel/
    SanctumCsrfTokenForLaravel.js
```

From a clone, create that folder by hand and copy `SanctumCsrfTokenForLaravel.js` into it.

## Usage

1. Create a request for `GET /sanctum/csrf-cookie` and send it once. The app stores the returned
   cookies and replays them on later requests to the same domain.
2. In the request that needs CSRF protection, add a header named `X-XSRF-TOKEN`.
3. Right-click the header's value field, choose **Extensions ‣ Sanctum CSRF Token for Laravel**.
4. Send the request. The extension reads the `Cookie` header the app is about to send, extracts
   `XSRF-TOKEN` and returns the decoded token.

The header is read from the *current* request, so no source request has to be selected and nothing
breaks when the session is refreshed.

Returns an empty string when the request carries no `XSRF-TOKEN` cookie — a `419` response then means
step 1 has not been done for this domain.

## Laravel side

The token is only issued and accepted when the API treats the client as stateful:

- the client's domain is listed in `SANCTUM_STATEFUL_DOMAINS` (`config/sanctum.php`);
- `supports_credentials` is `true` in `config/cors.php`;
- SPA and API share a common top-level domain, so the cookie is sent along.

## Doing the same without this extension

The same value can be assembled from a chain of three dynamic values, the officially documented route
for pulling a CSRF token out of a response (RegExp Match is an official extension, not a built-in):

**Response Header** (`Set-Cookie` of the `/sanctum/csrf-cookie` request) → **RegExp Match**
(`XSRF-TOKEN=([^;]+)`, capture group 1) → **URL Encoding** in *Decode* mode.

It works, but it has to be pointed at a specific source request and rebuilt in every header field.
This extension collapses the chain into a single token.

## Development

The `.js` file is the shipped artifact and is loaded verbatim, so there is no build step. Checks:

```
node --check SanctumCsrfTokenForLaravel.js
node --test
```

They cover cookie parsing, the static fields the host requires and the agreement between this README
and the code. CI runs them on every push; pushing a `v*` tag packages the extension folder and publishes
it as a release.

## License

MIT — see [LICENSE](LICENSE).
