import { Link } from 'react-router-dom';

export function Brand() {
  return (
    <Link to="/events" className="brand" aria-label="EventBook — início">
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path
          d="M5 9h30v6a5 5 0 0 0 0 10v6H5v-6a5 5 0 0 0 0-10V9Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M11 13c4 0 7 1 9 4 2-3 5-4 9-4v13c-4 0-7 1-9 4-2-3-5-4-9-4V13Zm9 4v13M14 17l3 2m-3 3 3 2m6-5 3-2m-3 7 3-2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span>
        Event<span className="brand-blue">Book</span>
        <span className="brand-dot">®</span>
      </span>
    </Link>
  );
}
