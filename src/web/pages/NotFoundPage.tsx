import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-3 text-slate-600">
        That URL doesn&rsquo;t match any page in zighub.{" "}
        <Link className="text-sky-700 underline" to="/devices">
          Go to devices
        </Link>
        .
      </p>
    </section>
  );
}
