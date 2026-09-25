"""
train_model.py

Trains a small autoencoder to learn a user's "normal" keystroke + sensor
pattern. At inference time, high reconstruction error = anomaly = possible
early stroke sign.

Feature vector (8 values per sample):
  [0] avg_dwell_time       - avg time key is held down (ms)
  [1] avg_flight_time      - avg time between key release and next key press (ms)
  [2] typing_speed         - keys per second
  [3] error_rate           - backspace/corrections per 100 keys
  [4] dwell_variance       - consistency of dwell time
  [5] flight_variance      - consistency of flight time
  [6] grip_strength        - from Arduino flex/grip sensor (normalized 0-1)
  [7] grip_asymmetry       - difference between left/right hand grip, if measured

Replace generate_synthetic_baseline() with real data pulled from your
Supabase `typing_baselines` / `sensor_baselines` tables once calibration
is actually saving data.
"""

import numpy as np
import torch
import torch.nn as nn

FEATURE_DIM = 8
SEED = 42

np.random.seed(SEED)
torch.manual_seed(SEED)


class KeystrokeAutoencoder(nn.Module):
    """Small autoencoder: learns to reconstruct 'normal' feature vectors.
    Anomalies (unfamiliar patterns) reconstruct poorly -> high error."""

    def __init__(self, input_dim=FEATURE_DIM, latent_dim=3):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 6),
            nn.ReLU(),
            nn.Linear(6, latent_dim),
            nn.ReLU(),
        )
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 6),
            nn.ReLU(),
            nn.Linear(6, input_dim),
        )

    def forward(self, x):
        z = self.encoder(x)
        out = self.decoder(z)
        return out


def generate_synthetic_baseline(n_samples=500):
    """
    Generates fake 'normal' typing/sensor data to train on before you have
    real calibration data. Centered around plausible values with realistic
    noise. SWAP THIS OUT for real user data as soon as you have it.
    """
    dwell = np.random.normal(120, 15, n_samples)          # ms
    flight = np.random.normal(180, 25, n_samples)          # ms
    speed = np.random.normal(4.5, 0.6, n_samples)           # keys/sec
    error_rate = np.random.normal(2.0, 0.8, n_samples)      # per 100 keys
    dwell_var = np.random.normal(10, 3, n_samples)
    flight_var = np.random.normal(15, 4, n_samples)
    grip = np.random.normal(0.75, 0.08, n_samples)          # normalized
    grip_asym = np.random.normal(0.05, 0.02, n_samples)     # small normally

    data = np.stack(
        [dwell, flight, speed, error_rate, dwell_var, flight_var, grip, grip_asym],
        axis=1,
    ).astype(np.float32)
    return data


def normalize(data, mean=None, std=None):
    if mean is None:
        mean = data.mean(axis=0)
    if std is None:
        std = data.std(axis=0) + 1e-6
    return (data - mean) / std, mean, std


def train():
    # 1. Get data (synthetic for now)
    raw_data = generate_synthetic_baseline(n_samples=500)
    data, mean, std = normalize(raw_data)
    tensor_data = torch.tensor(data, dtype=torch.float32)

    # 2. Split train/val
    n_val = 50
    train_data = tensor_data[:-n_val]
    val_data = tensor_data[-n_val:]

    # 3. Model + optimizer
    model = KeystrokeAutoencoder()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    loss_fn = nn.MSELoss()

    # 4. Train
    epochs = 200
    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        out = model(train_data)
        loss = loss_fn(out, train_data)
        loss.backward()
        optimizer.step()

        if epoch % 20 == 0:
            model.eval()
            with torch.no_grad():
                val_out = model(val_data)
                val_loss = loss_fn(val_out, val_data)
            print(f"Epoch {epoch:3d} | train_loss={loss.item():.4f} | val_loss={val_loss.item():.4f}")

    # 5. Compute anomaly threshold from validation reconstruction error
    model.eval()
    with torch.no_grad():
        val_out = model(val_data)
        per_sample_error = ((val_out - val_data) ** 2).mean(dim=1)
        threshold = per_sample_error.mean().item() + 3 * per_sample_error.std().item()

    print(f"\nSuggested anomaly threshold (reconstruction MSE): {threshold:.4f}")

    # 6. Save model + normalization stats + threshold together
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "feature_mean": mean,
            "feature_std": std,
            "anomaly_threshold": threshold,
        },
        "keystroke_autoencoder.pt",
    )
    print("Saved: keystroke_autoencoder.pt")

    return model, mean, std, threshold


if __name__ == "__main__":
    train()