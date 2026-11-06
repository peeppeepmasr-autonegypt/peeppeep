export default function ArabicLoading() {
  return (
    <div dir="rtl" className="max-w-4xl mx-auto px-4 py-8 space-y-4 animate-pulse">
      <div className="h-4 w-32 bg-black/10 dark:bg-white/10 rounded" />
      <div className="h-8 w-2/3 bg-black/10 dark:bg-white/10 rounded" />
      <div className="h-32 bg-black/10 dark:bg-white/10 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 bg-black/10 dark:bg-white/10 rounded-xl" />
        <div className="h-24 bg-black/10 dark:bg-white/10 rounded-xl" />
      </div>
    </div>
  );
}
