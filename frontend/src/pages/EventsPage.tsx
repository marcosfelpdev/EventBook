import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  MapPin,
  CalendarDays,
  Ticket,
  SlidersHorizontal,
  Sparkles,
  Music2,
  Mic2,
  Users,
  Check,
  X,
} from 'lucide-react';
import { eventsService } from '../services/eventsService';
import type { Event } from '../types/event';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { BlurFade } from '../components/BlurFade';

const suggestions = [
  { label: 'Música', query: 'música', icon: Music2 },
  { label: 'Festivais', query: 'festival', icon: Sparkles },
  { label: 'Conferências', query: 'conferência', icon: Mic2 },
  { label: 'Encontros', query: 'encontro', icon: Users },
];

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const pageSize = 6;

  useEffect(() => {
    let active = true;
    async function fetchEvents() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await eventsService.listEvents({
          page,
          pageSize,
          search: search || undefined,
        });
        if (active) {
          setEvents(response.data);
          setTotal(response.total);
        }
      } catch {
        if (active) {
          setErrorMessage('Não conseguimos carregar a programação. Tente novamente em instantes.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    void fetchEvents();
    return () => {
      active = false;
    };
  }, [page, search, reloadKey]);

  function selectSearch(value: string) {
    setSearchInput(value);
    setSearch(value);
    setPage(1);
  }
  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    selectSearch(searchInput.trim());
  }
  const totalPages = Math.ceil(total / pageSize);

  return (
    <main>
      <section className="hero site-container">
        <div className="hero-copy">
          <BlurFade>
            <span className="eyebrow">
              <span className="status-dot" /> MAIS ENCONTROS. MAIS HISTÓRIAS.
            </span>
            <h1>
              O próximo grande
              <br />
              momento começa
              <br />
              <span>aqui.</span>
              <svg className="hero-star" viewBox="0 0 60 60" aria-hidden="true">
                <path
                  d="M30 0v60M0 30h60M9 9l42 42M9 51 42 9"
                  stroke="currentColor"
                  strokeWidth="5"
                />
              </svg>
            </h1>
            <p>
              De um show inesquecível a uma ideia que muda tudo.
              <br className="desktop-only" /> Descubra experiências que combinam com você.
            </p>
            <div className="hero-buttons">
              <a href="#eventos" className="button-primary">
                Encontrar meu próximo evento <ArrowUpRight size={18} />
              </a>
              <span className="hero-note">
                <Ticket size={18} /> Sua próxima boa história.
              </span>
            </div>
          </BlurFade>
        </div>
        <BlurFade delay={0.15} className="hero-visual">
          <div className="hero-image">
            <img
              src="/images/live-music.jpg"
              alt="Público e luzes coloridas em um show de música ao vivo"
              fetchPriority="high"
            />
            <span className="image-caption">
              <span className="status-dot" /> EXPERIÊNCIAS QUE FICAM
            </span>
            <div className="image-bottom">
              <span>
                Menos tela.
                <br />
                <strong>Mais presença.</strong>
              </span>
              <span className="round-arrow">
                <ArrowUpRight size={28} />
              </span>
            </div>
          </div>
          <div className="floating-ticket">
            <div className="ticket-symbol">
              <Ticket size={25} />
            </div>
            <div>
              <strong>Você faz parte dessa história.</strong>
              <span>Encontre. Reserve. Viva.</span>
            </div>
            <span className="ticket-check">
              <Check size={17} />
            </span>
          </div>
          <span className="visual-coordinate">EVENTBOOK — VIVA O AGORA</span>
        </BlurFade>
      </section>
      <section className="discovery site-container" aria-label="Pesquisar eventos">
        <form onSubmit={handleSearchSubmit} className="discovery-search">
          <Search size={21} />
          <label className="sr-only" htmlFor="event-search">
            Buscar por evento ou cidade
          </label>
          <input
            id="event-search"
            placeholder="Qual vai ser a sua próxima experiência?"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button className="button-primary" type="submit">
            Explorar <ArrowRight size={17} />
          </button>
        </form>
        <div className="discovery-shortcuts">
          <span>Explore por interesse</span>
          <button
            className={!search ? 'category active' : 'category'}
            onClick={() => selectSearch('')}
          >
            <Ticket size={16} /> Todos
          </button>
          {suggestions.map(({ label, query, icon: Icon }) => (
            <button
              key={query}
              onClick={() => selectSearch(query)}
              className={search === query ? 'category active' : 'category'}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </section>
      <section id="eventos" className="catalog site-container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ESCOLHA SEU PRÓXIMO MOMENTO</span>
            <h2>
              {search ? 'Resultados da sua busca' : 'Próximos eventos'}
              <span className="heading-dot">.</span>
            </h2>
            <p>
              {search
                ? 'Buscando por “' + search + '”'
                : 'Uma nova experiência está esperando por você.'}
            </p>
          </div>
          <span className="catalog-filter">
            <SlidersHorizontal size={16} />
            {isLoading ? 'Carregando programação' : total + ' eventos na programação'}
          </span>
        </div>
        {search && (
          <button className="clear-search" onClick={() => selectSearch('')}>
            Limpar busca <X size={14} />
          </button>
        )}
        {isLoading && <Loading message="Encontrando novas experiências..." />}
        {!isLoading && errorMessage && (
          <ErrorState
            title="A programação não carregou"
            message={errorMessage}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        )}
        {!isLoading && !errorMessage && events.length === 0 && (
          <EmptyState
            title="Nenhum evento por aqui, por enquanto"
            description={
              search
                ? 'Tente outro nome, interesse ou cidade para descobrir novas experiências.'
                : 'Novos encontros serão publicados por aqui. Volte em breve.'
            }
            actionLabel={search ? 'Limpar busca' : undefined}
            onAction={() => selectSearch('')}
          />
        )}
        {!isLoading && !errorMessage && (
          <div className="event-grid">
            {events.map((event, index) => {
              const date = new Date(event.startsAt);
              const past = new Date(event.endsAt) < new Date();
              const prices = (event.lots ?? [])
                .filter((lot) => lot.active && lot.quantity > 0)
                .map((lot) => Number(lot.price));
              const price = prices.length ? Math.min(...prices) : undefined;
              return (
                <BlurFade key={event.id} delay={index * 0.06}>
                  <article className="event-card">
                    <Link
                      to={'/events/' + event.id}
                      className={'event-poster poster-' + (event.id % 3)}
                      aria-label={'Ver ' + event.title}
                    >
                      <span className="poster-label">EVENTBOOK APRESENTA</span>
                      <Ticket className="poster-icon" strokeWidth={0.7} aria-hidden="true" />
                      <span className="poster-title">{event.title}</span>
                      <span className="poster-date">
                        <strong>{date.toLocaleDateString('pt-BR', { day: '2-digit' })}</strong>
                        {date
                          .toLocaleDateString('pt-BR', { month: 'short' })
                          .replace('.', '')
                          .toUpperCase()}
                      </span>
                      <span className="poster-status">
                        {past ? 'Evento encerrado' : 'Para viver de perto'}
                      </span>
                    </Link>
                    <div className="event-info">
                      <span className="event-date">
                        <CalendarDays size={14} />
                        {date.toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'long',
                        })}{' '}
                        · {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <h3>
                        <Link to={'/events/' + event.id}>{event.title}</Link>
                      </h3>
                      <p>
                        <MapPin size={15} />
                        {event.location}
                      </p>
                    </div>
                    <div className="event-card-footer">
                      <div>
                        <span>
                          {past
                            ? 'Programação anterior'
                            : price === undefined
                              ? 'Confira a programação'
                              : 'Ingressos a partir de'}
                        </span>
                        {!past && price !== undefined && (
                          <strong>
                            {price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </strong>
                        )}
                      </div>
                      <Link
                        to={'/events/' + event.id}
                        className="event-link"
                        aria-label={'Ver detalhes de ' + event.title}
                      >
                        <ArrowUpRight size={22} />
                      </Link>
                    </div>
                  </article>
                </BlurFade>
              );
            })}
          </div>
        )}
        {!isLoading && !errorMessage && totalPages > 1 && (
          <nav className="pagination" aria-label="Paginação">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="button-ghost">
              Anterior
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="button-ghost"
            >
              Próxima
            </button>
          </nav>
        )}
      </section>
      <section className="organizer-banner site-container">
        <div className="organizer-decoration" aria-hidden="true">
          <Ticket size={140} strokeWidth={0.8} />
        </div>
        <div>
          <span className="eyebrow">DO SEU JEITO. COM A SUA MARCA.</span>
          <h2>
            Grandes encontros
            <br />
            começam com uma ideia.
          </h2>
          <p>Seu evento merece acontecer. Dê o próximo passo.</p>
        </div>
        <Link to="/dashboard" className="button-light">
          Acessar área do organizador <ArrowUpRight size={18} />
        </Link>
      </section>
    </main>
  );
}
