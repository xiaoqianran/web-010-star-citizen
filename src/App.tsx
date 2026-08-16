import { useMemo, useState } from 'react'
import { SHIPS, type Ship, type ShipRole } from './data/ships'

const ROLES: (ShipRole | 'All')[] = [
  'All',
  'Multi-Role',
  'Fighter',
  'Cargo',
  'Exploration',
  'Industrial',
]

function formatCredits(value: number): string {
  return `${value.toLocaleString('en-US')} aUEC`
}

export default function App() {
  const [activeRole, setActiveRole] = useState<ShipRole | 'All'>('All')
  const [query, setQuery] = useState('')
  const [fleet, setFleet] = useState<Ship[]>([])

  const visibleShips = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return SHIPS.filter((ship) => {
      const matchesRole = activeRole === 'All' || ship.role === activeRole
      const matchesQuery =
        normalized === '' ||
        ship.name.toLowerCase().includes(normalized) ||
        ship.manufacturer.toLowerCase().includes(normalized)
      return matchesRole && matchesQuery
    })
  }, [activeRole, query])

  const fleetIds = useMemo(() => new Set(fleet.map((ship) => ship.id)), [fleet])

  const totalValue = useMemo(
    () => fleet.reduce((sum, ship) => sum + ship.price, 0),
    [fleet],
  )
  const totalCargo = useMemo(
    () => fleet.reduce((sum, ship) => sum + ship.cargo, 0),
    [fleet],
  )

  function toggleFleet(ship: Ship) {
    setFleet((current) =>
      current.some((item) => item.id === ship.id)
        ? current.filter((item) => item.id !== ship.id)
        : [...current, ship],
    )
  }

  return (
    <div className="app">
      <div className="starfield" aria-hidden="true" />

      <header className="masthead">
        <div className="brand">
          <span className="brand__mark">✦</span>
          <div>
            <p className="brand__eyebrow">Roberts Space Industries</p>
            <h1 className="brand__title">Fleet Hangar</h1>
          </div>
        </div>
        <p className="masthead__tagline">
          Assemble your personal fleet from across the &apos;verse. Filter by role,
          search the shipyards, and hangar the vessels that fit your play style.
        </p>
      </header>

      <main className="layout">
        <section className="catalog" aria-label="Ship catalog">
          <div className="controls">
            <div className="search">
              <span className="search__icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ships or manufacturers…"
                aria-label="Search ships"
              />
            </div>
            <div className="filters" role="tablist" aria-label="Filter by role">
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  role="tab"
                  aria-selected={activeRole === role}
                  className={`chip ${activeRole === role ? 'chip--active' : ''}`}
                  onClick={() => setActiveRole(role)}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <p className="catalog__count">
            {visibleShips.length} ship{visibleShips.length === 1 ? '' : 's'} available
          </p>

          <ul className="ship-grid">
            {visibleShips.map((ship) => {
              const inFleet = fleetIds.has(ship.id)
              return (
                <li key={ship.id} className={`ship-card ${inFleet ? 'ship-card--owned' : ''}`}>
                  <div className="ship-card__head">
                    <span className={`role-badge role-badge--${ship.role.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                      {ship.role}
                    </span>
                    <span className="ship-card__price">{formatCredits(ship.price)}</span>
                  </div>
                  <h2 className="ship-card__name">{ship.name}</h2>
                  <p className="ship-card__maker">{ship.manufacturer}</p>
                  <p className="ship-card__blurb">{ship.blurb}</p>
                  <dl className="stats">
                    <div>
                      <dt>Crew</dt>
                      <dd>{ship.crew}</dd>
                    </div>
                    <div>
                      <dt>Cargo</dt>
                      <dd>{ship.cargo} SCU</dd>
                    </div>
                    <div>
                      <dt>Speed</dt>
                      <dd>{ship.speed} m/s</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className={`hangar-btn ${inFleet ? 'hangar-btn--remove' : ''}`}
                    onClick={() => toggleFleet(ship)}
                  >
                    {inFleet ? 'Remove from hangar' : 'Add to hangar'}
                  </button>
                </li>
              )
            })}
          </ul>

          {visibleShips.length === 0 && (
            <p className="empty">No ships match your search. Try another manufacturer.</p>
          )}
        </section>

        <aside className="hangar" aria-label="Your fleet">
          <h2 className="hangar__title">Your Hangar</h2>
          {fleet.length === 0 ? (
            <p className="hangar__empty">
              Your hangar is empty. Add ships from the catalog to start building your fleet.
            </p>
          ) : (
            <>
              <ul className="hangar__list">
                {fleet.map((ship) => (
                  <li key={ship.id} className="hangar__item">
                    <div>
                      <p className="hangar__ship">{ship.name}</p>
                      <p className="hangar__role">{ship.role}</p>
                    </div>
                    <button
                      type="button"
                      className="hangar__remove"
                      aria-label={`Remove ${ship.name}`}
                      onClick={() => toggleFleet(ship)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <dl className="summary">
                <div>
                  <dt>Ships</dt>
                  <dd>{fleet.length}</dd>
                </div>
                <div>
                  <dt>Total cargo</dt>
                  <dd>{totalCargo} SCU</dd>
                </div>
                <div>
                  <dt>Fleet value</dt>
                  <dd>{formatCredits(totalValue)}</dd>
                </div>
              </dl>
            </>
          )}
        </aside>
      </main>

      <footer className="footer">
        <p>
          Fan-made demo · Ship data is illustrative and not affiliated with Cloud Imperium Games.
        </p>
      </footer>
    </div>
  )
}
