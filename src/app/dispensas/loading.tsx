export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 bg-slate-200 rounded-lg w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-100 rounded-xl h-24" />
        ))}
      </div>
      <div className="bg-slate-100 rounded-xl h-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-100 rounded-xl h-64" />
        <div className="bg-slate-100 rounded-xl h-64" />
      </div>
    </div>
  )
}