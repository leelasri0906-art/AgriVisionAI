import argparse, json, random
from pathlib import Path
import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, models, transforms

def seed_everything(seed: int):
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)

def main():
    parser = argparse.ArgumentParser(description="Train MobileNetV3-Small on a real folder-labeled leaf dataset.")
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--output-dir", default="backend/artifacts")
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=0.0005)
    parser.add_argument("--val-fraction", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    seed_everything(args.seed)
    data_path = Path(args.data_dir)
    if not data_path.exists():
        raise SystemExit(f"Dataset directory does not exist: {data_path}")
    if not 0.05 <= args.val_fraction <= 0.4:
        raise SystemExit("--val-fraction must be between 0.05 and 0.4")
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(12),
        transforms.ColorJitter(brightness=0.12, contrast=0.12, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    dataset = datasets.ImageFolder(str(data_path), transform=transform)
    if len(dataset.classes) < 2 or len(dataset) < 20:
        raise SystemExit("Expected at least two class folders and 20+ real labeled images. Verify dataset extraction.")
    val_size = max(1, int(len(dataset) * args.val_fraction))
    train_size = len(dataset) - val_size
    train_ds, val_ds = random_split(dataset, [train_size, val_size], generator=torch.Generator().manual_seed(args.seed))
    # Validation should not use augmentation; use same underlying files with deterministic transform.
    val_base = datasets.ImageFolder(str(data_path), transform=transforms.Compose([
        transforms.Resize((224, 224)), transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ]))
    val_ds = torch.utils.data.Subset(val_base, val_ds.indices)
    workers = 0  # reliable on Windows
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=workers)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=workers)
    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    for param in model.features.parameters():
        param.requires_grad = False
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, len(dataset.classes))
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=args.learning_rate)
    best_acc = -1.0
    output_dir = Path(args.output_dir); output_dir.mkdir(parents=True, exist_ok=True)
    for epoch in range(args.epochs):
        model.train()
        running_loss = 0.0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            logits = model(images)
            loss = criterion(logits, labels)
            loss.backward(); optimizer.step()
            running_loss += loss.item() * images.size(0)
        model.eval(); correct = total = 0
        with torch.inference_mode():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                preds = model(images).argmax(1)
                correct += (preds == labels).sum().item(); total += labels.size(0)
        val_acc = correct / max(total, 1)
        print(f"Epoch {epoch+1}/{args.epochs} | train_loss={running_loss/max(train_size,1):.4f} | validation_accuracy={val_acc:.4f}")
        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.cpu().state_dict(), output_dir / "model.pt")
            model.to(device)
            (output_dir / "classes.json").write_text(json.dumps(dataset.classes, indent=2), encoding="utf-8")
    print(f"Saved best checkpoint to {output_dir}. Best validation accuracy={best_acc:.4f}")
    print("Important: this random split is a baseline, not an external generalization test. Evaluate on a separately held-out dataset.")

if __name__ == "__main__":
    main()
