import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('deve renderizar a vitrine de eventos inicial', () => {
    render(<App />);

    const titleElement = screen.getByText(/Próximos Eventos/i);
    expect(titleElement).toBeDefined();
  });
});
