# App Store / Play data-collection reference (TASKS S4)

> What OweMe collects, for filling **App Store Connect → App Privacy** (nutrition
> labels) and **Play Console → Data safety**. Keep this in sync with the privacy
> policy (`app/src/app/privacy.tsx` + `web/app/privacy/page.tsx`) and the hosted
> URL (R2). Nothing here is used for tracking or advertising, and nothing is
> shared with third parties for their own use.

## Ground rules for the labels
- **Tracking:** NONE. No ad SDKs, no cross-app/website tracking, no data brokers.
  Answer "No" to tracking everywhere.
- **Third-party sharing:** NONE for marketing. The only processors are
  infrastructure (Supabase = database/auth/storage; Sentry = crash reporting, only
  if R3 ships). These are service providers, not "sharing" in the App Store sense.
- **Local-first caveat:** with NO account, nothing leaves the device, so none of
  this is "collected" by us. It becomes collected only when the user signs in to
  sync. App Store labels describe the *maximum* the app may collect, so list the
  signed-in case.

## Data types collected (signed-in / sync on)

| Apple category | Data type | Collected? | Linked to user? | Purpose | Notes |
|---|---|---|---|---|---|
| Contact Info | Email address | Yes | Yes | App Functionality (account auth) | OTP login + ties the synced ledger to the user. |
| Contact Info | Name | Yes | Yes | App Functionality | The **borrower** names the user records (third-party PII). |
| Contact Info | Phone number | Yes | Yes | App Functionality | Optional, per borrower (manual or Contacts import). |
| User Content | Photos or Videos | Yes | Yes | App Functionality | Item photos the user attaches. |
| User Content | Other user content | Yes | Yes | App Functionality | Loan items, amounts, notes, nudge history. |
| Identifiers | User ID | Yes | Yes | App Functionality | Supabase `auth.uid()` that scopes the user's rows. |
| Diagnostics | Crash Data | Only if R3 (Sentry) ships | No (configure non-PII) | App Functionality / analytics | Strip PII; don't attach the email. Until Sentry ships, answer **No**. |

Everything above: **not used for tracking.**

## NOT collected (answer "No")
- Location, Health/Fitness, Financial Info (loan amounts are user content, not
  payment/credit data — no real money moves through the app), Browsing/Search
  history, Purchases, Contacts list as a whole (we read only the single contact
  the user picks — that becomes a "Name/Phone" above, not a contacts upload),
  Sensitive Info, Advertising Data, Usage Data/Analytics.

## Third-party PII obligation (GDPR/CCPA)
The app stores other people's names + phone numbers. The user is the data
controller; OweMe (you) is a processor of that PII once it syncs. Covered by the
"The people you add" clause in the privacy policy. Provide the deletion path
(in-app account delete = full erasure, already shipped as S1) and the contact
email (hello@oweme.app) for erasure requests.

## Submission checklist
- [ ] Privacy policy URL set in App Store Connect → the hosted `/privacy` page (R2).
- [ ] App Privacy answers match the table above.
- [ ] Re-check "Crash Data" once Sentry (R3) is wired.
- [ ] Play Data safety form mirrors the same answers (if/when Android ships).
