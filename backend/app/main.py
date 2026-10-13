from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
import uuid
import requests
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.db import Base, engine, get_db
from backend.app.inference import classifier, ModelNotReady
from backend.app.models import Farm, Scan
from backend.app.schemas import FarmCreate, FarmOut, HealthResponse, ScanOut

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    settings.uploads_path.mkdir(parents=True, exist_ok=True)
    yield

app = FastAPI(title="AgriVision AI API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"name": "AgriVision AI", "docs": "/docs", "api_prefix": "/api/v1"}

@app.get("/api/v1/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        model_ready=classifier.ready,
        model_version=classifier.version if classifier.ready else None,
        message="Model loaded and ready." if classifier.ready else
        "API is running, but no trained model artifacts were found. Train a real model before requesting predictions."
    )

@app.post("/api/v1/predictions")
async def predict_leaf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not classifier.ready:
        raise HTTPException(status_code=503, detail={
            "code": "MODEL_NOT_READY",
            "message": "No trained model is available. Follow README.md to train with real labeled images."
        })
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload an image file.")
    max_bytes = settings.max_upload_mb * 1024 * 1024
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Image exceeds {settings.max_upload_mb} MB limit.")
    try:
        image = Image.open(BytesIO(content))
        image.verify()
        image = Image.open(BytesIO(content)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.")
    try:
        result = classifier.predict(image)
    except ModelNotReady as exc:
        raise HTTPException(status_code=503, detail={"code": "MODEL_NOT_READY", "message": str(exc)})
    safe_name = Path(file.filename or "leaf.jpg").name[:200]
    saved_name = f"{uuid.uuid4().hex}_{safe_name}"
    settings.uploads_path.mkdir(parents=True, exist_ok=True)
    (settings.uploads_path / saved_name).write_bytes(content)
    record = Scan(
        filename=saved_name,
        predicted_class=result["predicted_class"],
        confidence=result["confidence"],
        model_version=result["model_version"],
        note=result["note"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"scan": ScanOut.model_validate(record), "top_predictions": result["top_predictions"], "note": result["note"]}

@app.get("/api/v1/scans", response_model=list[ScanOut])
def list_scans(limit: int = Query(default=20, ge=1, le=100), db: Session = Depends(get_db)):
    return db.query(Scan).order_by(Scan.created_at.desc()).limit(limit).all()

@app.get("/api/v1/farms", response_model=list[FarmOut])
def list_farms(db: Session = Depends(get_db)):
    return db.query(Farm).order_by(Farm.created_at.desc()).all()

@app.post("/api/v1/farms", response_model=FarmOut, status_code=201)
def create_farm(payload: FarmCreate, db: Session = Depends(get_db)):
    farm = Farm(name=payload.name.strip(), crop=payload.crop.strip(), location=payload.location.strip())
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return farm

@app.get("/api/v1/weather")
def weather(latitude: float = Query(ge=-90, le=90), longitude: float = Query(ge=-180, le=180)):
    try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": latitude, "longitude": longitude,
                "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "forecast_days": 3, "timezone": "auto"
            },
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Weather service is temporarily unavailable.")
