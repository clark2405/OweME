/**
 * Client-side UUID v4. The DB uses uuid primary keys, but the store's create
 * helpers (`addLoan`, `addBorrower`) return an id *synchronously* (callers route
 * on it), so we mint the id here and send it with the insert. Math.random is fine
 * for client-generated PKs in a single-user-per-account app like this; swap for
 * expo-crypto if a stronger guarantee is ever needed.
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
