import { useState } from "react";
import {
  useCreateLocation,
  useDeleteLocation,
  useLocations,
  useRenameLocation,
  type Location,
} from "../../hooks/useLocations";

export function LocationManager() {
  const locations = useLocations();
  const createLocation = useCreateLocation();
  const [name, setName] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    createLocation.mutate(trimmed, {
      onSuccess: () => setName(""),
    });
  };

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900">Locations</h2>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">New location name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New location"
            maxLength={64}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={createLocation.isPending}
          className="rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:bg-slate-300"
        >
          Add
        </button>
      </form>
      {createLocation.isError && (
        <p role="alert" className="mt-2 text-sm text-rose-600">
          {createLocation.error.status === 409
            ? "A location with that name already exists."
            : "Could not add location."}
        </p>
      )}

      {locations.isLoading && <p className="mt-4 text-sm text-slate-500">Loading locations...</p>}
      {locations.isError && (
        <p role="alert" className="mt-4 text-sm text-rose-600">
          Could not load locations.
        </p>
      )}
      {locations.isSuccess && locations.data.length === 0 && (
        <p className="mt-4 rounded border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          No locations yet.
        </p>
      )}
      {locations.isSuccess && locations.data.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {locations.data.map((location) => (
            <LocationRow key={location.id} location={location} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LocationRow({ location }: { location: Location }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(location.name);
  const renameLocation = useRenameLocation();
  const deleteLocation = useDeleteLocation();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed === location.name) {
      setEditing(false);
      setName(location.name);
      return;
    }
    renameLocation.mutate(
      { id: location.id, name: trimmed },
      {
        onSuccess: () => setEditing(false),
      },
    );
  };

  return (
    <li className="p-3">
      {editing ? (
        <form onSubmit={submit} className="flex flex-wrap items-start gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Location name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={64}
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={renameLocation.isPending}
            className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700 disabled:bg-slate-300"
          >
            Save
          </button>
          <button
            type="button"
            disabled={renameLocation.isPending}
            onClick={() => {
              setEditing(false);
              setName(location.name);
            }}
            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          {renameLocation.isError && (
            <p role="alert" className="basis-full text-sm text-rose-600">
              {renameLocation.error.status === 409
                ? "A location with that name already exists."
                : "Could not rename location."}
            </p>
          )}
        </form>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-slate-900">{location.name}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Rename
            </button>
            <button
              type="button"
              disabled={deleteLocation.isPending}
              onClick={() => deleteLocation.mutate(location.id)}
              className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
      {deleteLocation.isError && (
        <p role="alert" className="mt-2 text-sm text-rose-600">
          Could not delete location.
        </p>
      )}
    </li>
  );
}
