import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

const API_BASE_URL =
  'https://apitekera-c8atgfakc0ggb0fw.westus3-01.azurewebsites.net'

type Page = 'review' | 'entry'

interface Category {
  id: number
  name: string
}

interface VocabularyEntry {
  id: number
  entry: string
  meaning: string
  hiragana: string
  katakana: string
  positive: string
  negative: string
  pastPositive: string
  pastNegative: string
}

interface EntryForm {
  entry: string
  meaning: string
  hiragana: string
  katakana: string
  positive: string
  negative: string
  pastPositive: string
  pastNegative: string
}

const emptyForm: EntryForm = {
  entry: '',
  meaning: '',
  hiragana: '',
  katakana: '',
  positive: '',
  negative: '',
  pastPositive: '',
  pastNegative: '',
}

const formFields: {
  key: keyof EntryForm
  label: string
  maxLength: number
}[] = [
  { key: 'entry', label: 'Entry', maxLength: 128 },
  { key: 'meaning', label: 'Meaning', maxLength: 512 },
  { key: 'hiragana', label: 'ひらがな', maxLength: 32 },
  { key: 'katakana', label: 'カタカナ', maxLength: 32 },
  { key: 'positive', label: 'Positive', maxLength: 32 },
  { key: 'negative', label: 'Negative', maxLength: 32 },
  { key: 'pastPositive', label: 'Past positive', maxLength: 32 },
  { key: 'pastNegative', label: 'Past negative', maxLength: 32 },
]

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(
      details || `The API request failed (${response.status} ${response.statusText}).`,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function App() {
  const [page, setPage] = useState<Page>('review')
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  useEffect(() => {
    let active = true

    apiRequest<Category[]>('/api/categories')
      .then((loadedCategories) => {
        if (!active) return
        setCategories(loadedCategories)
        const defaultCategory = loadedCategories.find(
          (category) => category.id === 7,
        )
        if (defaultCategory || loadedCategories.length > 0) {
          setCategoryId(String(defaultCategory?.id ?? loadedCategories[0].id))
        }
      })
      .catch((error: unknown) => {
        if (!active) return
        setCategoryError(
          error instanceof Error ? error.message : 'Could not load categories.',
        )
      })
      .finally(() => {
        if (active) setCategoriesLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="JLPT home">
          <span className="brand-mark" aria-hidden="true">文</span>
          <span>WebJLPT</span>
        </a>
        <span className="header-caption">Japanese, one word at a time</span>
      </header>

      <nav className="main-nav" aria-label="Main navigation">
        <button
          type="button"
          className={page === 'review' ? 'nav-button active' : 'nav-button'}
          aria-current={page === 'review' ? 'page' : undefined}
          onClick={() => setPage('review')}
        >
          <span aria-hidden="true">◉</span>
          Review
        </button>
        <button
          type="button"
          className={page === 'entry' ? 'nav-button active' : 'nav-button'}
          aria-current={page === 'entry' ? 'page' : undefined}
          onClick={() => setPage('entry')}
        >
          <span aria-hidden="true">＋</span>
          Data entry
        </button>
      </nav>

      <main className="page-content">
        {page === 'review' ? (
          <ReviewPage
            categories={categories}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            categoriesLoading={categoriesLoading}
            categoryError={categoryError}
          />
        ) : (
          <DataEntryPage
            categories={categories}
            categoriesLoading={categoriesLoading}
            categoryError={categoryError}
          />
        )}
      </main>

      <footer className="site-footer">Keep going—you’re making progress.</footer>
    </div>
  )
}

interface PageDataProps {
  categories: Category[]
  categoriesLoading: boolean
  categoryError: string
}

function ReviewPage({
  categories,
  categoryId,
  setCategoryId,
  categoriesLoading,
  categoryError,
}: PageDataProps & {
  categoryId: string
  setCategoryId: (categoryId: string) => void
}) {
  const [entries, setEntries] = useState<VocabularyEntry[]>([])
  const [loadedCategoryId, setLoadedCategoryId] = useState('')
  const [entryIndex, setEntryIndex] = useState(0)
  const [revealedEntryId, setRevealedEntryId] = useState<number | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [loadError, setLoadError] = useState<{
    categoryId: string
    message: string
  } | null>(null)

  useEffect(() => {
    if (!categoryId) return

    let active = true

    apiRequest<VocabularyEntry[]>(
      `/api/categories/${encodeURIComponent(categoryId)}/entries`,
    )
      .then((loadedEntries) => {
        if (!active) return
        setEntries(loadedEntries)
        setEntryIndex(0)
        setLoadedCategoryId(categoryId)
        setLoadError(null)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setLoadError({
          categoryId,
          message:
            loadError instanceof Error
              ? loadError.message
              : 'Could not load review items.',
        })
      })

    return () => {
      active = false
    }
  }, [categoryId])

  const loading =
    Boolean(categoryId) &&
    loadedCategoryId !== categoryId &&
    loadError?.categoryId !== categoryId
  const error = loadError?.categoryId === categoryId ? loadError.message : ''
  const currentEntries = loadedCategoryId === categoryId ? entries : []
  const currentEntry = currentEntries[entryIndex]
  const detailsVisible = currentEntry?.id === revealedEntryId

  async function orderCurrentEntry(orderType: 1 | -1) {
    if (!currentEntry) return

    setSavingOrder(true)
    setRevealedEntryId(null)

    try {
      await apiRequest<void>(`/api/entries/${currentEntry.id}/order`, {
        method: 'POST',
        body: JSON.stringify({ orderType }),
      })
      const updatedEntries = await apiRequest<VocabularyEntry[]>(
        `/api/categories/${encodeURIComponent(categoryId)}/entries`,
      )
      const previousIndex = updatedEntries.findIndex(
        (entry) => entry.id === currentEntry.id,
      )
      setEntries(updatedEntries)
      setLoadedCategoryId(categoryId)
      setEntryIndex(
        updatedEntries.length === 0
          ? 0
          : previousIndex < 0
            ? 0
            : (previousIndex + 1) % updatedEntries.length,
      )
    } catch (orderError) {
      setLoadError({
        categoryId,
        message:
          orderError instanceof Error
            ? orderError.message
            : 'Could not update the review order.',
      })
    } finally {
      setSavingOrder(false)
    }
  }

  return (
    <section className="workflow" aria-labelledby="review-title">
      <div className="page-heading">
        <p className="eyebrow">Study session</p>
        <h1 id="review-title">Review vocabulary</h1>
        <p>Take a moment to recall the meaning before revealing the details.</p>
      </div>

      <label className="field category-field">
        <span>JLPT category</span>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          disabled={categoriesLoading || categories.length === 0}
        >
          <option value="">
            {categoriesLoading ? 'Loading categories…' : 'Choose a category'}
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      {categoryError && <p className="notice error" role="alert">{categoryError}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}

      <article className="review-card" aria-live="polite">
        {loading ? (
          <p className="empty-state">Loading your review item…</p>
        ) : currentEntry ? (
          <>
            <div className="card-topline">
              <span className="card-label">Word</span>
              <span className="card-count">
                {entryIndex + 1} / {entries.length}
              </span>
            </div>
            <p className="review-word" lang="ja">{currentEntry.entry}</p>
            {detailsVisible ? (
              <dl className="entry-details">
                <Detail label="Meaning" value={currentEntry.meaning} />
                <Detail label="Hiragana" value={currentEntry.hiragana} />
                <Detail label="Katakana" value={currentEntry.katakana} />
                <Detail label="Positive" value={currentEntry.positive} />
                <Detail label="Negative" value={currentEntry.negative} />
                <Detail label="Past positive" value={currentEntry.pastPositive} />
                <Detail label="Past negative" value={currentEntry.pastNegative} />
              </dl>
            ) : (
              <button
                type="button"
                className="button button-secondary reveal-button"
                onClick={() => setRevealedEntryId(currentEntry.id)}
              >
                Reveal meaning
              </button>
            )}
          </>
        ) : (
          <p className="empty-state">
            {categoryId && !loading && !error
              ? 'No entries in this category yet.'
              : 'Choose a category to start reviewing.'}
          </p>
        )}
      </article>

      <div className="review-actions">
        <button
          type="button"
          className="button button-secondary"
          disabled={!currentEntry || savingOrder || loading}
          onClick={() => void orderCurrentEntry(-1)}
        >
          Review again
        </button>
        <button
          type="button"
          className="button button-primary"
          disabled={!currentEntry || savingOrder || loading}
          onClick={() => void orderCurrentEntry(1)}
        >
          {savingOrder ? 'Saving…' : 'I know this'}
        </button>
      </div>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd lang={label === 'Meaning' ? undefined : 'ja'}>{value || '—'}</dd>
    </div>
  )
}

function DataEntryPage({
  categories,
  categoriesLoading,
  categoryError,
}: PageDataProps) {
  const [form, setForm] = useState<EntryForm>(emptyForm)
  const [categoryIds, setCategoryIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function updateField(key: keyof EntryForm, value: string) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }))
    setSuccess('')
  }

  function toggleCategory(id: number) {
    setCategoryIds((selected) =>
      selected.includes(id)
        ? selected.filter((categoryId) => categoryId !== id)
        : [...selected, id],
    )
    setSuccess('')
  }

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await apiRequest<void>('/api/entries', {
        method: 'POST',
        body: JSON.stringify({ ...form, categoryIds }),
      })
      setForm(emptyForm)
      setCategoryIds([])
      setSuccess('Vocabulary entry saved.')
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save this vocabulary entry.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="workflow" aria-labelledby="entry-title">
      <div className="page-heading">
        <p className="eyebrow">Grow your word list</p>
        <h1 id="entry-title">Add vocabulary</h1>
        <p>Save a word with its meaning, readings, and verb forms.</p>
      </div>

      {categoryError && <p className="notice error" role="alert">{categoryError}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
      {success && <p className="notice success" role="status">{success}</p>}

      <form className="entry-form" onSubmit={(event) => void submitEntry(event)}>
        <fieldset className="category-picker">
          <legend>JLPT categories</legend>
          {categoriesLoading ? (
            <p className="field-hint">Loading categories…</p>
          ) : categories.length === 0 ? (
            <p className="field-hint">No categories are available.</p>
          ) : (
            <div className="category-list">
              {categories.map((category) => (
                <label className="check-option" key={category.id}>
                  <input
                    type="checkbox"
                    checked={categoryIds.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="form-grid">
          {formFields.map((field) => (
            <label className="field" key={field.key}>
              <span>{field.label}</span>
              <input
                type="text"
                value={form[field.key]}
                maxLength={field.maxLength}
                onChange={(event) => updateField(field.key, event.target.value)}
                lang={field.key === 'hiragana' || field.key === 'katakana' ? 'ja' : undefined}
                autoComplete="off"
              />
            </label>
          ))}
        </div>

        <button
          type="submit"
          className="button button-primary submit-button"
          disabled={saving || categoriesLoading}
        >
          {saving ? 'Saving…' : 'Save vocabulary'}
        </button>
      </form>
    </section>
  )
}

export default App
