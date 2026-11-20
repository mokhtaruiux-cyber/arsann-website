# Scene 01 — Blender vs real-time visual comparison

**Reference:** Blender Cycles brand-v2 renders (muted Charcoal/Light Gold look, AgX): `public/reference/brand_p000/040/065/085/100.png` (85 and 100 are the *no-network* renders). **Candidate:** `/scene01-recon` at the same progress, 1920×1080, same GLB camera + lens shift, AgX, exposure 1, `still=1`, labels hidden. Live page: **`/scene01-visual-review`** (left Blender, right web). Screenshots: `shots/review_high_ktx2/sidebyside_p*.png`, `recon_p*.png`, `shots/crop_compare_p100.png`.

| State | Mean abs error (8-bit, avg of RGB, 480×270) | Mean luminance Blender / web | Verdict (visual) |
|---|---|---|---|
| 0 % | 3.2 | 30.7 / 31.2 | Earth on the right, negative space left, terminator, night lights, atmosphere match closely; clouds differ in pattern |
| 40 % | 7.5 | 76.3 / 79.1 | composition, terminator, limb match; **web has no border yet** (Blender already draws it) |
| 65 % | 8.1 | 107.5 / 111.2 | border position identical; web border is bolder (Charcoal under-stroke) |
| 85 % | 7.5 | 110.5 / 115.6 | very close; web slightly lighter/more contrasty |
| 100 % | 7.3 | 113.0 / 117.7 | very close |
(High tier, KTX2; low/medium tiers give 3.4/7.6/8.2/7.1/6.7 — within noise.) **These numbers are coarse (downsampled, global error). They support, but do not replace, the visual judgement; they cannot see texture detail.**

## Unavoidable / intentional differences
1. **Close-up detail:** web (regional tile) is *sharper* than Blender (global 7 km/px): `shots/crop_compare_p100.png` shows wadis and dunes the Blender frame lacks; low tier is as soft as Blender (+ visible ETC1S blocks at 1:1).
2. **Border:** Charcoal under-stroke + constant pixel width (brand-legible on sand) and a 40→65 % reveal; Blender: single thin line.
3. **City markers/labels** exist only in the web version (HTML overlay; reference has none).
4. **Clouds:** same density/scale, different pattern (both procedural); web clouds are softer/less wispy.
5. **Sun/lighting:** forced coherent sun (direction from the GLB node); Blender sun 3.2 W/m² mapped to intensity 1.0 by eye; exposure assumptions otherwise identical (AgX both, composite in linear).
6. **Ocean reflection:** implemented (Fresnel × GGX × land mask) but the glint falls outside most framed views — not verifiable from these five frames; no “plastic” look observed.
7. **Atmosphere:** same formula and colours; outer edge deliberately faded (hard polygon silhouette showed as jaggies otherwise).

## Earlier failures found during the review (all fixed, kept for the record)
grey globe (UVs pruned), upside-down Earth (flipY), wrong tone-mapping order (glow too bright), double sRGB conversion (atmosphere too blue), shader comment swallowing a line (atmosphere failed to compile), camera frozen (mixer timeScale), portrait framing too tight.

**Not approved on FPS alone:** the five states above were reviewed side by side; the decision below rests on that plus the performance measurements.
