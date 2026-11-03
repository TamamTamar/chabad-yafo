# Release readiness - 2026-10-15

## Scope

Admin shell/navigation and daycare changes, Shifra Pua registration/admin,
Maftir Yona consent/notifications/diagnostics, and chat analytics. This is a
local release-candidate assessment, not confirmation of the current cloud
configuration. No commit, push, deployment, production write, payment or
external notification was performed.

The source-only candidate excludes `.env`, build output, uploads, backups and
the ignored Cardcom/Meta experiments and one-off messaging scripts. Dependency
installation was repeated from both lockfiles with `npm ci --offline` in a
separate temporary candidate, not in the working application's node_modules.

## Database verification

Final results from the source-only candidate with clean lockfile dependencies:

- Full server build and suite: **146 passed, 0 failed, 0 skipped**, with all local
  DB suites enabled through `npm run test:db -- --all`.
- Client `npm test`, `npm run lint` and TypeScript/Vite production build passed.
- Targeted DB runner including finance: **13 passed, 0 failed, 0 skipped**.
- `git diff --check` passed. Candidate application/test sources match the current
  releasable working-tree sources. No files were staged.

Only fresh loopback MongoDB 8.0.15 instances and synthetic records are used.
The single-node replica set supports real transactions. Every DB suite rejects
non-local connection strings. The resilience suite uses a local TCP proxy to
cut the database connection without changing application timeouts, pool sizes
or retry behavior. Dropped HTTP responses occur after the route commits its
mutation, exercising the ambiguous-acknowledgement case.

Covered scenarios:

- New Shifra Pua registration; parallel and normalized-phone duplicates;
  committed registration with lost response and explicit retries; no overwrite
  of the original registration by a duplicate request.
- A later birth for the same mother; planning dates and preparation counts;
  status changes, repeated deliveries, preserved meal history, admin edits and
  stale revision conflicts.
- A committed delivery update with lost response: replay returns a conflict
  and does not append a second meal.
- Arbaat Haminim creation, public persistence, year updates, authorization and
  revision conflicts; replay after a lost save response cannot overwrite it.
- Maftir Yona transactions, competing bids, persistence, extensions, requestId
  deduplication, invalidation, rate limits, closing/winner calculation, private
  field exclusion and admin protection. Replaying a committed bid after losing
  its response returns the original accepted bid rather than creating another.
- Daycare finance persistence, including income 11,000 for 11 children at
  1,000, and repeating the same save after losing its response.
- Actual local database network outage while saving Shifra Pua, Arbaat Haminim,
  Maftir Yona and daycare finance, and submitting a new registration: error
  responses with `success: false`, no changes to the previously stored data,
  followed by normal driver recovery and successful explicit retries.

Client handler tests verify pending/error states, prevention of duplicate
registration clicks, preservation of admin/finance drafts, and success only
after a resolved save. These are component/hook behavior tests with mocked I/O,
not a claim of end-to-end browser or real cloud outage coverage.

## Reproduce

Install a local `mongod` binary, then in `server/`:

```sh
npm ci
MONGOD_BINARY=/absolute/path/to/mongod npm run test:db
# Full server suite with all DB tests enabled:
MONGOD_BINARY=/absolute/path/to/mongod npm run test:db -- --all
```

The runner refuses occupied ports 27029/27039, creates fresh temporary data
directories, starts only loopback listeners, removes `MONGO_URI` from the test
environment, and stops its own processes and removes their data on completion.
It does not load `.env`. Do not substitute production URIs into test commands.
Default `npm test` still skips optional DB suites unless explicitly configured;
use `test:db` to make DB verification mandatory.

In `client/`, run `npm ci`, `npm test`, `npm run lint`, and `npm run build`.
For a candidate without local build variables, run in a source-only copy
without `.env*`, as done in this assessment.

## Previous review items

| Item | Current status |
| --- | --- |
| Displayed finance income differed from saved payload | Existing fix verified by hook regression and real local persistence tests |
| Three skipped DB suites | Executed successfully on disposable local databases |
| Missing ambiguous-response/outage coverage | New server and client regression tests added |
| ChatAssistant ESLint failure | Existing correction verified; full client lint passes |
| Admin navigation outside standard test command | Included in `npm test` |
| Experimental Cardcom/Meta code and personal one-off scripts | Ignored by Git and absent from the source-only release candidate; not activated |
| Raw startup errors could reveal duplicate phone values | Existing sanitized startup reporting verified by tests |
| Volunteer contact documentation stale | Current Shifra Pua documentation matches the implementation |
| Dependency installation not reproduced | Both lockfiles installed successfully in the clean candidate |

No application behavior fix was required by the new resilience tests. This
phase adds regression tests, a disposable DB runner, test command integration
and this report. Existing application fixes are verified rather than claimed
as new changes. Layered SCSS overrides remain maintenance work, not a build
blocker. The duplicated auction diagnostic utilities retain their parity test.

## Release gates and sequence - only after user approval

1. Review the exact tracked/new file set and current remote branch before
   preparing commits. Keep credentials, generated files and ignored experiments
   out. Check GitHub-triggered deploy settings before any push so that a push
   cannot publish the client before the server. Obtain approval before commit,
   push or deploy.
2. Confirm a restorable production backup and index-creation permissions.
   Shifra Pua creates the unique `(phone, birthDate)` index during startup; a
   conflict or permission failure intentionally prevents the server listening.
   Any existing collection must be checked before rollout without trial writes.
3. Validate the hosting Node version against the locked package requirements;
   local verification used Node 22.18.0. Review existing `MONGO_URI`, `JWT_SECRET`,
   `CLIENT_ORIGIN`, storage settings and optional notification configuration in
   the hosting secret manager without copying them to logs or Git.
4. After approval, create reviewed commits and push the approved branch to
   GitHub while production publishing is controlled.
5. Deploy the server to Railway first: service root `server`, install from
   lockfile, build `npm run build`, start `npm start`, and honor Railway's `PORT`.
   Verify startup/index completion and a DB-backed read with an authorized admin;
   `/api/health` alone does not verify MongoDB. No fault injection or trial
   database writes in production.
6. Deploy/publish the client to Netlify only after the server checks succeed.
   The checked-in settings are base `client`, build `npm run build`, publish
   `dist`; `/api/*` proxies to the Railway API. Validate `VITE_API_URL` if set.
   Smoke-check the new pages, admin authorization, API routing and mobile
   navigation. Test writes/outages continue to belong in isolated staging.
7. Observe errors and keep the previous deployments available for rollback.
   Review separate approval before enabling any unfinished payment integration
   or running real notification/payment tests.

Cloud settings, the latest remote branch, production backup/restore evidence
and actual Atlas index permissions have not been verified in this assessment.
They remain operational gates, not evidence of a failing local implementation.
No online dependency vulnerability audit or live Make delivery test was run.

Platform references: [Railway GitHub autodeploys](https://docs.railway.com/deployments/github-autodeploys),
[Netlify publishing controls](https://docs.netlify.com/deploy/deploy-overview/),
[Netlify build configuration](https://docs.netlify.com/build/configure-builds/overview/).
