import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Log structured error for debugging (no PII)
  console.error('[Firestore Error]', {
    operation: operationType,
    path,
    message: errorMessage,
  });

  if (import.meta.env.DEV) {
    console.debug('[Debug Auth Context]', auth.currentUser?.uid);
  }

  // Throw a user-safe error message
  throw new Error(
    `Firestore ${operationType} operation failed. Please try again or check your connection.`
  );
}
