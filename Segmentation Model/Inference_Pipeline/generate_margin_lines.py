import trimesh
import numpy as np
import json
import os

def generate_margin_lines(brain_mesh, tumor_mesh, rotation=None):
    """
    Computes distances from tumor to brain surface using ray-intersects.
    Generates dashed line geometry and returns line meshes + margin_data.
    """
    # Isolate meshes if they are scenes
    if isinstance(brain_mesh, trimesh.Scene):
        geoms = list(brain_mesh.geometry.values())
        brain_mesh = trimesh.util.concatenate(geoms) if geoms else None
    if isinstance(tumor_mesh, trimesh.Scene):
        geoms = list(tumor_mesh.geometry.values())
        tumor_mesh = trimesh.util.concatenate(geoms) if geoms else None
        
    if not brain_mesh or not tumor_mesh:
        return {}, {}
        
    # Scale determination (metres vs mm)
    bounds_size = np.max(brain_mesh.bounds[1] - brain_mesh.bounds[0])
    is_mm = bounds_size > 10.0 # e.g. 150mm vs 0.15m
    scale_mult = 1.0 if is_mm else 1000.0

    print(f"[MarginLines] brain bounds_size={bounds_size:.4f}, is_mm={is_mm}")

    # Step 1 - Find the 6 Extreme Points on the Brain Mesh (Skull proxy)
    # Using original Z-up medical space: Z = Superior/Inferior, Y = Anterior/Posterior, X = Right/Left
    vertices = brain_mesh.vertices
    skull_points = {
        'superior':  vertices[np.argmax(vertices[:, 2])],
        'inferior':  vertices[np.argmin(vertices[:, 2])],
        'anterior':  vertices[np.argmax(vertices[:, 1])],
        'posterior': vertices[np.argmin(vertices[:, 1])],
        'right':     vertices[np.argmax(vertices[:, 0])],
        'left':      vertices[np.argmin(vertices[:, 0])]
    }

    line_meshes = {}
    margin_data = {}

    # Step 2 - Calculate lines from fixed skull points to the tumor
    for name, p_skull_surface in skull_points.items():
        # Find the geometrically closest point on the tumor surface to this skull extreme
        closest_pts, _, _ = trimesh.proximity.closest_point(tumor_mesh, [p_skull_surface])
        if len(closest_pts) == 0:
            margin_data[name] = {"status": "not_measurable"}
            continue

        p_tumor_surface = closest_pts[0]

        segment = p_skull_surface - p_tumor_surface
        length = np.linalg.norm(segment)
        if length == 0:
            margin_data[name] = {"status": "not_measurable"}
            continue

        unit_vec = segment / length
        distance_mm = length * scale_mult

        # ── CLINICAL COLOR SYSTEM ────────────────────────────────────────────
        # Line body: cool clinical off-white, semi-transparent (NOT priority coded)
        rgba_body     = [190, 205, 218, 140]
        # Tumor endpoint: same muted gray-white
        rgba_tumor_ep = [180, 195, 210, 130]
        # Skull endpoint + tick mark: deep muted priority color
        if distance_mm < 10:
            rgba_skull_ep = [185,  45,  45, 240]   # deep muted red
        elif distance_mm < 25:
            rgba_skull_ep = [185, 140,  25, 240]   # deep muted amber
        else:
            rgba_skull_ep = [ 28, 168, 130, 240]   # deep muted teal

        # ── GEOMETRY PARAMETERS (scale-aware) ────────────────────────────────
        dash_r     = 0.18 if is_mm else 0.00018  # hairline dash
        dash_l     = 5.0  if is_mm else 0.005
        gap_l      = 3.0  if is_mm else 0.003
        tumor_ep_r = 0.45 if is_mm else 0.00045  # tiny muted tumor endpoint
        skull_ep_r = 0.85 if is_mm else 0.00085  # small crisp skull endpoint
        tick_r     = 0.12 if is_mm else 0.00012  # hairline tick mark
        tick_l     = 6.0  if is_mm else 0.006    # tick length

        geom_list = []

        # ── DASHED LINE BODY ─────────────────────────────────────────────────
        n_dashes = max(1, int(length / (dash_l + gap_l)))
        for i in range(n_dashes):
            seg_start = p_tumor_surface + unit_vec * (i * (dash_l + gap_l))
            seg_end   = seg_start + unit_vec * dash_l
            if np.linalg.norm(seg_end - p_tumor_surface) > length:
                seg_end = p_skull_surface
            cyl = trimesh.creation.cylinder(radius=dash_r, segment=[seg_start, seg_end])
            cyl.visual.face_colors = np.tile(rgba_body, (len(cyl.faces), 1))
            geom_list.append(cyl)
        # ── TUMOR-SIDE ENDPOINT: small muted gray sphere ─────────────────────
        ep_tumor = trimesh.creation.uv_sphere(radius=tumor_ep_r, count=[8, 8])
        ep_tumor.apply_translation(p_tumor_surface)
        ep_tumor.visual.face_colors = np.tile(rgba_tumor_ep, (len(ep_tumor.faces), 1))
        geom_list.append(ep_tumor)

        # ── SKULL-SIDE ENDPOINT: priority-colored sphere ──────────────────────
        ep_skull = trimesh.creation.uv_sphere(radius=skull_ep_r, count=[8, 8])
        ep_skull.apply_translation(p_skull_surface)
        ep_skull.visual.face_colors = np.tile(rgba_skull_ep, (len(ep_skull.faces), 1))
        geom_list.append(ep_skull)

        # ── TICK MARK: perpendicular cross (+) at skull surface ───────────────
        arbitrary = np.array([1, 0, 0]) if abs(unit_vec[0]) < 0.9 else np.array([0, 1, 0])
        perp1 = np.cross(unit_vec, arbitrary);  perp1 /= np.linalg.norm(perp1)
        perp2 = np.cross(unit_vec, perp1);      perp2 /= np.linalg.norm(perp2)
        for perp in [perp1, perp2]:
            t_start = p_skull_surface - perp * (tick_l / 2)
            t_end   = p_skull_surface + perp * (tick_l / 2)
            tick_cyl = trimesh.creation.cylinder(radius=tick_r, segment=[t_start, t_end])
            tick_cyl.visual.face_colors = np.tile(rgba_skull_ep, (len(tick_cyl.faces), 1))
            geom_list.append(tick_cyl)

        line_mesh = trimesh.util.concatenate(geom_list)
        line_meshes[name] = line_mesh
        
        midpoint = (p_tumor_surface + p_skull_surface) / 2.0
        
        # Apply transformation safely to isolated coordinates for passing back out to WebGL JSON wrapper
        j_tumor = trimesh.transformations.transform_points([p_tumor_surface], rotation)[0] if rotation is not None else p_tumor_surface
        j_skull = trimesh.transformations.transform_points([p_skull_surface], rotation)[0] if rotation is not None else p_skull_surface
        j_mid   = trimesh.transformations.transform_points([midpoint], rotation)[0] if rotation is not None else midpoint
        j_norm  = trimesh.transformations.transform_points([unit_vec], rotation)[0] if rotation is not None else unit_vec
        
        margin_data[name] = {
            "distance_mm": round(float(distance_mm), 1),
            "p_tumor_surface": j_tumor.tolist(),
            "p_skull_surface": j_skull.tolist(),
            "midpoint_glb": j_mid.tolist(),
            "direction_normal": j_norm.tolist(),
            "priority": "critical" if distance_mm < 10 else ("caution" if distance_mm < 25 else "safe"),
            "status": "ok"
        }
    
    return line_meshes, margin_data
    
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--brain', required=True)
    parser.add_argument('--tumor', required=True)
    args = parser.parse_args()
    b = trimesh.load(args.brain)
    t = trimesh.load(args.tumor)
    lines, data = generate_margin_lines(b, t)
    with open('margin_distances.json', 'w') as f:
        json.dump(data, f)
    s = trimesh.Scene([b, t])
    for dir, line in lines.items():
        s.add_geometry(line, node_name=f"MarginLine_{dir}")
    s.export('test.glb')
