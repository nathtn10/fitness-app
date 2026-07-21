/**
 * Record-id generation.
 *
 * Ids are UUID v4 so they double as valid primary keys for the backend's
 * `uuid` columns and make offline creates idempotent across devices (see
 * BACKEND.md § "Data model"). The `prefix` argument is accepted for call-site
 * compatibility but ignored — a UUID needs no namespacing.
 */
import { uuidv4 } from './uuid';

export function createId(_prefix = 'id'): string {
  return uuidv4();
}
