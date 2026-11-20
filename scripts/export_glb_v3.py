"""Scene 01 v3 export for the website: camera rig + Earth shells + sun ONLY.
Arcs, node dots, labels and clouds are rebuilt live in the browser (animated shaders), so they are removed from this export copy.
Run: blender -b ../scenes/scene-01-the-origin/scene01_origin_v3.blend -P scripts/export_glb_v3.py   (never saves the .blend)"""
import bpy, json, os
OUT = "<repo>/export/v3/scene01_origin_v3.glb"; CAMJSON = "<repo>/public/data/camera_path_v3.json"
sc = bpy.data.scenes["SCENE01_ORIGIN"]
for o in list(bpy.data.objects):
    if o.name.startswith(("LINK_", "NODE_", "LABEL_", "CLOUD_LAYER_", "SAUDI_BORDER")): bpy.data.objects.remove(o, do_unlink=True)
cam = bpy.data.objects["CAM_SCENE01"]; tgt = bpy.data.objects["CAM_TARGET"]; cd = cam.data; sun = bpy.data.objects["SUN"]
d = sun.rotation_euler.to_matrix() @ __import__("mathutils").Vector((0, 0, 1)); keys = []
for p in range(0, 101):
    sc.frame_set(round(p/100*sc.frame_end)); bpy.context.view_layer.update()
    c = cam.matrix_world.translation; t = tgt.matrix_world.translation
    keys.append({"p": p, "cam": [c.x, c.y, c.z], "target": [t.x, t.y, t.z], "shift_x": cd.shift_x})
json.dump({"units": "1 BU = 1000 km; Blender Z-up", "lens_mm": cd.lens, "sensor_mm": cd.sensor_width, "sun_dir": [d.x, d.y, d.z], "earth_radius": 6.371, "keys": keys}, open(CAMJSON, "w"))
sc.frame_set(0)
r = bpy.ops.export_scene.gltf(filepath=OUT, export_frame_range=True, export_format="GLB", export_cameras=True, export_lights=True, export_animations=True, export_extras=True, use_visible=False,
    export_apply=False, export_force_sampling=True, export_animation_mode="SCENE", export_yup=True, export_texcoords=True, export_normals=True, export_materials="EXPORT", export_image_format="AUTO")
print("EXPORT_RESULT", r, os.path.getsize(OUT), "shift end", keys[-1]["shift_x"])
