// Borrower-facing nudge page. This is the ONLY place that bypasses RLS —
// via a server-side Supabase service-role client scoped to a single token
// lookup (see PROJECT.md §6 and CLAUDE.md hard rule #3). The service-role key
// must never reach the client.
//
// TODO (next feature): look up the nudge_links row by token server-side,
// join the loan + borrower, record opened_at, and render the real reminder
// with a "Mark as returned" action. For now this is a typed placeholder.

type NudgePageProps = {
  params: Promise<{ token: string }>;
};

export default async function NudgePage({ params }: NudgePageProps) {
  const { token } = await params;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#FFFBF5] px-8 text-center">
      <p className="text-5xl">👋</p>
      <h1 className="text-2xl font-bold text-zinc-900">
        Friendly reminder from OweMe
      </h1>
      <p className="max-w-sm text-zinc-500">
        Someone lent you something and would love it back. Tap below to let them
        know it&apos;s on its way.
      </p>
      <p className="mt-4 text-xs text-zinc-400">nudge code: {token}</p>
    </main>
  );
}
