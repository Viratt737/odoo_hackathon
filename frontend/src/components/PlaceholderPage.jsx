const PlaceholderPage = ({ title, description, phase = 'Phase 2' }) => (
  <div className="space-y-4">
    <div>
      <h2 className="text-2xl font-bold text-slate-100">{title}</h2>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
    </div>
    <div className="card h-80 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-primary-900/40 border border-primary-800/50 flex items-center justify-center">
        <span className="text-3xl">🚧</span>
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-medium">{title}</p>
        <p className="text-slate-500 text-sm mt-1">
          Full implementation coming in <span className="text-primary-400 font-medium">{phase}</span>
        </p>
      </div>
    </div>
  </div>
);

export default PlaceholderPage;
