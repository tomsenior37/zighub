export function DevicesPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Devices</h1>
      <p className="mt-3 text-slate-600">
        Once paired, devices will appear here grouped by location, with rename / move / unpair
        controls and a live state preview. Pairing flows through the wizard or the &ldquo;Pair new
        device&rdquo; button on this page (to come).
      </p>
    </section>
  );
}
