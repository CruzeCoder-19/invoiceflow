export default function InvoicesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-24 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-lg bg-gray-200" />
      </div>
      {/* Filter tabs skeleton */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 w-16 animate-pulse rounded-md bg-gray-200" />
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex gap-8">
          {["Invoice", "Client", "Issue Date", "Due Date", "Amount", "Status", "Actions"].map((h) => (
            <div key={h} className="h-3 w-16 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-8 px-4 py-4 border-b border-gray-100">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
            <div className="h-5 w-14 animate-pulse rounded-full bg-gray-200" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
