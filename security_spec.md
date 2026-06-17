# Firebase Security Specification: Deen Companion

## 1. Data Invariants
- **Identity Integrity**: No user may read, edit, or write files belonging to another user.
- **Relational Consistency**: Documents in specific collections (e.g., `habits`, `transactions`, `reflections`) must reside strictly under the user's root document context (`/users/{userId}`) where `{userId}` strictly matches the active `request.auth.uid`.
- **Temporal Enforcement**: Timestamps must be validated against `request.time`.
- **Data Shape Restrictions**: Length constraints on usernames, values checking of completion states, numeric assertions on transactions, and ID sanity checks.

## 2. The "Dirty Dozen" Adversarial Payloads
Below are 12 malicious payloads designed to breach our security boundaries. The rules must guarantee that all of these are rejected with `PERMISSION_DENIED`.

1. **Identity Spoofing - Global (UserProfile creation under another UID)**:
   - Attempting to write a profile document in `users/malicious_hacker` where `uid` matches the hacker's authentic ID but they write to someone else's document namespace.
2. **Identity Spoofing - Subcollection (Habit creation claiming another ownership)**:
   - Creating a habit doc at `users/innocent_user/habits/some_id` where `userId` is set to `innocent_user` by `malicious_hacker`.
3. **Ghost Field Injection (Privilege Escalation in Profile)**:
   - Updating `users/user_123` with a hidden field `isAdmin: true` or `role: "administrator"`.
4. **Negative Value Poisoning (Invalid savings balances)**:
   - Creating a Savings transaction where `amount` is set to an arbitrary negative integer or string (e.g. `amount: "not-a-number"` or `amount: -99999`).
5. **Temporal Spoofing (Forged timestamps)**:
   - Writing `updatedAt: "2020-01-01T00:00:00Z"` instead of using the mandatory server variable `request.time`.
6. **Large Asset Resource Exhaustion (String length denial-of-wallet)**:
   - Injecting a 5MB payload into the `username` field of a `UserProfile`.
7. **Invalid Path Variable / ID Injection (Poisoning IDs)**:
   - Writing to `users/user_123/habits/INVALID-ID-CHARACTERS#$*(@_LONG_STRING_POISON` to cause system exhaustion.
8. **Orphaned Record Creation**:
   - Creating subcollection records without checking that `users/{userId}` exists or matches authentication keys.
9. **Blanket Query Read scraping**:
   - Requesting list operations across all `habits` or `profiles` without limiting the document query to the current authenticated `userId`.
10. **State Skipping / Reversals**:
    - Changing immutable fields like `createdAt` or setting a terminal index without permission.
11. **Malicious Empty Payload / Key omission**:
    - Attempting to pass an empty object to create a profile, failing strict schema checks.
12. **Anonymous / Email Unverified Modification**:
    - Attempting writes on standard user profile collections with unverified credentials or without `request.auth.token.email_verified == true`.

## 3. The Test Suite Layout
A framework to execute these checks would assert:
```typescript
it("denies access to modify another user's content", async () => {
  const aliceDb = getFirestoreContext("alice_id");
  await assertFails(setDoc(doc(aliceDb, "users/bob_id"), { ...bobProfile }));
});
```
