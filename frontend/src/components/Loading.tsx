interface LoadingProps {
  message?: string;
}

export function Loading({ message = 'Carregando...' }: LoadingProps) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center p-8 text-slate-600">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 mb-3" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}