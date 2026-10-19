import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('deve renderizar a tela de login inicial', () => {
    render(<App />);

    const titleElement = screen.getByText(/Entrar no EventBook/i);
    expect(titleElement).toBeDefined();
  });
});
