export default function Home() {
  return (
    <main className="bg-bwf-deep flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-24 text-center text-white">
      <span className="bg-bwf-blue/20 text-bwf-pale ring-bwf-blue/40 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase ring-1">
        Blue for Bob · 30 May 2026
      </span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        BWF Virtual Seats
      </h1>
      <p className="max-w-md text-lg text-balance text-white/80">
        Coming soon. Pick a seat at Edgbaston, leave a tribute, support the Bob
        Willis Fund.
      </p>
      <p className="text-sm text-white/60">
        The Bob Willis Fund is administered by The Talent Fund, registered
        charity 1185346.
      </p>
    </main>
  );
}
