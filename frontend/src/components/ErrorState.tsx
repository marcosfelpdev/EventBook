interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Ocorreu um erro',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-4">
      <strong className="block font-semibold mb-1">{title}</strong>
      <span className="block text-sm">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}