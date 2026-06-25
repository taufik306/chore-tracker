---
tldr: Documentation for the ChoreForm component, covering client-side input validation and rate-limiting.
---
# ChoreForm Component

## Client-Side Input Validation

Chore title input is validated both at the HTML and application logic level in `src/components/ChoreForm.tsx`:

- **HTML constraint**: `maxLength={200}` on the `<input>` element prevents typing beyond 200 characters.
- **Submit handler validation**: Explicit check rejects titles exceeding 200 characters with a user-friendly error message.
- **Character counter**: A live `{length}/200` counter is displayed below the input, with amber warning styling when the length exceeds 180 characters.
- **User-safe error display**: All `catch` blocks in form submission render a generic `"Something went wrong. Please try again."` message — raw error details are never shown in the UI.

These client-side constraints mirror the server-side `title.size() <= 200` rule enforced in `firestore.rules`.

## Client-Side Rate Limiting (`src/App.tsx`)

To prevent abuse from rapid chore creation (both accidental and intentional), a 2-second throttle is enforced when adding chores:

```typescript
const [lastCreatedAt, setLastCreatedAt] = useState(0);

const handleAddChore = async (...) => {
  const now = Date.now();
  if (now - lastCreatedAt < 2000) {
    throw new Error('Please wait a moment before adding another chore.');
  }
  setLastCreatedAt(now);
  // ... proceed with creation
};
```

The error is caught by the `ChoreForm` component and displayed as a user-friendly message.
