import argparse
import json
from pathlib import Path

import torch
from PIL import Image
from torch import nn
from torchvision import models, transforms


def load_model(package_dir, device):
    package_dir = Path(package_dir)
    with (package_dir / "labels.json").open("r", encoding="utf-8") as f:
        labels_data = json.load(f)
    index_to_label = {int(k): v for k, v in labels_data["index_to_label"].items()}
    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, len(index_to_label))
    state = torch.load(package_dir / "best_model_state_dict.pt", map_location=device)
    model.load_state_dict(state)
    model.to(device)
    model.eval()
    return model, index_to_label


def predict(image_path, package_dir, topk, cpu):
    device = torch.device("cpu" if cpu or not torch.cuda.is_available() else "cuda")
    model, index_to_label = load_model(package_dir, device)
    transform = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    image = Image.open(image_path).convert("RGB")
    x = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1)[0]
    topk = min(topk, probs.numel())
    values, indices = torch.topk(probs, k=topk)
    return [
        {
            "label": index_to_label[int(i.item())],
            "prob": float(v.item()),
        }
        for v, i in zip(values, indices)
    ]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=str, required=True)
    parser.add_argument("--package-dir", type=str, default=".")
    parser.add_argument("--topk", type=int, default=3)
    parser.add_argument("--cpu", action="store_true")
    args = parser.parse_args()
    result = predict(args.image, args.package_dir, args.topk, args.cpu)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
