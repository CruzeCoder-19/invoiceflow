export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-24 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-4 w-56 animate-pulse rounded bg-gray-100" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                <div className="h-9 animate-pulse rounded-lg bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
