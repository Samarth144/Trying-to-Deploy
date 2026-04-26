# PURPOSE: Computes margin distances from tumor center of mass (CoM) to the FOV edge in 6 directions.
# INPUTS:  tumor_mask (binary 3D numpy array), voxel_spacing (tuple of sx, sy, sz)
# OUTPUTS: A dictionary containing distances and voxel coordinates for each direction.
# CALLED FROM: Post-segmentation script (e.g., merge_ar_scene.py or explicitly via analysisController)

import numpy as np
from scipy.ndimage import center_of_mass
import json

def compute_6_margin_distances(tumor_mask, voxel_spacing):    
    # STEP 1 — Find the tumor Center of Mass in voxel space
    # Ensure tumor_mask is boolean or float for center_of_mass
    if np.count_nonzero(tumor_mask) == 0:
        return {} # Empty if no tumor
        
    z_com, y_com, x_com = center_of_mass(tumor_mask > 0)
    com = np.array([z_com, y_com, x_com], dtype=float)
    
    # STEP 2 — Define 6 ray directions in voxel index space
    directions = {
        'superior':  np.array([ 0,  0,  1]),   # along Z axis upward
        'inferior':  np.array([ 0,  0, -1]),   # along Z axis downward
        'anterior':  np.array([ 0,  1,  0]),   # along Y axis forward
        'posterior': np.array([ 0, -1,  0]),   # along Y axis backward
        'right':     np.array([ 1,  0,  0]),   # along X axis
        'left':      np.array([-1,  0,  0]),   # along X axis
    }
    
    dims = tumor_mask.shape
    spacing = np.array(voxel_spacing)
    results = {}
    
    # STEP 3 & 4 — For each direction, cast a ray
    for name, direction in directions.items():
        step = np.round(direction).astype(int)
        
        current_voxel = np.round(com).astype(int)
        tumor_boundary_voxel = current_voxel.copy()
        
        exited_tumor = False
        fov_boundary_voxel = None
        
        while True:
            next_voxel = current_voxel + step
            
            # Check FOV boundary
            if (next_voxel[0] < 0 or next_voxel[0] >= dims[0] or 
                next_voxel[1] < 0 or next_voxel[1] >= dims[1] or 
                next_voxel[2] < 0 or next_voxel[2] >= dims[2]):
                fov_boundary_voxel = current_voxel.copy()
                break
                
            current_voxel = next_voxel
            
            # Track exit of tumor mask
            if not exited_tumor:
                if tumor_mask[current_voxel[0], current_voxel[1], current_voxel[2]] == 0:
                    exited_tumor = True
                else:
                    tumor_boundary_voxel = current_voxel.copy()

        # Edge case: If the ray never exited the tumor
        if not exited_tumor:
            tumor_boundary_voxel = fov_boundary_voxel.copy()
            status = "margin_not_measurable"
            distance_mm = 0.0
        else:
            status = "measured"
            delta_voxels = fov_boundary_voxel - tumor_boundary_voxel
            distance_mm = np.linalg.norm(delta_voxels * spacing)
            
        results[name] = {
            "distance_mm": float(distance_mm),
            "tumor_boundary_voxel": tumor_boundary_voxel.tolist(),
            "fov_boundary_voxel": fov_boundary_voxel.tolist(),
            "status": status
        }
        
    return results

if __name__ == "__main__":
    import argparse
    import os
    import nibabel as nib
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--mask', required=True, help='Path to tumor_mask.npy')
    parser.add_argument('--mri', required=True, help='Path to original MRI .nii to extract spacing')
    parser.add_argument('--out', required=True, help='Path to output margin_distances.json')
    args = parser.parse_args()
    
    tumor_mask = np.load(args.mask)
    if os.path.exists(args.mri):
        mri_img = nib.load(args.mri)
        spacing = mri_img.header.get_zooms()[:3]
    else:
        spacing = (1.0, 1.0, 1.0)
        
    results = compute_6_margin_distances(tumor_mask, spacing)
    
    with open(args.out, 'w') as f:
        json.dump(results, f, indent=4)
        
    print(f"[SUCCESS] Margin distances computed and saved to {args.out}")
