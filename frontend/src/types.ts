export type Health = { status: string; model_ready: boolean; model_version?: string | null; message: string }
export type Scan = { id: number; filename: string; predicted_class: string; confidence: number; model_version: string; farm_id: number | null; created_at: string; note: string }
export type Farm = { id: number; name: string; crop: string; location: string; created_at: string }
export type PredictionResponse = { scan: Scan; top_predictions: { label: string; score: number }[]; note: string }
