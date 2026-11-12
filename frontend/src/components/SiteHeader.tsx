import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowUpRight, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Brand } from './Brand';

export function SiteHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const organizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Navegação principal">
          <NavLink to="/events">Explorar eventos</NavLink>
          <Link to={organizer ? '/dashboard' : '/login'}>
            Área do organizador <ArrowUpRight size={14} />
          </Link>
        </nav>
        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <span className="user-greeting">Olá, {user?.name.split(' ')[0]}</span>
              <button className="button-ghost" onClick={logout}>
                <LogOut size={16} /> Sair
              </button>
            </>
          ) : (
            <>
              <Link className="login-link" to="/login">
                Entrar
              </Link>
              <Link className="button-primary small" to="/register">
                Criar conta <ArrowUpRight size={16} />
              </Link>
            </>
          )}
          <button
            className="mobile-menu button-ghost"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-navigation" className="mobile-navigation" aria-label="Navegação móvel">
          <Link onClick={() => setOpen(false)} to="/events">
            Explorar eventos
          </Link>
          <Link onClick={() => setOpen(false)} to={organizer ? '/dashboard' : '/login'}>
            Área do organizador
          </Link>
          {!isAuthenticated && (
            <Link onClick={() => setOpen(false)} to="/login">
              Entrar na minha conta
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
