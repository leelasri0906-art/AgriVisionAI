# Architecture

Browser (React/TypeScript) → FastAPI REST API → PyTorch MobileNetV3-Small inference
                                  ├→ PostgreSQL (`farms`, `scans`)
                                  ├→ private local upload folder (development)
                                  └→ Open-Meteo (weather lookup)

The inference service loads `backend/artifacts/model.pt` and `classes.json`. If either is absent or invalid, predictions are unavailable; no placeholder prediction is returned.
