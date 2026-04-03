import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-6xl">🔍</div>
      <h1 className="font-heading text-2xl font-bold text-white">
        Pagina non trovata
      </h1>
      <p className="text-white/50 text-center max-w-sm">
        La pagina che stai cercando non esiste o potrebbe essere stata spostata.
      </p>
      <Link
        href="/feed"
        className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors"
      >
        Torna al Feed
      </Link>
    </div>
  );
}
