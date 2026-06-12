# BUILD_NOTES.md — iOS build gotchas & fixes

> Hard-won notes from building OweMe onto a real iPhone with a **free** Apple
> account. Read this first if a device build suddenly fails. Most of these bite
> after adding a native module (`expo-image-picker`, `expo-notifications`,
> `expo-contacts`).

---

## 1. ⭐ Push entitlement fails to sign on a free Apple account

**This is the one that blocked the build on 2026-06-11.**

### Symptom
`npx expo run:ios --device` fails during "Planning build":

```
❌  OweMe/OweMe: Provisioning Profile "iOS Team Provisioning Profile: com.clark24smoothoperator.oweme"
    does not support the Push Notifications capability.
❌  OweMe/OweMe: Entitlements file defines the value "aps-environment" which is not
    registered for profile "...".
xcodebuild exited with error code 65.
```

### Root cause
`ios/OweMe/OweMe.entitlements` contained:

```xml
<key>aps-environment</key>
<string>development</string>
```

`aps-environment` turns on **Apple Push Notification service (APNs)**. To sign an
app that declares it, the provisioning profile must include the **Push
Notifications** capability — and that requires a **paid** Apple Developer Program
membership ($99/yr). On a **free** personal team, Xcode can't create such a
profile, so signing fails.

It was added defensively by the `expo-notifications` setup — **not because OweMe
needs it.**

### Why we don't need it
OweMe only uses **local notifications** — reminders scheduled *on the device*
(`Notifications.scheduleNotificationAsync`). Those need **no entitlement and no
APNs**. `aps-environment` is only for **remote/push** notifications sent from a
server, which OweMe does not do (and won't in v1 — see PROJECT.md §9, push is a
v2 item).

### The fix (applied)
1. Emptied the entitlements file — `ios/OweMe/OweMe.entitlements` is now just
   `<dict/>`. (Removed the `aps-environment` key via PlistBuddy.)
2. Set the plugin to not re-add background remote notifications, in `app.json`:
   ```json
   ["expo-notifications", { "enableBackgroundRemoteNotifications": false }]
   ```

### If it comes back
Running `npx expo prebuild` can regenerate the entitlement. If a future build
fails with the two errors above, just delete the key again:
```sh
/usr/libexec/PlistBuddy -c "Delete :aps-environment" ios/OweMe/OweMe.entitlements
```
(Our `ios/` folder is checked in and prebuild isn't part of the normal loop, so
this should stay fixed.)

### When you upgrade to a paid account
You can instead keep `aps-environment` and enable the Push Notifications
capability on the App ID in the Apple Developer portal. Still unnecessary for v1
(local notifications only) — revisit only when building server-driven push (v2).

---

## 2. Eager native-module import crashes the app at startup

### Symptom
Right after a Metro reload (before the matching native rebuild is installed) the
app **white-screens / won't open** with:

```
Uncaught Error: Cannot find native module 'ExpoContacts'
  contacts.ts:8   →  import { presentContactPickerAsync } from 'expo-contacts/legacy'
  add.tsx:33
```

### Root cause
`lib/contacts.ts` imported the native module at the **top level**. Because the
add screen imports `contacts.ts`, and the add screen is in the startup bundle,
the native module was resolved **at app launch** — and the binary on the phone
didn't contain `ExpoContacts` yet (JS was updated over Metro, native wasn't).
One missing native module → the whole app fails to boot.

### The fix (applied)
Load the native module **lazily**, inside the function, wrapped in try/catch:

```ts
export async function pickContact(): Promise<PickedContact | null> {
  try {
    const Contacts = require('expo-contacts/legacy') as typeof import('expo-contacts/legacy');
    const contact = await Contacts.presentContactPickerAsync();
    ...
  } catch {
    return null; // module not in this binary, or user cancelled
  }
}
```

### Rule of thumb
Wrap optional/native-only modules behind a lazy `require()` at the call site, so
a binary that lacks the module degrades gracefully (the feature no-ops) instead
of taking down the entire app at startup.

---

## 3. Native modules need a full rebuild, not a Metro reload

Adding a native module (`expo-image-picker`, `expo-haptics`,
`expo-notifications`, `expo-contacts`) requires:
```sh
cd ios && pod install        # autolinks the new pod (see §5 for the locale bug)
npx expo run:ios --device <UDID>   # rebuild + reinstall the binary
```
Pure-JS changes hot-reload over Metro; **native additions do not.** Until the
rebuild installs, any code path touching the new module throws "Cannot find
native module 'X'" (see §2).

---

## 4. `ios/` is git-ignored — native config lives in `app.json`

`ios/` is not tracked, so manual edits to `ios/OweMe/Info.plist` /
`*.entitlements` are **local-only** and regenerate on prebuild. The durable
source of truth is the `app.json` config plugins, which we keep current:
- `expo-image-picker` → `photosPermission` + `cameraPermission`
- `expo-contacts` → `contactsPermission`
- iOS `infoPlist.LSApplicationQueriesSchemes` → `["whatsapp", "viber"]` (so
  nudge deep-links can detect those apps)

Usage-description strings we've also poked directly into the local `Info.plist`
during a session (camera, contacts, query schemes) so the current binary works
before a prebuild re-syncs from `app.json`.

---

## 5. CocoaPods + Ruby 4 locale crash

`pod install` may crash with:
```
Unicode Normalization not appropriate for ASCII-8BIT (Encoding::CompatibilityError)
```
Fix: force a UTF-8 locale.
```sh
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
```

---

## 6. "database is locked" — two concurrent builds

```
error: unable to attach DB: ... build.db: database is locked
Possibly there are two concurrent builds running in the same filesystem location.
```
Cause: two `xcodebuild`s sharing the same DerivedData (e.g. a background build
plus a manual one). Run **one build at a time**; stop the other first.

Also: in the device picker, the **🔌 plug icon** marks your *physical* phone.
A name without it (e.g. "iPhone 17 Pro (26.2)") is a **simulator** — fine for
most testing, but no camera/haptics, and it won't put the app on your phone.

---

*Last updated: 2026-06-11, after wiring expo-contacts (Batch B).*
