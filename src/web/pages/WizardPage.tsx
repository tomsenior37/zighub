export function WizardPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Setup wizard</h1>
      <p className="mt-3 text-slate-600">
        First-run setup will walk you through detecting a coordinator, creating a Zigbee network,
        and pairing your first device. The wizard itself is not implemented yet — this route is a
        placeholder while the underlying coordinator and pairing endpoints land.
      </p>
    </section>
  );
}
