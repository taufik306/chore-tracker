---
tldr: Outlines the system's error handling and logging rules for database interactions, as well as query read limits.
---
# Error Handling & Query Limits

## Error Handling (`src/lib/error-handler.ts`)

All Firestore operation errors are routed through a centralized `handleFirestoreError()` function that enforces two critical security principles:

1. **PII Stripping**: Error logs only include operational context (`operation`, `path`, `message`) — never user emails, UIDs, or provider data.
2. **User-Safe Messaging**: The function always re-throws a generic error message that is safe to render in the UI:
   ```typescript
   throw new Error(
     `Firestore ${operationType} operation failed. Please try again or check your connection.`
   );
   ```

Developer-only debugging (e.g., `auth.currentUser?.uid`) is gated behind a Vite environment check:
```typescript
if (import.meta.env.DEV) {
  console.debug('[Debug Auth Context]', auth.currentUser?.uid);
}
```
This ensures sensitive identifiers are never logged in production builds.

## Query Limits (`src/App.tsx`)

All Firestore `onSnapshot` list queries enforce a `limit(500)` cap to prevent excessive document reads:

```typescript
const q = query(
  collection(db, 'chores'),
  where('userId', '==', user.uid),
  limit(500)
);
```

This serves as a client-side safeguard against runaway read costs or denial-of-service scenarios. For applications that grow beyond this limit, cursor-based pagination with `startAfter()` should be implemented.
