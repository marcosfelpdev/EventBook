import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('deve renderizar o título do EventBook', () => {
    render(<App />);

    const titleElement = screen.getByText(/EventBook/i);
    expect(titleElement).toBeDefined();
  });
});
