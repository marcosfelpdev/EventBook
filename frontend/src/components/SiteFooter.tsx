import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Brand } from './Brand';

export function SiteFooter() {
  return (
    <footer className="site-footer site-container">
      <div>
        <Brand />
        <p>Viva o momento. Guarde a história.</p>
      </div>
      <nav aria-label="Links do rodapé">
        <Link to="/events">Explorar eventos</Link>
        <Link to="/login">Minha conta</Link>
        <Link to="/dashboard">
          Organizar um evento <ArrowUpRight size={14} />
        </Link>
      </nav>
      <span className="footer-note">Feito para conectar pessoas e experiências.</span>
    </footer>
  );
}
