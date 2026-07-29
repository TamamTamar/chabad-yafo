# Daycare donations — production readiness

## Release state

Real payments are fail-closed in code. The public page may be reviewed, but
the server will not create payment intents until the official Nedarim Plus
server-side verification flow has been documented, implemented and tested.
The public campaign content is also hidden unless
`DAYCARE_DONATIONS_PUBLIC_VISIBLE=true`.

Do not change
`DAYCARE_NEDARIM_OFFICIAL_VERIFICATION_IMPLEMENTED` merely to run a live test.
It is a code-level assertion that the missing provider verification was
actually implemented.

## Required provider answers

Obtain written technical documentation from Nedarim Plus for:

1. The official server-side transaction creation or verification endpoint.
2. The authoritative transaction identifier and amount fields.
3. Callback authentication (signature, shared secret, source verification, or
   a server-to-server transaction lookup).
4. Retry rules and the exact success response expected from our callback.
5. Cancellation and refund notifications, identifiers and statuses.
6. A supported merchant test mode or an approved small production test.

The public iframe sample describes a server-created `TransactionId` flow, but
does not document a callback signature or a transaction lookup response.

## Backup gate

Run this before the first deployment that creates or changes donation
collections or indexes:

```bash
mongodump --uri "$PRODUCTION_MONGODB_URI" \
  --archive="daycare-donations-before-YYYYMMDD-HHMM.archive" \
  --gzip
```

Store the archive outside the application host. Record its checksum:

```bash
shasum -a 256 daycare-donations-before-YYYYMMDD-HHMM.archive
```

Verify that the archive is readable by restoring it into a disposable database:

```bash
mongorestore \
  --uri "$RESTORE_TEST_MONGODB_URI" \
  --archive="daycare-donations-before-YYYYMMDD-HHMM.archive" \
  --gzip \
  --drop
```

Never run `--drop` against the production URI.

## Index verification

After the backup and migration, but before opening payments, verify:

Remove legacy embedded diagnostics only after the verified backup:

```javascript
db.daycaredonationintents.updateMany(
  { providerDiagnostic: { $exists: true } },
  { $unset: { providerDiagnostic: "" } }
)
```

```javascript
db.daycaredonationrecords.getIndexes()
```

There must be a unique partial index on `externalTransactionId`. It must not
combine `sparse` and `partialFilterExpression`.

```javascript
db.daycaredonationdiagnostics.getIndexes()
```

There must be a TTL index on `expiresAt` with `expireAfterSeconds: 0`.

## Safe opening sequence

1. Deploy with payments still blocked.
2. Verify the admin campaign, records, audit and diagnostics screens.
3. Verify the database indexes.
4. Run the automated tests.
5. Implement and verify the official provider authentication flow.
6. Enable diagnostics only for the approved test window.
7. Open payments only to the private test path/session.
8. Make one small general donation and one small item donation.
9. Compare the safe callback values, transaction record and provider report.
10. Disable diagnostics and clear the temporary diagnostics.
11. Review the result with the campaign owner.
12. Only then enable the public campaign.

## Production test matrix

- General donation.
- Item donation.
- Two parallel callbacks with the same provider transaction ID.
- Failed callback and provider retry.
- Cancellation.
- Refund.
- Manual donation with source, date and evidence.
- Reassignment with a mandatory reason.
- Item reaching exactly 100%.
- Item exceeding its goal; both donations remain recorded.
- Closed campaign.
- Closed item.

For every financial mutation verify the audit entry contains the signed-in
admin account, timestamp, previous value, new value and reason where required.

## Remaining release blocker: partial overflow allocation

The current data model preserves every approved donation and reports an
item-level overflow. It can reassign a complete donation with an audit reason.
It does not yet split one donation between two items. If the operational
requirement is to move only the exact excess while preserving the remainder on
the original item, add audited allocations whose sum must always equal the
immutable approved donation amount before production opening.
