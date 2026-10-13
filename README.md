# AgriVision AI — Full-Stack Crop Health & Smart Farming Platform

An advanced college project using React + TypeScript + Tailwind CSS, FastAPI, PostgreSQL, and a real image-classification pipeline.

## Important model-integrity rule
The application does **not** fabricate predictions. Until a trained model artifact and its class-label file exist, `/api/v1/predictions` returns HTTP `503 MODEL_NOT_READY`. The frontend explains how to train the model. Confidence values are only shown when returned by actual model inference.

## Features
- Responsive React/TypeScript dashboard and leaf-image upload workflow
- FastAPI backend with validated upload limits and explicit model readiness status
- Real PyTorch transfer-learning training pipeline (MobileNetV3-Small)
- Dataset loader for PlantVillage folder datasets
- Separate evaluation script with accuracy, macro precision/recall/F1, confusion matrix and classification report
- Optional PlantDoc external evaluation folder support
- PostgreSQL persistence for farms and scan records
- Docker Compose for PostgreSQL
- Weather API service using Open-Meteo (optional, no API key)
- No synthetic training images, fake predictions, or hardcoded sample scan results

## Requirements
- Node.js 20+
- Python 3.11 (recommended; PyTorch support may lag newer Python releases)
- SQLite for easy local development (included with Python); PostgreSQL is recommended for deployment
- Real labeled leaf-image dataset downloaded from the dataset provider

## 1. Dataset setup
Use the official PlantVillage dataset:
- https://github.com/spMohanty/PlantVillage-Dataset

Follow the dataset repository's license and attribution requirements. Download it yourself; this project does not redistribute dataset images. Organize extracted data into class folders, for example:

```
data/plantvillage/
  Apple___Apple_scab/
    image_001.jpg
  Apple___healthy/
    image_002.jpg
  ...
```

The training script uses `ImageFolder` class-folder conventions. Do not put the test/validation set inside the training dataset directory if you intend to report a strict external evaluation. For a stronger generalization evaluation, separately obtain field images from PlantDoc:
- https://github.com/pratikkayal/PlantDoc-Dataset

Create a held-out folder with the same class names where labels genuinely correspond. Only compare classes that map unambiguously. Do not treat unrelated or unmatched labels as equivalent.

## 2. Run locally in VS Code (no Docker required)
From the project root folder (`AgriVisionAI`):

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
uvicorn backend.app.main:app --reload
```

The provided `.env.example` uses SQLite, so no Docker or PostgreSQL installation is required for local development. Open `http://127.0.0.1:8000/docs` to inspect the API. Leave this terminal running.

Open a **second VS Code terminal** at the project root:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`).

## 3. Train the real model
Download PlantVillage and organize its labeled class folders under `data/plantvillage/` as described above. Then, from the project root with the virtual environment active:

```powershell
python -m backend.ml.train --data-dir data/plantvillage --output-dir backend/artifacts --epochs 8
```

Training saves `model.pt` and `classes.json` under `backend/artifacts`. This downloads pretrained MobileNetV3 weights on first training, so an internet connection is required. Training time depends on your hardware. Before training completes, the prediction endpoint intentionally returns `503 MODEL_NOT_READY` instead of fake results.

## 4. Optional PostgreSQL for local development
You can keep SQLite locally. If you want PostgreSQL instead, install PostgreSQL or Docker Desktop, create a database named `agrivision`, and change `DATABASE_URL` in `backend/.env` to:

`postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/agrivision`

Only use `docker compose up -d db` if Docker Desktop is installed and running.

## 5. Deploy to Render
Deploy the frontend and backend as separate Render services. Keep the source in GitHub, and do not commit `.env`, `.venv`, datasets, or private credentials.

### Backend Web Service
- Repository: your AgriVision AI GitHub repository
- Root directory: repository root (leave blank)
- Build command: `pip install -r backend/requirements.txt`
- Start command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- Add environment variables:
  - `DATABASE_URL`: Render PostgreSQL **internal connection string**
  - `CORS_ORIGINS`: your deployed frontend URL, e.g. `https://agrivision-frontend.onrender.com`
  - `ARTIFACT_DIR`: `backend/artifacts`
  - `UPLOAD_DIR`: `backend/uploads`
  - `MAX_UPLOAD_MB`: `8`

Create a Render PostgreSQL database and use its internal connection string for `DATABASE_URL`. The backend supports Render's common PostgreSQL URL schemes.

### Frontend Static Site
- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment variable `VITE_API_BASE_URL`: the backend service URL, e.g. `https://agrivision-api.onrender.com`

Update `CORS_ORIGINS` to the exact deployed frontend origin, with no trailing slash. Redeploy the frontend after changing build-time environment variables.

### Model deployment warning
The trained weights are not included in this ZIP and are excluded from Git by `.gitignore`. A deployed API will continue to report `model_ready: false` until you make the real trained `model.pt` and `classes.json` available at `backend/artifacts` in the deployed service. For a public deployment, use a suitable model artifact store or an approved persistent storage approach; do not claim predictions work until `/api/v1/health` reports `model_ready: true`.

## 6. Evaluate a model
After training:
```powershell
python -m backend.ml.evaluate --data-dir data/plantvillage_test --artifact-dir backend/artifacts --output-dir reports/evaluation
```
Use a separate directory containing labeled images for the evaluation split. If the dataset provider's official split is available, prefer that over creating a random split after seeing results. Save and report the resulting metrics; do not claim performance before running evaluation.

## API overview
- `GET /api/v1/health` — service and model readiness
- `POST /api/v1/predictions` — multipart image inference; 503 if model isn't trained/loaded
- `GET /api/v1/scans` — recent persisted scans
- `GET /api/v1/farms` — list farms
- `POST /api/v1/farms` — create farm
- `GET /api/v1/weather?latitude=...&longitude=...` — optional forecast lookup

## Notes and limitations
- A leaf-image classifier is a decision-support prototype, not a certified diagnosis system.
- Dataset bias, background leakage, class imbalance and field-image domain shift can reduce real-world performance.
- Softmax confidence is not automatically calibrated probability. Avoid presenting it as certainty.
- Recommendations are deliberately cautious and advise users to consult local agricultural experts for consequential treatment decisions.
- Uploaded files are validated and stored under `backend/uploads`; for production use private object storage, malware scanning, retention policies, authentication, rate limiting, and HTTPS.
- The initial scaffold is for educational/local use. Add authentication and role-based access before exposing farmer data publicly.
