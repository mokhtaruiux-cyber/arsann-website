"""CANONICAL baseline GLB export (animation mode SCENE over the scene frame range; export A used ACTIONS and was truncated to 41.7% by the 100->240 time remap)
Baseline GLB export of Scene 01 from the WORKING COPY (export/scene01_export_copy.blend). No artistic changes, no baking, no material replacement.
Run: blender -b export/scene01_export_copy.blend -P scripts/export_glb.py"""
import bpy, os, sys, time
OUT = "<repo>/public/models/scene01/scene01_origin.glb"
sc = bpy.data.scenes["SCENE01_ORIGIN"]; bpy.context.window.scene = sc if bpy.context.window else None
bpy.context.window_manager  # noqa
sc.frame_set(0)
t = time.time()
FULL = os.environ.get("SCENE_FRAME_RANGE", "1") == "1"
if not FULL: OUT = OUT.replace("public/models/scene01/scene01_origin.glb", "export/scene01_exportA.glb")
r = bpy.ops.export_scene.gltf(filepath=OUT, export_frame_range=FULL, export_format="GLB", export_cameras=True, export_lights=True, export_animations=True, export_extras=True, use_visible=False,
        export_apply=False, export_force_sampling=True, export_animation_mode=os.environ.get("ANIM_MODE", "SCENE"), export_yup=True, export_texcoords=True, export_normals=True, export_materials="EXPORT", export_image_format="AUTO")
print("EXPORT_RESULT", r, round(time.time() - t, 1), "s", os.path.getsize(OUT) if os.path.exists(OUT) else "NO FILE")
