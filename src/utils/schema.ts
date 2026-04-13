/**
 * Current schema version for Deck objects.
 * Increment this constant whenever the shape of Deck or Slide changes in a
 * backward-incompatible way, then add a corresponding migration function below.
 *
 * Migration pattern:
 *   1. Bump CURRENT_SCHEMA_VERSION (e.g. 1 -> 2).
 *   2. Add a migrateV1ToV2(deck) transform function in this file.
 *   3. In DeckBuilder's file-load handler, compare the imported schemaVersion
 *      against CURRENT_SCHEMA_VERSION and apply the transform before using the deck.
 *   4. Do NOT block import on a version mismatch -- migrate forward and warn the operator.
 *
 * Example future migration:
 *   export function migrateV1ToV2(deck: any): any {
 *     return { ...deck, schemaVersion: 2, newField: deck.oldField ?? 'default' };
 *   }
 */
export const CURRENT_SCHEMA_VERSION = 1;
