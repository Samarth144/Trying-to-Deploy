#tumor.glb + edema.glb + brain.glb → AR GLB

import trimesh
import numpy as np
from trimesh.visual.material import PBRMaterial
from trimesh.visual import TextureVisuals
from trimesh.smoothing import filter_laplacian
import os
import sys
import json
from generate_margin_lines import generate_margin_lines

# =====================================================
# CONFIG
# =====================================================
MIN_VISIBLE_RATIO = 0.05
MAX_ALLOWED_RATIO = 0.35

def load_and_center(path):
    if not os.path.exists(path): 
        print(f"[DEBUG] File not found: {path}")
        return None
    mesh = trimesh.load(path)
    if isinstance(mesh, trimesh.Scene):
        if len(mesh.geometry) == 0: return None
        mesh = trimesh.util.concatenate(list(mesh.geometry.values()))
    mesh.apply_translation(-mesh.centroid)
    filter_laplacian(mesh, iterations=5)
    return mesh

# =====================================================
# LOAD ASSETS (FROM LOCAL DIR)
# =====================================================
tumor = load_and_center("tumor.glb")
edema = load_and_center("edema.glb")
brain_scene = trimesh.load("../AR_Assets/brain.glb", force="scene")

# =====================================================
# BRAIN BOUNDS & POSITIONING
# =====================================================
brain_bounds = np.array([g.bounds for g in brain_scene.geometry.values()])
brain_min = brain_bounds[:, 0, :].min(axis=0)
brain_max = brain_bounds[:, 1, :].max(axis=0)
brain_size = brain_max - brain_min
brain_diameter = brain_size.max()

# Load mask for precise positioning
mask_path = "tumor_mask.npy"
if os.path.exists(mask_path):
    mask = np.load(mask_path)
    voxels = np.argwhere(mask > 0)
    if len(voxels) > 0:
        center_voxel = voxels.mean(axis=0)
        relative_pos = center_voxel / np.array(mask.shape)
        target_pos = brain_min + relative_pos * brain_size
    else:
        target_pos = [0,0,0]
else:
    target_pos = [0,0,0]

# =====================================================
# SCALE & POSITION & STYLING
# =====================================================
scale_factor = 1.0
if edema:
    edema_bounds = edema.bounds
    edema_diameter = (edema_bounds[1] - edema_bounds[0]).max()
    scale_factor = (brain_diameter * 0.25) / (edema_diameter if edema_diameter > 0 else 1)
    
    edema.apply_scale(scale_factor)
    edema.apply_translation(target_pos)
    
    # Force unique material name for Edema
    edema_mat = PBRMaterial(
        name="EdemaMaterial",
        baseColorFactor=[150, 0, 255, 120],
        metallicFactor=0.1, roughnessFactor=0.9
    )
    edema.visual = TextureVisuals(material=edema_mat)

if tumor:
    tumor.apply_scale(scale_factor)
    tumor.apply_translation(target_pos)
    
    # Force unique material name for Tumor
    tumor_mat = PBRMaterial(
        name="TumorMaterial",
        baseColorFactor=[200, 0, 0, 255],
        metallicFactor=0.2, roughnessFactor=0.8
    )
    tumor.visual = TextureVisuals(material=tumor_mat)

# =====================================================
# MERGE
# =====================================================
final_scene = trimesh.Scene()
if tumor: final_scene.add_geometry(tumor, node_name="tumor_node")
if edema: final_scene.add_geometry(edema, node_name="edema_node")

for name, geom in brain_scene.geometry.items():
    # To keep original colors but still allow name detection, 
    # we make sure the material has 'brain' in its name
    if hasattr(geom.visual, 'material'):
        geom.visual.material.name = f"BrainPart_{name}"
    else:
        # Fallback if no material
        mat = PBRMaterial(name=f"BrainPart_{name}", baseColorFactor=[200,200,200,255])
        geom.visual = TextureVisuals(material=mat)
        
    final_scene.add_geometry(geom, node_name=f"brain_{name}")

    rotation = trimesh.transformations.rotation_matrix(angle=-np.pi / 2, direction=[1, 0, 0])
    
    if tumor:
        print("Generating mesh-based margin lines...")
        # Lines are generated in the native Z-up medical space
        lines, margin_data = generate_margin_lines(brain_scene, tumor, rotation)
        
        # Add to final_scene BEFORE applying rotation
        for dir_name, line_mesh in lines.items():
            final_scene.add_geometry(line_mesh, node_name=f"MarginLine_{dir_name}")
            
        with open("margin_distances.json", "w") as f:
            json.dump(margin_data, f, indent=4)

# Rotate to horizontal (applied to everything holistically including MarginLines)
final_scene.apply_transform(rotation)

# =====================================================
# EXPORT
# =====================================================
try:
    if tumor: tumor.export("tumor.glb")
    if edema: edema.export("edema.glb")
    brain_scene.export("brain.glb")
            
    final_scene.export("tumor_with_brain.glb")
    print("[SUCCESS] Precise multi-region model generated with named materials and measurement lines")
except Exception as e:
    print(f"[ERROR] Export failed: {e}")
    sys.exit(1)
