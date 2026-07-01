---
tldr: Explains the offline-capable Cache-First Sync Engine and the Real-Time State loop that drives the Chore Tracker application.
---
# Sync Engine & State Management

## Cache-First Sync Engine (Offline Capability)

By implementing `persistentLocalCache` and `persistentMultipleTabManager` from the Firestore SDK inside `src/lib/firebase.ts`, queries and reads are instantly evaluated against local IndexedDB tables. Writes are persisted instantly in cache and placed in a pipeline queue to upload silently to Firebase servers when network connection returns.

```typescript
const databaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)';
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, databaseId);
```
- **`persistentLocalCache`**: Mandates local IndexedDB storage, preventing application crashes or missing data when disconnected.
- **`persistentMultipleTabManager`**: Prevents database locking errors when the application is opened in multiple browser tabs simultaneously.

## State Management & Real-Time Loop (`src/App.tsx`)

A `setInterval` background checker checks for expired time boundaries every 4.5 seconds:

- **Time-limited chores**: Checks if `currentTime >= startTime + limitMinutes * 60000`.
- **Unlimited chores**: Checks if `currentTime >= startTime + 24 * 60 * 60000` (exceeded one day limit).
- **Redundant Alert Prevention**: To prevent annoying repeat sound chimes on every tick, once a notification is generated, its unique chore ID is committed to `alertedChoreIds` in local state and cached in `localStorage`.
- **Guest Session Persistence**: To preserve unauthenticated offline sessions between app restarts (especially on mobile), the `isGuestMode` flag and the offline chore list (`local_guest_chores`) are actively synced to `localStorage`.
