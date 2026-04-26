# PURPOSE: Generates 3D arrow meshes representing margin distances and merges them into the main AR model.
# INPUTS:  margin_distances.json, original tumor_with_brain.glb, coordinate transform variables
# OUTPUTS: A modified tumor_with_brain.glb containing the distance arrows with appropriate color-coded hotspots.
# CALLED FROM: Scene assembly script (e.g., merge_ar_scene.py)

import trimesh
from trimesh.visual.material import PBRMaterial
import numpy as np
import json
import os

def generate_arrow_meshes(margin_data, glb_scale, glb_translation, volume_shape):
    arrows_scene = trimesh.Scene()
    volume_center = np.array(volume_shape) / 2.0
    
    for direction, data in margin_data.items():
        if data.get('status') == 'margin_not_measurable':
            continue
            
        distance_mm = data['distance_mm']
        tumor_voxel = np.array(data['tumor_boundary_voxel'])
        fov_voxel = np.array(data['fov_boundary_voxel'])
        
        # STEP 1 — Convert voxel coordinates → GLB world coordinates
        tumor_glb = (tumor_voxel - volume_center) * glb_scale + glb_translation
        fov_glb = (fov_voxel - volume_center) * glb_scale + glb_translation
        
        # Determine color based on threshold
        if distance_mm < 10:
            color = [255, 60, 60, 255] # CRITICAL
        elif distance_mm < 25:
            color = [255, 180, 40, 255] # CAUTION
        else:
            color = [30, 200, 160, 255] # SAFE
            
        # Arrow direction vector
        vec = fov_glb - tumor_glb
        dist = np.linalg.norm(vec)
        if dist == 0:
            continue
        
        dir_unit = vec / dist
        
        # Cylinder starts from tumor_glb, cone ends at fov_glb
        # Wait, the prompt says "height = distance between the two GLB points"
        # trimesh.creation.cylinder is centered by default. We need to center it at the midpoint.
        midpoint = (tumor_glb + fov_glb) / 2.0
        
        # STEP 2 — Build the arrow shaft (cylinder)
        shaft = trimesh.creation.cylinder(radius=0.003, height=dist)
        
        # Apply transformation
        rot_matrix = trimesh.geometry.align_vectors([0, 0, 1], dir_unit)
        transform = np.eye(4)
        transform[:3, :3] = rot_matrix[:3, :3]
        transform[:3, 3] = midpoint
        shaft.apply_transform(transform)
        
        # STEP 3 — Build the arrowhead (cone)
        cone = trimesh.creation.cone(radius=0.008, height=0.02)
        # Position cone at the tip
        cone_transform = np.eye(4)
        cone_transform[:3, :3] = rot_matrix[:3, :3]
        # Translate cone base to the end of the shaft (fov_glb points to tip)
        cone_transform[:3, 3] = fov_glb - (dir_unit * 0.01) # Offset slightly so tip touches the fov_glb precisely
        cone.apply_transform(cone_transform)
        
        # STEP 4 — Assign material and colors
        # Ensure we set face colors
        shaft.visual.face_colors = color
        cone.visual.face_colors = color
        
        # Name the material via PBR to guarantee detection by model-viewer
        mat = PBRMaterial(name=f"DistanceArrow_{direction}", baseColorFactor=color)
        shaft.visual.material = mat
        cone.visual.material = mat
        
        # STEP 5 & 6 — Combine meshes and node naming
        arrows_scene.add_geometry(shaft, node_name=f"shaft_{direction}")
        arrows_scene.add_geometry(cone, node_name=f"cone_{direction}")

    return arrows_scene

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--margins', required=True, help='Path to margin_distances.json')
    parser.add_argument('--model', required=True, help='Path to tumor_with_brain.glb to overwrite')
    # Required parameters for explicit CLI testing
    parser.add_argument('--scale', type=float, default=1.0)
    parser.add_argument('--shape', type=int, nargs=3, default=[128,128,128])
    # Translation args typically passed as well, default [0,0,0]
    parser.add_argument('--tx', type=float, default=0.0)
    parser.add_argument('--ty', type=float, default=0.0)
    parser.add_argument('--tz', type=float, default=0.0)
    args = parser.parse_args()

    if not os.path.exists(args.margins) or not os.path.exists(args.model):
        print(f"Skipping arrows, required files missing.")
        import sys; sys.exit(0)

    with open(args.margins, 'r') as f:
        margin_data = json.load(f)
        
    translation = np.array([args.tx, args.ty, args.tz])
    
    arrows_scene = generate_arrow_meshes(margin_data, args.scale, translation, args.shape)
    
    main_model = trimesh.load(args.model)
    merged_scene = trimesh.Scene([main_model, arrows_scene])
    
    # Export to temp.glb then replace to avoid corruption
    temp_path = "temp_with_arrows.glb"
    merged_scene.export(temp_path)
    os.replace(temp_path, args.model)
    
    print(f"[SUCCESS] Merged distance arrows into {args.model}")
