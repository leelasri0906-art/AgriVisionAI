from datetime import datetime
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str
    model_ready: bool
    model_version: str | None = None
    message: str

class FarmCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    crop: str = Field(min_length=1, max_length=80)
    location: str = Field(default="", max_length=160)

class FarmOut(BaseModel):
    id: int
    name: str
    crop: str
    location: str
    created_at: datetime
    class Config:
        from_attributes = True

class ScanOut(BaseModel):
    id: int
    filename: str
    predicted_class: str
    confidence: float
    model_version: str
    farm_id: int | None
    created_at: datetime
    note: str
    class Config:
        from_attributes = True
