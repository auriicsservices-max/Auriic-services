# Firestore Security Specification for Aurrum

## Data Invariants
1. A candidate document (`candidates`) MUST have an `uploadedBy` UID that matches the user who created it, or be accessible based on team membership/role.
2. A direct message (`direct_messages`) MUST have the logged-in user in its `participants` array.
3. User profiles (`users`) can be listed by any authenticated user for the team view.

## The "Dirty Dozen" Payloads (Examples)
1. Shadow update of a `Candidate` document adding `isArchived: true` via a `create` operation.
2. Read access to `candidates` by a user not in the project (if implemented).
3. Update of `users` role field by a non-admin.

## The Test Runner (Plan)
- Write tests using `firebase-rules-test` framework to verify `list`/`read` operations against restricted and authorized data.
