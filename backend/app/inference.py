import json
from pathlib import Path
import torch
from PIL import Image, UnidentifiedImageError
from torchvision import models, transforms
from backend.app.config import settings

class ModelNotReady(RuntimeError):
    pass

class LeafClassifier:
    def __init__(self):
        self.model = None
        self.classes: list[str] = []
        self.version = "untrained"
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225]),
        ])
        self.load()

    def load(self):
        artifact_dir = settings.artifacts_path
        weights = artifact_dir / "model.pt"
        labels = artifact_dir / "classes.json"
        if not weights.exists() or not labels.exists():
            self.model = None
            self.classes = []
            self.version = "untrained"
            return
        try:
            self.classes = json.loads(labels.read_text(encoding="utf-8"))
            if not isinstance(self.classes, list) or not self.classes:
                raise ValueError("classes.json must contain a non-empty JSON array.")
            model = models.mobilenet_v3_small(weights=None)
            model.classifier[3] = torch.nn.Linear(model.classifier[3].in_features, len(self.classes))
            state = torch.load(weights, map_location="cpu", weights_only=True)
            model.load_state_dict(state)
            model.eval()
            self.model = model
            self.version = "mobilenet_v3_small"
        except Exception as exc:
            self.model = None
            self.classes = []
            raise RuntimeError(f"Could not load model artifacts: {exc}") from exc

    @property
    def ready(self) -> bool:
        return self.model is not None and bool(self.classes)

    def predict(self, image: Image.Image) -> dict:
        if not self.ready:
            raise ModelNotReady("No trained model found. Follow README.md to train on real labeled images.")
        tensor = self.transform(image.convert("RGB")).unsqueeze(0)
        with torch.inference_mode():
            logits = self.model(tensor)
            probabilities = torch.softmax(logits, dim=1)[0]
        index = int(torch.argmax(probabilities).item())
        return {
            "predicted_class": self.classes[index],
            "confidence": float(probabilities[index].item()),
            "model_version": self.version,
            "top_predictions": [
                {"label": self.classes[i], "score": float(probabilities[i].item())}
                for i in torch.topk(probabilities, k=min(3, len(self.classes))).indices.tolist()
            ],
            "note": "Model output is decision support, not a confirmed diagnosis. Softmax scores may be uncalibrated."
        }

classifier = LeafClassifier()
