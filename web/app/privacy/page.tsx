import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy · OweMe",
  description:
    "How OweMe handles your data: on-device by default, optional cloud sync, and what we do with the people you add.",
};

// Mirrors the in-app Privacy screen (app/src/app/privacy.tsx). This hosted copy
// is the public URL required for App Store / Play submission. Keep the two in
// sync when the policy changes.
const SECTIONS: { h: string; b: string }[] = [
  {
    h: "The short version",
    b: "OweMe is your private ledger. By default everything you track — people, loans, photos — lives on your phone, with no account. A cloud copy only exists if you choose to sign in to sync.",
  },
  {
    h: "Local by default",
    b: "Without an account, your loans, the names and notes for the people you lend to, and any photos you attach stay on your device — nothing is uploaded. Your manual backup is the only copy that leaves the phone, and only when you export it.",
  },
  {
    h: "If you sign in to sync",
    b: "Signing in is optional. When you do, your ledger — loans, people, and the photos you attach — is stored securely in the cloud so it can appear on your other devices. Sign out anytime; the copy on your phone stays put. You can permanently delete your account and everything synced to it from inside the app (Settings → Your data → Delete account).",
  },
  {
    h: "The people you add",
    b: "OweMe is a record of who has your things, so it stores the names — and any phone numbers or notes you add — of the people you lend to. With an account, that information is part of what syncs to the cloud. Only add people you have a reason to keep track of, and remove anyone you no longer need (deleting a person removes their details). We never contact them on your behalf.",
  },
  {
    h: "Your email",
    b: "If you sign in, we use your email only to send the one-time login code and to tie your synced ledger to you. No passwords, and we don't email you anything else.",
  },
  {
    h: "Contacts",
    b: "If you import someone from your address book, OweMe reads only the name and number you pick — once, on your tap — and keeps it with your other people.",
  },
  {
    h: "Photos & camera",
    b: "Used only when you attach a picture to a loan. The image is saved with that loan on your device; it's uploaded only if you're signed in to sync.",
  },
  {
    h: "Notifications",
    b: "Nudge reminders are scheduled locally on your phone. They don't pass through a notification server.",
  },
  {
    h: "Nudges you send",
    b: "When you nudge someone, OweMe opens your own messaging app with the text already written. You send it — OweMe never messages anyone on its own.",
  },
  {
    h: "Contact",
    b: "Questions about your data, or want it removed? Email hello@oweme.app.",
  },
];

export default function Privacy() {
  return (
    <main className="flex flex-1 justify-center bg-[#FFFBF5] px-6 py-16">
      <div className="w-full max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          The fine print
        </p>
        <h1 className="mt-2 text-4xl font-bold text-zinc-900">Privacy</h1>
        <p className="mt-3 text-sm text-zinc-400">Last updated · June 2026</p>

        <div className="mt-10 flex flex-col gap-8">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-semibold text-zinc-900">{s.h}</h2>
              <p className="mt-1.5 leading-relaxed text-zinc-600">{s.b}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
