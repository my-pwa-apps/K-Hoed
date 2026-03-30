/** Generate a temporary client-side ID for unsaved items */
let counter = 0;
export function newLocalId(): string {
  return `local-${Date.now()}-${counter++}`;
}
