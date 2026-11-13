import { useState } from 'react'
import './App.css'

function App() {
  const [page, setPage] = useState<'Review' | 'Data Entry'>('Review')

  return (
    <div className="app">
      <header className="site-header">
        <h1 className="brand">JLPT</h1>

        <nav className="nav" aria-label="Main navigation">
          <button
            type="button"
            className={page === 'Review' ? 'active' : ''}
            onClick={() => setPage('Review')}
          >
            Review
          </button>

          <button
            type="button"
            className={page === 'Data Entry' ? 'active' : ''}
            onClick={() => setPage('Data Entry')}
          >
            Data Entry
          </button>
        </nav>
      </header>

      <main className="page-content">
        <h2>{page}</h2>

        {page === 'Review' ? (
          <section className="card">
            <h3>Review a vocabulary item</h3>
            <p>Your review content will go here.</p>
          </section>
        ) : (
          <section className="card">
            <h3>Add vocabulary</h3>
            <p>Your data entry form will go here.</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default App