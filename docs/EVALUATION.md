# Model evaluation checklist

1. Download a real labeled dataset from its official source and document its version/license.
2. Keep a held-out test set that was not used for training or model selection.
3. Report sample count, class distribution, accuracy, macro precision, macro recall, macro F1, and per-class results.
4. Inspect the confusion matrix; identify classes that are commonly confused.
5. Evaluate on a separate real-world field image dataset where labels can be mapped correctly.
6. Record hardware, Python/PyTorch versions, model architecture, training settings, random seed, and date.
7. Do not report expected metrics as achieved metrics. The generated `reports/evaluation/metrics.json` contains results only after the evaluation script actually runs.
8. Avoid claims that the model replaces an agronomist or confirms disease from a photo alone.
