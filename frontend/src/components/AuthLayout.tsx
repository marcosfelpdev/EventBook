import type { ReactNode } from 'react';
import { ArrowUpRight, Ticket, Sparkles } from 'lucide-react';
import { BlurFade } from './BlurFade';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-layout site-container">
      <aside className="auth-story">
        <img src="/images/live-music.jpg" alt="Luzes de um show ao vivo" />
        <div className="auth-story-content">
          <span className="eyebrow">
            <Sparkles size={16} /> A próxima história é sua
          </span>
          <h1>
            Tem coisas que
            <br />
            você precisa
            <br />
            <em>viver de perto.</em>
          </h1>
          <p>
            Encontre o seu próximo evento.
            <br />O resto vira uma boa história.
          </p>
          <div className="auth-ticket">
            <Ticket size={26} />
            <span>Seu acesso a novos momentos</span>
            <ArrowUpRight size={22} />
          </div>
        </div>
      </aside>
      <BlurFade className="auth-form">{children}</BlurFade>
    </main>
  );
}
