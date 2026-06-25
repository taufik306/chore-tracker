---
tldr: Details the zero-trust security rules on the Firestore database level, Content Security Policy (CSP), and Guest mode data security.
---
# Security & Authorization Model

## Firestore Rules Security Model (`firestore.rules`)

We enforce zero-trust security rules on the Firestore database level. Direct access is prohibited unless:
- The user is fully authenticated.
- The document ID matches the validated payload schema.
- The `userId` attribute matches the caller's verified auth UID.

Crucial properties are write-protected against modified manipulations:
```javascript
allow update: if isSignedIn()
  && existing().userId == request.auth.uid
  && incoming().userId == request.auth.uid
  && incoming().id == existing().id
  && incoming().createdAt == existing().createdAt;
```

### Data Validation (`isValidChore`)

All create and update operations pass through a comprehensive `isValidChore(data)` validation function that enforces strict schema boundaries server-side:

| Field | Type | Constraint |
|---|---|---|
| `id` | `string` | Max 128 characters |
| `userId` | `string` | Must match `request.auth.uid` |
| `title` | `string` | 1–200 characters |
| `priority` | `string` | Enum: `low`, `medium`, `high` |
| `status` | `string` | Enum: `active`, `completed`, `cancelled` |
| `startTime` | `int` | Required |
| `createdAt` | `int` | Required, immutable on updates |
| `updatedAt` | `int` | Required |
| `limitMinutes` | `int` or `null` | Optional; if present: `> 0` and `<= 1440` (24 hours) |
| `completedAt` | `int` or `null` | Optional |

### Update Field Whitelist

Updates are further restricted to only allow modification of specific fields via `affectedKeys().hasOnly()`:
```javascript
incoming().diff(existing()).affectedKeys().hasOnly(
  ['title', 'priority', 'status', 'limitMinutes', 'completedAt', 'updatedAt']
)
```
This prevents clients from tampering with `id`, `userId`, `createdAt`, or `startTime` after creation.

## Content Security Policy (`index.html`)

A strict Content Security Policy (CSP) is enforced via a `<meta>` tag in `index.html` to mitigate Cross-Site Scripting (XSS) and data injection attacks:

| Directive | Value | Purpose |
|---|---|---|
| `default-src` | `'self'` | Fallback: only allow resources from the same origin |
| `script-src` | `'self' https://apis.google.com` | App scripts + Google API scripts (required for Firebase Auth popup) |
| `style-src` | `'self' 'unsafe-inline'` | Same-origin styles + inline styles (required for Tailwind CSS runtime injection) |
| `connect-src` | `'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com` | Firebase API endpoints for Auth, Firestore, and other services |
| `img-src` | `'self' https://*.googleusercontent.com data:` | Same-origin images + Google profile avatars + base64 data URIs |
| `font-src` | `'self'` | Fonts only from same origin |
| `frame-src` | `'self' https://*.firebaseapp.com` | Firebase Auth iframe for `signInWithPopup` OAuth flow |

> **Note**: `'unsafe-inline'` in `style-src` is required for Tailwind CSS. The `https://apis.google.com` in `script-src` is required for Firebase Auth's Google Sign-In popup flow, which dynamically loads `api.js`.

## Guest Data Security (`src/App.tsx`)

Guest mode stores chore data as plain text in `localStorage`, which cannot be encrypted securely in the browser. The following mitigations are in place:

- **Prominent Disclaimer**: A highly visible amber warning block is displayed on the login page and informs the guest that their data is stored unencrypted in browser local storage.
- **Clear Local Data Button**: When in guest mode, a "Clear Local Data" button (with a trash icon) is displayed in the navigation bar. Clicking it triggers a `window.confirm()` prompt before purging `local_guest_chores` from `localStorage` and resetting the chores state.
- **No Sensitive Data**: The current guest schema only stores low-sensitivity chore data (titles, priorities, timestamps).
