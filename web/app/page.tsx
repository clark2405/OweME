export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#FFFBF5] px-8 text-center">
      <h1 className="text-4xl font-bold text-zinc-900">OweMe 📦</h1>
      <p className="text-zinc-500">The app that gets your stuff back.</p>
      <p className="mt-6 max-w-sm text-sm text-zinc-400">
        This is the nudge service. If a friend sent you a reminder link, it
        looks like <code className="text-zinc-500">/n/your-code</code>.
      </p>
    </main>
  );
}
