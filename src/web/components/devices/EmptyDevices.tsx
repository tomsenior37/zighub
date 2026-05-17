import { Link } from "react-router-dom";

export function EmptyDevices() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-800">No devices paired yet</h2>
      <p className="mt-2 text-sm text-slate-600">
        Run the setup wizard to pair your first device, or open the pairing window from the
        &ldquo;Pair new device&rdquo; button once that lands.
      </p>
      <Link
        to="/wizard"
        className="mt-4 inline-block rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
      >
        Open the setup wizard
      </Link>
    </div>
  );
}
