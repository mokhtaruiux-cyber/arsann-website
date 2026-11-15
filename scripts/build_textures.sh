#!/bin/bash
# Web texture tiers from the original NASA sources (originals stay in ../scene01/textures, not shipped).
set -e; S=../scene01/textures; T=public/textures/scene01; mkdir -p $T
# global day (source 5400x2700)
cwebp -quiet -q 86 -resize 2048 1024 $S/bmng_day_apr2004_5400x2700.jpg -o $T/day_global_2048.webp
cwebp -quiet -q 88 -resize 4096 2048 $S/bmng_day_apr2004_5400x2700.jpg -o $T/day_global_4096.webp
cwebp -quiet -q 88 $S/bmng_day_apr2004_5400x2700.jpg -o $T/day_global_5400.webp
# global night (source 13500x6750)
cwebp -quiet -q 80 -resize 2048 1024 $S/blackmarble_2012_3km_13500x6750.jpg -o $T/night_global_2048.webp
cwebp -quiet -q 82 -resize 4096 2048 $S/blackmarble_2012_3km_13500x6750.jpg -o $T/night_global_4096.webp
cwebp -quiet -q 82 -resize 8192 4096 $S/blackmarble_2012_3km_13500x6750.jpg -o $T/night_global_8192.webp
# land mask (Natural Earth 4096x2048)
cwebp -quiet -lossless -z 6 -resize 2048 1024 $S/land_mask_4k.png -o $T/landmask_2048.webp
cwebp -quiet -lossless -z 6 $S/land_mask_4k.png -o $T/landmask_4096.webp
# regional day: lon 30..62E, lat 8..38N from tile C1 (lon0-90E, lat0-90N, 240 px/deg): x=lon*240, y=(90-lat)*240
cwebp -quiet -q 86 -crop 7200 12480 7680 7200 -resize 4096 3840 $S/bmng_day_C1_21600x21600.jpg -o $T/day_region_4096.webp
cwebp -quiet -q 86 -crop 7200 12480 7680 7200 -resize 2048 1920 $S/bmng_day_C1_21600x21600.jpg -o $T/day_region_2048.webp
ls -la $T
