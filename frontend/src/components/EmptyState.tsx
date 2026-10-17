import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nenhum registo encontrado',
  description = 'Não existem dados disponíveis para apresentar neste momento.',
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '40px 24px',
        border: '1px dashed #d1d5db',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        color: '#374151',
      }}
    >
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{title}</h3>
      <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};