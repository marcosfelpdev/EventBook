interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = 'Nenhum registro encontrado',
  description = 'Não existem dados disponíveis para apresentar neste momento.',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-10 px-6 border border-dashed border-slate-600 rounded-lg bg-[#0b1726] text-slate-200">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-slate-400 mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}