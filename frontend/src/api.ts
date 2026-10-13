import type { Farm, Health, PredictionResponse, Scan } from './types'
const configuredBase = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const BASE = configuredBase.startsWith('http://') || configuredBase.startsWith('https://') ? configuredBase : `https://${configuredBase}`
async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = data?.detail
    throw new Error(typeof detail === 'string' ? detail : detail?.message || `Request failed (${response.status})`)
  }
  return data as T
}
export const api = {
  health: () => fetch(`${BASE}/api/v1/health`).then(r => parse<Health>(r)),
  scans: () => fetch(`${BASE}/api/v1/scans?limit=8`).then(r => parse<Scan[]>(r)),
  farms: () => fetch(`${BASE}/api/v1/farms`).then(r => parse<Farm[]>(r)),
  createFarm: (farm: {name:string; crop:string; location:string}) => fetch(`${BASE}/api/v1/farms`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(farm)}).then(r => parse<Farm>(r)),
  predict: (file: File) => { const body = new FormData(); body.append('file', file); return fetch(`${BASE}/api/v1/predictions`, {method:'POST', body}).then(r => parse<PredictionResponse>(r)) },
  weather: (latitude:number, longitude:number) => fetch(`${BASE}/api/v1/weather?latitude=${latitude}&longitude=${longitude}`).then(r => parse<any>(r)),
}
