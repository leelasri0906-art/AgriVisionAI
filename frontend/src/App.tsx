
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Activity,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  CloudSun,
  Database,
  FileImage,
  FlaskConical,
  Leaf,
  MapPin,
  Plus,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sprout,
  UploadCloud,
  X,
} from 'lucide-react'
import { api } from './api'
import type { Farm, Health, PredictionResponse, Scan } from './types'

function formatClassName(value: string) {
  return value.replace(/___/g, ' — ').replace(/_/g, ' ')
}

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [scans, setScans] = useState<Scan[]>([])
  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [prediction, setPrediction] =
    useState<PredictionResponse | null>(null)
  const [error, setError] = useState('')
  const [farmForm, setFarmForm] = useState({
    name: '',
    crop: 'Tomato',
    location: '',
  })
  const [showFarmForm, setShowFarmForm] = useState(false)
  const [farmMessage, setFarmMessage] = useState('')
  const [weather, setWeather] = useState<any>(null)
  const [weatherError, setWeatherError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setLoading(true)

    try {
      const [h, s, f] = await Promise.all([
        api.health(),
        api.scans(),
        api.farms(),
      ])

      setHealth(h)
      setScans(s)
      setFarms(f)
      setError('')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not connect to the API.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    if (!file) {
      setPreview('')
      return
    }

    const url = URL.createObjectURL(file)
    setPreview(url)

    return () => URL.revokeObjectURL(url)
  }, [file])

  const totalScans = scans.length

  const averageConfidence = useMemo(
    () =>
      scans.length
        ? Math.round(
            (scans.reduce((total, scan) => total + scan.confidence, 0) /
              scans.length) *
              100,
          )
        : null,
    [scans],
  )

  async function submitScan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!file) {
      setError('Choose a real leaf image before starting a scan.')
      return
    }

    setBusy(true)
    setError('')
    setPrediction(null)

    try {
      const result = await api.predict(file)
      setPrediction(result)
      await refresh()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Prediction failed.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function addFarm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFarmMessage('')

    try {
      await api.createFarm(farmForm)

      setFarmForm({
        name: '',
        crop: 'Tomato',
        location: '',
      })

      setShowFarmForm(false)
      setFarmMessage('Farm saved successfully.')
      await refresh()
    } catch (e) {
      setFarmMessage(
        e instanceof Error ? e.message : 'Could not save farm.',
      )
    }
  }

  async function loadWeather() {
    setWeatherError('')

    try {
      if (!navigator.geolocation) {
        throw new Error('Location is not available in this browser.')
      }

      const coords = await new Promise<GeolocationCoordinates>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position.coords),
            () =>
              reject(
                new Error(
                  'Location permission denied. Enable it in browser settings.',
                ),
              ),
            { timeout: 8000 },
          )
        },
      )

      setWeather(
        await api.weather(coords.latitude, coords.longitude),
      )
    } catch (e) {
      setWeatherError(
        e instanceof Error ? e.message : 'Weather unavailable.',
      )
    }
  }

  const current = weather?.current

  const nav = [
    { label: 'Overview', icon: Activity, href: '#overview' },
    { label: 'Leaf diagnostics', icon: ScanLine, href: '#diagnostics' },
    { label: 'My farms', icon: Sprout, href: '#farms' },
    { label: 'Weather insights', icon: CloudSun, href: '#weather' },
    { label: 'Model evaluation', icon: FlaskConical, href: '#evaluation' },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Leaf size={22} />
          </div>
          <div>
            <strong>
              AgriVision<span>AI</span>
            </strong>
            <small>FIELD INTELLIGENCE</small>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav>
          {nav.map((item, index) => {
            const Icon = item.icon

            return (
              <a
                key={item.label}
                href={item.href}
                className={index === 0 ? 'nav-item active' : 'nav-item'}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {index === 1 && <span className="nav-dot" />}
              </a>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="status-line">
            <span
              className={
                health?.model_ready
                  ? 'status-dot'
                  : 'status-dot warn'
              }
            />
            <span>
              {health?.model_ready
                ? 'ML model online'
                : 'ML model not trained'}
            </span>
          </div>

          <div className="sidebar-note">
            A decision-support tool for healthier crops and more informed
            farming.
          </div>

          <div className="profile">
            <div className="avatar">AV</div>
            <div>
              <strong>Farm workspace</strong>
              <small>AgriVision AI</small>
            </div>
          </div>

          <ChevronRight size={15} />
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>Overview</strong>
          </div>

          <div className="top-actions">
            <span className="live-pill">
              <span />
              SYSTEM STATUS
            </span>
            <button
              className="icon-btn"
              aria-label="Notifications"
              type="button"
            >
              <Bell size={18} />
            </button>
            <button
              className="avatar small"
              aria-label="Profile"
              type="button"
            >
              AV
            </button>
          </div>
        </header>

        <div className="content" id="overview">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-icon">
                  <Sprout size={14} />
                </span>
                SMART AGRICULTURE PLATFORM
              </div>
              <h1>
                Good day, <em>grower.</em>
              </h1>
              <p className="subtitle">
                A clearer view of your crops starts here. Monitor plant
                health, scan leaves, and make informed decisions.
              </p>
            </div>

            <button
              className="button secondary"
              onClick={() => void refresh()}
              type="button"
            >
              <RefreshCw size={15} />
              Refresh data
            </button>
          </section>

          {error && (
            <div className="alert error">
              <X size={18} />
              <div>
                <strong>Action needs attention</strong>
                <p>{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="alert-close"
                aria-label="Dismiss error"
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <section className="stat-grid">
            <div className="stat-card">
              <div className="stat-top">
                <span>Saved scans</span>
                <span className="stat-icon green">
                  <ScanLine size={18} />
                </span>
              </div>
              <div className="stat-value">
                {totalScans}
                <span className="stat-unit">records</span>
              </div>
              <div className="stat-foot">
                <Database size={13} />
                Actual records from your database
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Farm profiles</span>
                <span className="stat-icon gold">
                  <Sprout size={18} />
                </span>
              </div>
              <div className="stat-value">
                {farms.length}
                <span className="stat-unit">farms</span>
              </div>
              <div className="stat-foot">
                <MapPin size={13} />
                Saved farm profiles
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Mean model score</span>
                <span className="stat-icon blue">
                  <Activity size={18} />
                </span>
              </div>
              <div className="stat-value">
                {averageConfidence === null
                  ? '—'
                  : `${averageConfidence}%`}
                <span className="stat-unit">
                  {averageConfidence === null
                    ? 'no scans'
                    : 'of recent scans'}
                </span>
              </div>
              <div className="stat-foot">
                Not an accuracy metric or calibrated probability
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Inference status</span>
                <span className="stat-icon purple">
                  <ShieldCheck size={18} />
                </span>
              </div>
              <div className="stat-value status-value">
                {health?.model_ready ? 'Ready' : 'Not ready'}
              </div>
              <div className="stat-foot">
                <span
                  className={
                    health?.model_ready
                      ? 'status-dot'
                      : 'status-dot warn'
                  }
                />
                {health?.model_ready
                  ? 'Trained model loaded'
                  : 'Train on real images first'}
              </div>
            </div>
          </section>

          <section className="main-grid">
            <div className="panel scan-panel" id="diagnostics">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">CROP HEALTH</div>
                  <h2>Leaf diagnostics</h2>
                  <p>Upload a clear image of one leaf for model inference.</p>
                </div>
                <span className="heading-icon">
                  <ScanLine size={20} />
                </span>
              </div>

              <form onSubmit={submitScan}>
                <button
                  type="button"
                  className={`upload-zone ${preview ? 'has-image' : ''}`}
                  onClick={() => inputRef.current?.click()}
                >
                  {preview ? (
                    <>
                      <img src={preview} alt="Selected leaf preview" />
                      <span className="change-image">Change image</span>
                    </>
                  ) : (
                    <>
                      <span className="upload-icon">
                        <UploadCloud size={24} />
                      </span>
                      <strong>Drop a leaf image here</strong>
                      <span>
                        or click to browse · JPG, PNG, WEBP · up to 8 MB
                      </span>
                      <span className="upload-cta">
                        <FileImage size={15} />
                        Choose image
                      </span>
                    </>
                  )}
                </button>

                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => {
                    const selected = e.target.files?.[0] || null

                    if (selected && selected.size > 8 * 1024 * 1024) {
                      setError('Choose an image smaller than 8 MB.')
                      e.target.value = ''
                      return
                    }

                    setFile(selected)
                    setPrediction(null)
                    setError('')
                  }}
                />

                {file && (
                  <div className="file-row">
                    <FileImage size={16} />
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null)
                        setPrediction(null)
                        if (inputRef.current) {
                          inputRef.current.value = ''
                        }
                      }}
                      aria-label="Remove image"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                <button
                  className="button primary scan-button"
                  type="submit"
                  disabled={busy || !file || !health?.model_ready}
                >
                  {busy ? (
                    <>
                      <RefreshCw className="spin" size={16} />
                      Analyzing image…
                    </>
                  ) : (
                    <>
                      <ScanLine size={16} />
                      Analyze crop health
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>

                {!health?.model_ready && (
                  <div className="model-notice">
                    <FlaskConical size={16} />
                    <div>
                      <strong>Model training required</strong>
                      <p>
                        No trained model is loaded. Follow the README to
                        download PlantVillage and train the classifier.
                        Predictions remain disabled until then.
                      </p>
                    </div>
                  </div>
                )}
              </form>

              {prediction && (
                <div className="prediction-result">
                  <div className="result-title">
                    <CheckCircle2 size={18} />
                    Model inference result
                  </div>

                  <h3>
                    {formatClassName(prediction.scan.predicted_class)}
                  </h3>

                  <div className="confidence-row">
                    <span>Top class score</span>
                    <strong>
                      {(prediction.scan.confidence * 100).toFixed(1)}%
                    </strong>
                  </div>

                  <div className="meter">
                    <span
                      style={{
                        width: `${prediction.scan.confidence * 100}%`,
                      }}
                    />
                  </div>

                  <p>{prediction.note}</p>

                  <div className="top-classes">
                    {prediction.top_predictions.map((item) => (
                      <div key={item.label}>
                        <span>{formatClassName(item.label)}</span>
                        <strong>{(item.score * 100).toFixed(1)}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="right-stack">
              <div className="panel model-panel" id="evaluation">
                <div className="panel-heading compact">
                  <div>
                    <div className="section-kicker">MODEL HEALTH</div>
                    <h2>AI readiness</h2>
                  </div>
                  <span className="heading-icon">
                    <FlaskConical size={19} />
                  </span>
                </div>

                <div
                  className={`model-state ${
                    health?.model_ready ? 'ready' : ''
                  }`}
                >
                  <div className="model-state-icon">
                    {health?.model_ready ? (
                      <CheckCircle2 size={21} />
                    ) : (
                      <Activity size={21} />
                    )}
                  </div>
                  <div>
                    <strong>
                      {health?.model_ready
                        ? 'Classifier loaded'
                        : 'Waiting for model artifacts'}
                    </strong>
                    <p>{health?.message || 'Checking API connection…'}</p>
                  </div>
                </div>

                <div className="model-meta">
                  <div>
                    <span>Architecture</span>
                    <strong>MobileNetV3-Small</strong>
                  </div>
                  <div>
                    <span>Input size</span>
                    <strong>224 × 224 RGB</strong>
                  </div>
                  <div>
                    <span>Data policy</span>
                    <strong>Real labeled images</strong>
                  </div>
                </div>

                <a
                  className="text-link"
                  href="https://github.com/spMohanty/PlantVillage-Dataset"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open PlantVillage dataset <ArrowUpRight size={14} />
                </a>
              </div>

              <div className="panel weather-panel" id="weather">
                <div className="panel-heading compact">
                  <div>
                    <div className="section-kicker">LOCAL CONDITIONS</div>
                    <h2>Weather snapshot</h2>
                  </div>
                  <span className="heading-icon weather-icon">
                    <CloudSun size={20} />
                  </span>
                </div>

                {current ? (
                  <>
                    <div className="weather-main">
                      <CloudSun size={34} />
                      <div>
                        <strong>
                          {Math.round(current.temperature_2m)}°C
                        </strong>
                        <span>Current temperature</span>
                      </div>
                    </div>

                    <div className="weather-metrics">
                      <div>
                        <span>Humidity</span>
                        <strong>
                          {current.relative_humidity_2m}%
                        </strong>
                      </div>
                      <div>
                        <span>Precipitation</span>
                        <strong>{current.precipitation} mm</strong>
                      </div>
                      <div>
                        <span>Wind</span>
                        <strong>{current.wind_speed_10m} km/h</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="weather-empty">
                    <CloudSun size={28} />
                    <p>
                      Load current weather for your location. Your browser
                      will ask for permission.
                    </p>
                    <button
                      className="button secondary full"
                      onClick={() => void loadWeather()}
                      type="button"
                    >
                      Get local weather <ChevronRight size={15} />
                    </button>
                    {weatherError && (
                      <small className="error-text">{weatherError}</small>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="lower-grid">
            <div className="panel history-panel">
              <div className="panel-heading compact">
                <div>
                  <div className="section-kicker">DATABASE RECORDS</div>
                  <h2>Recent scan history</h2>
                  <p>Completed model inferences saved by the API.</p>
                </div>
                <span className="heading-icon">
                  <Activity size={19} />
                </span>
              </div>

              {loading ? (
                <div className="empty-state">Loading records…</div>
              ) : scans.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-illustration">
                    <Leaf size={25} />
                  </div>
                  <strong>No scans saved yet</strong>
                  <p>
                    Once a trained model is available, completed scans will
                    appear here.
                  </p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>CLASSIFICATION</th>
                        <th>SCORE</th>
                        <th>MODEL</th>
                        <th>DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scans.map((scan) => (
                        <tr key={scan.id}>
                          <td>
                            <span className="leaf-dot" />
                            {formatClassName(scan.predicted_class)}
                          </td>
                          <td>
                            {(scan.confidence * 100).toFixed(1)}%
                          </td>
                          <td>{scan.model_version}</td>
                          <td>
                            {new Date(
                              scan.created_at,
                            ).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="panel farms-panel" id="farms">
              <div className="panel-heading compact">
                <div>
                  <div className="section-kicker">FARM MANAGEMENT</div>
                  <h2>My farms</h2>
                  <p>Keep crop and location details organized.</p>
                </div>
                <button
                  className="add-btn"
                  onClick={() => setShowFarmForm((value) => !value)}
                  aria-label="Add farm"
                  type="button"
                >
                  <Plus size={18} />
                </button>
              </div>

              {showFarmForm && (
                <form className="farm-form" onSubmit={addFarm}>
                  <label>
                    Farm name
                    <input
                      required
                      maxLength={120}
                      value={farmForm.name}
                      onChange={(e) =>
                        setFarmForm({
                          ...farmForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g. Home farm"
                    />
                  </label>

                  <label>
                    Main crop
                    <select
                      value={farmForm.crop}
                      onChange={(e) =>
                        setFarmForm({
                          ...farmForm,
                          crop: e.target.value,
                        })
                      }
                    >
                      {[
                        'Tomato',
                        'Rice',
                        'Chilli',
                        'Cotton',
                        'Maize',
                        'Mango',
                        'Other',
                      ].map((crop) => (
                        <option key={crop} value={crop}>
                          {crop}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Location
                    <input
                      value={farmForm.location}
                      onChange={(e) =>
                        setFarmForm({
                          ...farmForm,
                          location: e.target.value,
                        })
                      }
                      placeholder="Village / district"
                    />
                  </label>

                  <button
                    className="button primary full"
                    type="submit"
                  >
                    Save farm profile
                  </button>
                </form>
              )}

              {farmMessage && (
                <p className="form-message">{farmMessage}</p>
              )}

              {farms.length === 0 && !showFarmForm ? (
                <div className="empty-state small-empty">
                  <div className="empty-illustration">
                    <Sprout size={23} />
                  </div>
                  <strong>No farm profiles</strong>
                  <p>
                    Add a farm to begin organizing crop information.
                  </p>
                  <button
                    className="text-link"
                    onClick={() => setShowFarmForm(true)}
                    type="button"
                  >
                    Create first farm <ChevronRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="farm-list">
                  {farms.map((farm) => (
                    <div className="farm-item" key={farm.id}>
                      <div className="farm-avatar">
                        <Sprout size={19} />
                      </div>
                      <div className="farm-info">
                        <strong>{farm.name}</strong>
                        <span>
                          {farm.crop}
                          {farm.location && ` · ${farm.location}`}
                        </span>
                      </div>
                      <ChevronRight size={16} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <footer>
            <div className="footer-brand">
              <Leaf size={16} /> AgriVision AI
            </div>
            <span>Built for evidence-based crop health exploration.</span>
            <span className="footer-note">
              <ShieldCheck size={14} />
              Decision support · Not a certified diagnosis
            </span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
