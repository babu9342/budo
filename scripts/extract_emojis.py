"""
Emoji Sprite Sheet Background Removal & Cropping Script
Takes a 3x4 sprite sheet containing 12 emojis and extracts each into transparent PNGs.
Supports rembg (AI-based background removal) with automatic Pillow color-segmentation fallback.
"""

import os
import sys
from PIL import Image, ImageFilter
import numpy as np

# Optional rembg import
try:
    from rembg import remove as rembg_remove
    HAS_REMBG = True
except ImportError:
    HAS_REMBG = False

# 12 Emoji grid coordinates (3 rows, 4 columns)
# Coordinates in format (emoji_id, name, (x1, y1, x2, y2)) for ~427x285 sprite sheet
EMOJI_COORDINATES = [
    # Row 1
    (1,  "laugh_grin",      (14, 8, 92, 86)),
    (2,  "angry_fire",      (122, 8, 200, 86)),
    (3,  "bored_eyes",      (228, 8, 306, 86)),
    (4,  "cry_stream",      (335, 8, 420, 88)),
    # Row 2
    (5,  "nervous_teeth",   (14, 102, 92, 182)),
    (6,  "sweat_wipe",      (122, 100, 202, 182)),
    (7,  "yawn_sleep",      (230, 102, 308, 182)),
    (8,  "wink_tongue",     (338, 102, 418, 182)),
    # Row 3
    (9,  "dice_turban",     (14, 192, 96, 278)),
    (10, "dice_sunglasses", (124, 198, 202, 276)),
    (11, "dice_heart_eyes", (230, 198, 308, 276)),
    (12, "dice_cry_puddle", (336, 194, 418, 280)),
]

def extract_and_remove_bg(sheet_path, output_dir="client/public/emojis", target_size=256):
    os.makedirs(output_dir, exist_ok=True)
    
    if not os.path.exists(sheet_path):
        print(f"Error: Input sprite sheet not found at {sheet_path}")
        return

    sheet = Image.open(sheet_path).convert("RGBA")
    print(f"Loaded sprite sheet: {sheet.size[0]}x{sheet.size[1]} | rembg available: {HAS_REMBG}")

    for idx, name, (x1, y1, x2, y2) in EMOJI_COORDINATES:
        crop = sheet.crop((x1, y1, x2, y2))
        
        if HAS_REMBG:
            # AI Background Removal via rembg
            result = rembg_remove(crop)
        else:
            # Precision color-segmentation fallback (cuts blue rays, cream tiles, shadows)
            arr = np.array(crop)
            r, g, b = arr[:, :, 0].astype(int), arr[:, :, 1].astype(int), arr[:, :, 2].astype(int)
            
            is_blue_bg = (b > r + 25) & (b > 85) & (g < 160)
            is_cream_bg = (r > 200) & (g > 175) & (b > 140) & (abs(r - g) < 40) & (r - b < 75)
            is_shadow_bg = (r > 130) & (r < 200) & (g > 110) & (g < 180) & (b > 95) & (b < 165) & (abs(r - g) < 30)
            
            fg_mask = ~(is_blue_bg | is_cream_bg | is_shadow_bg)
            
            # Smooth mask edges
            mask_img = Image.fromarray((fg_mask * 255).astype(np.uint8), mode='L')
            mask_blurred = mask_img.filter(ImageFilter.GaussianBlur(radius=0.4))
            
            result = crop.copy()
            result.putalpha(mask_blurred)

        # Auto-crop transparent boundaries
        bbox = result.getbbox()
        if bbox:
            result = result.crop(bbox)

        # Center inside consistent square canvas (256x256)
        pad = 16
        inner_size = target_size - pad * 2
        w, h = result.size
        scale = min(inner_size / w, inner_size / h)
        new_w, new_h = int(w * scale), int(h * scale)
        
        resized = result.resize((new_w, new_h), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        paste_x = (target_size - new_w) // 2
        paste_y = (target_size - new_h) // 2
        canvas.paste(resized, (paste_x, paste_y), resized)

        # Save transparent PNG
        out_path_hyphen = os.path.join(output_dir, f"emoji-{idx}.png")
        out_path_under = os.path.join(output_dir, f"emoji_{idx}.png")
        canvas.save(out_path_hyphen, "PNG")
        canvas.save(out_path_under, "PNG")
        print(f"[{idx}/12] Extracted {name} -> {out_path_hyphen} ({target_size}x{target_size})")

    print("\nExtraction complete! All 12 transparent emoji assets generated successfully.")

if __name__ == "__main__":
    default_sheet = r"C:\Users\BABU M\.gemini\antigravity-ide\brain\952a2cd4-11bd-4000-8fff-1d30a680e63b\.user_uploaded\media_1790348171013.png"
    input_path = sys.argv[1] if len(sys.argv) > 1 else default_sheet
    extract_and_remove_bg(input_path)
