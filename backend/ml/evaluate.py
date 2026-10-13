import argparse, json
from pathlib import Path
import numpy as np
import torch
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support
from torchvision import datasets, models, transforms
from torch import nn
from torch.utils.data import DataLoader

def main():
    p = argparse.ArgumentParser(description="Evaluate a trained classifier on a held-out labeled folder dataset.")
    p.add_argument("--data-dir", required=True)
    p.add_argument("--artifact-dir", default="backend/artifacts")
    p.add_argument("--output-dir", default="reports/evaluation")
    args = p.parse_args()
    art = Path(args.artifact_dir)
    classes = json.loads((art / "classes.json").read_text(encoding="utf-8"))
    tfm = transforms.Compose([transforms.Resize((224,224)), transforms.ToTensor(),
        transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])])
    ds = datasets.ImageFolder(args.data_dir, transform=tfm)
    if ds.classes != classes:
        raise SystemExit("Class folder names/order do not match trained classes.json. Align the held-out class folders exactly; do not silently remap labels.")
    model = models.mobilenet_v3_small(weights=None)
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(classes))
    model.load_state_dict(torch.load(art / "model.pt", map_location="cpu", weights_only=True))
    model.eval()
    loader = DataLoader(ds, batch_size=32, shuffle=False, num_workers=0)
    y_true, y_pred = [], []
    with torch.inference_mode():
        for x, y in loader:
            pred = model(x).argmax(1)
            y_true.extend(y.numpy().tolist()); y_pred.extend(pred.numpy().tolist())
    out = Path(args.output_dir); out.mkdir(parents=True, exist_ok=True)
    metrics = {
        "sample_count": len(ds),
        "accuracy": accuracy_score(y_true, y_pred),
        "macro_precision_recall_f1": precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0).tolist(),
        "classification_report": classification_report(y_true, y_pred, target_names=classes, zero_division=0, output_dict=True),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
        "classes": classes,
    }
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (out / "classification_report.txt").write_text(classification_report(y_true, y_pred, target_names=classes, zero_division=0), encoding="utf-8")
    print(f"Samples: {len(ds)} | Accuracy: {metrics['accuracy']:.4f}")
    print(f"Saved actual evaluation results to {out}")

if __name__ == "__main__":
    main()
