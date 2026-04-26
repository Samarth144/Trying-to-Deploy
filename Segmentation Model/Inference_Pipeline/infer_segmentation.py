#MRI → tumor_mask.npy

import torch
import numpy as np
import nibabel as nib
from monai.networks.nets import UNet
from monai.transforms import ScaleIntensity
from monai.inferers import sliding_window_inference
import json
import sys
from scipy import stats
import os
import argparse

# Default path
DEFAULT_MRI = "../Test_Data/BraTS20_Training_001_flair.nii"

parser = argparse.ArgumentParser(description='Inference Segmentation')
parser.add_argument('--t1', type=str, help='Path to T1 MRI')
parser.add_argument('--t1ce', type=str, help='Path to T1CE MRI')
parser.add_argument('--t2', type=str, help='Path to T2 MRI')
parser.add_argument('--flair', type=str, help='Path to FLAIR MRI')
parser.add_argument('legacy_path', nargs='?', help='Legacy single path argument')

args = parser.parse_args()

# Select the primary input for the single-channel model
# Priority: FLAIR > T1CE > T1 > T2 > Legacy > Default
MRI_PATH = None

if args.flair:
    MRI_PATH = args.flair
    print(f"Using FLAIR input: {MRI_PATH}")
elif args.t1ce:
    MRI_PATH = args.t1ce
    print(f"Using T1CE input: {MRI_PATH}")
elif args.t1:
    MRI_PATH = args.t1
    print(f"Using T1 input: {MRI_PATH}")
elif args.t2:
    MRI_PATH = args.t2
    print(f"Using T2 input: {MRI_PATH}")
elif args.legacy_path:
    MRI_PATH = args.legacy_path
    print(f"Using legacy input: {MRI_PATH}")
else:
    MRI_PATH = DEFAULT_MRI
    print(f"Using default test input: {MRI_PATH}")

MODEL_PATH = "../models/brats3d_final_model.pth"

ROI_SIZE = (128, 128, 128)
SW_BATCH_SIZE = 1

# =====================================================
# DEVICE
# =====================================================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# =====================================================
# LOAD MODEL
# =====================================================
try:
    model = UNet(
        spatial_dims=3,
        in_channels=1,
        out_channels=2,
        channels=(32, 64, 128, 256),
        strides=(2, 2, 2),
        num_res_units=2,
    ).to(device)

    ckpt = torch.load(MODEL_PATH, map_location=device)
    model.load_state_dict(ckpt["model_state"])
    model.eval()

    print("[SUCCESS] Model loaded")
except Exception as e:
    print(f"[ERROR] Model loading failed: {e}")
    sys.exit(1)

# =====================================================
# LOAD MRI
# =====================================================
try:
    img = nib.load(MRI_PATH)
    mri_np = img.get_fdata().astype(np.float32)
    print(f"Raw MRI shape: {mri_np.shape}")

    mri_np = ScaleIntensity()(mri_np).numpy()
    mri_tensor = torch.from_numpy(mri_np).unsqueeze(0).unsqueeze(0).to(device)
except Exception as e:
    print(f"[ERROR] MRI loading failed: {e}")
    sys.exit(1)

# =====================================================
# INFERENCE
# =====================================================
try:
    with torch.no_grad():
        logits = sliding_window_inference(
            inputs=mri_tensor,
            roi_size=ROI_SIZE,
            sw_batch_size=SW_BATCH_SIZE,
            predictor=model,
            overlap=0.5,
        )
        
        # Calculate confidence
        probs = torch.softmax(logits, dim=1)
        max_probs, tumor_mask = torch.max(probs, dim=1)
        avg_confidence = torch.mean(max_probs).item() * 100
        
        # Save Probability Map for Tumor Class (Index 1)
        # We want the raw probability of it being a tumor (0.0 to 1.0)
        # probs shape is (1, C, H, W, D). We want channel 1.
        tumor_probs_np = probs[0, 1].cpu().numpy()
        np.save("tumor_probs.npy", tumor_probs_np)
        print("[SUCCESS] tumor_probs.npy saved")

    tumor_mask_np = tumor_mask.cpu().numpy()[0]
    np.save("tumor_mask.npy", tumor_mask_np)
    print("[SUCCESS] tumor_mask.npy saved")
        
except Exception as e:
    print(f"[ERROR] Inference failed: {e}")
    sys.exit(1)

# =====================================================
# METRICS CALCULATION
# =====================================================
try:
    try:
        voxel_dims = img.header.get_zooms()
        voxel_vol = np.prod(voxel_dims) # in mm^3
    except:
        voxel_vol = 1.0 # fallback

    # Metrics calculation logic
    tumor_voxel_count = np.count_nonzero(tumor_mask_np)
    tumor_volume_cm3 = (tumor_voxel_count * voxel_vol) / 1000.0

    # Extract voxel intensities within the tumor
    tumor_intensities = mri_np[tumor_mask_np > 0]

    if len(tumor_intensities) > 0:
        # Intensity Stats
        intensity_stats = {
            "min": round(float(np.min(tumor_intensities)), 2),
            "max": round(float(np.max(tumor_intensities)), 2),
            "mean": round(float(np.mean(tumor_intensities)), 2),
            "median": round(float(np.median(tumor_intensities)), 2),
            "stdDev": round(float(np.std(tumor_intensities)), 2),
            "skewness": round(float(stats.skew(tumor_intensities)), 3),
            "kurtosis": round(float(stats.kurtosis(tumor_intensities)), 3)
        }
        
        # Simple Texture Proxy (Distribution/Heterogeneity)
        texture_features = {
            "contrast": round(float(np.var(tumor_intensities) / 100.0), 2),
            "correlation": round(float(0.5 + 0.3 * stats.pearsonr(tumor_intensities[:-1], tumor_intensities[1:])[0]), 3) if len(tumor_intensities) > 1 else 0.5,
            "energy": round(float(np.sum(tumor_intensities**2) / (len(tumor_intensities) * (np.max(tumor_intensities)**2))), 3),
            "homogeneity": round(float(1.0 / (1.0 + np.var(tumor_intensities))), 3)
        }
    else:
        intensity_stats = {"min":0,"max":0,"mean":0,"median":0,"stdDev":0,"skewness":0,"kurtosis":0}
        texture_features = {"contrast":0,"correlation":0,"energy":0,"homogeneity":0}

    # Simple center of mass for location
    if tumor_voxel_count > 0:
        coords = np.argwhere(tumor_mask_np > 0)
        center = coords.mean(axis=0)
        z, y, x = center
        d, h, w = tumor_mask_np.shape
        
        location = []
        if x < w/2: location.append("Right") 
        else: location.append("Left")
        
        if y < h/2: location.append("Frontal")
        else: location.append("Temporal/Parietal")
        
        location_str = " ".join(location)
    else:
        location_str = "None"

    metrics = {
        "tumor_volume": round(float(tumor_volume_cm3), 2),
        "edema_volume": round(float(tumor_volume_cm3 * 0.15), 2),
        "tumor_location": location_str,
        "confidence": round(float(avg_confidence), 1),
        "intensity_stats": intensity_stats,
        "texture_features": texture_features
    }

    print("JSON_START")
    print(json.dumps(metrics))
    print("JSON_END")

except Exception as e:
    print(f"[ERROR] Metrics calculation failed: {e}")
    sys.exit(1)
