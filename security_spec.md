# Security Specification - 错题宝 (Smart Error Workbook)

## 1. Data Invariants
- An error record MUST have a valid `userId` matching the authenticated user.
- `knowledgePoint` must be a string of reasonable length (max 100 chars).
- `originalText` must be verified and not empty.
- `variations` must be an array of exactly 3 items, each containing `question`, `answer`, and `analysis`.
- `createdAt` must be set by the server.

## 2. The "Dirty Dozen" Payloads
1. **The Identity Thief**: Attempt to save a record with another user's `userId`.
2. **The Anonymous Write**: Attempt to save a record without being logged in.
3. **The Shadow Field**: Attempt to add an `isAdmin: true` field to the record.
4. **The Bloated ID**: Attempt to use a document ID that is > 1.5KB of junk characters.
5. **The Time Traveler**: Attempt to set a manual `createdAt` date in the past.
6. **The Orphaned Record**: Attempt to update a record owned by someone else.
7. **The Schema Buster**: Attempt to save `variations` as a string instead of an array.
8. **The Ghost variation**: Attempt to save an empty variations list.
9. **The Unprivileged Read**: Attempt to read all records in the collection without a user filter.
10. **The Knowledge Point Injection**: Attempt to inject a 1MB string into the `knowledgePoint` field.
11. **The Status Hijack**: (N/A for this app, but if we had a 'processed' state, we'd test locking it).
12. **The PII Scraper**: Attempt to list records and filter by a `userId` that isn't the current user's.

## 3. Test Runner Concept
The `firestore.rules` will be designed to block all the above.
