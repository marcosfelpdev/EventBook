import React from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Ocorreu um erro',
  message,
  onRetry,
}) => {
  return (
    <div
      role="alert"
      style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#991b1b',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px',
      }}
    >
      <strong style={{ display: 'block', marginBottom: '4px' }}>{title}</strong>
      <span style={{ fontSize: '14px', display: 'block' }}>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: '12px',
            padding: '6px 12px',
            backgroundColor: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
};