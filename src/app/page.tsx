export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          ChatGPT Clone
        </h1>
        <p className="text-base text-slate-300 sm:text-lg">
          Next.js project scaffolded and ready for the production-grade chat
          system buildout.
        </p>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left text-sm text-slate-300">
          <p className="font-medium text-slate-100">Next steps</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Install dependencies with <code className="text-slate-100">npm install</code>.</li>
            <li>Start the dev server using <code className="text-slate-100">npm run dev</code>.</li>
            <li>Begin implementing sessions, streaming, and persistence.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
