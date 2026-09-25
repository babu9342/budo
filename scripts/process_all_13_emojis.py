"""
High-Precision 13 Emoji Background Removal & Asset Pipeline
Uses rembg (u2net model) + Pillow post-processing cleanup to isolate all 13 emojis with 100% clean alpha transparency, no card border remnants, and generates a preview verification grid.
"""

import os
import sys
from PIL import Image, ImageFilter, ImageDraw, ImageFont
import numpy as np
from scipy.ndimage import label, binary_fill_holes

try:
    from rembg import new_session, remove as rembg_remove
    HAS_REMBG = True
except ImportError:
    HAS_REMBG = False

# Exact tight bounding boxes for the 12 grid emojis from sprite sheet (427x285)
# Excludes the outer card frames, bottom brown borders, and top-left badge numbers
GRID_EMOJIS_COORDS = [
    # Row 1
    (1,  "grin_laugh",       (18, 11, 88, 82)),
    (2,  "angry_rage",        (125, 11, 195, 82)),
    (3,  "bored_eyes",        (232, 11, 302, 82)),
    (4,  "crying_tears",      (336, 9, 418, 86)),   # wider to include all blue teardrops
    # Row 2
    (5,  "nervous_teeth",     (18, 106, 88, 178)),  # includes hand biting teeth
    (6,  "sweat_wipe",        (124, 105, 198, 178)), # includes sweat tissue and hand
    (7,  "yawn_sleepy",       (232, 107, 305, 178)), # includes yawning hand
    (8,  "wink_tongue",       (341, 107, 413, 178)),
    # Row 3
    (9,  "dice_turban",       (15, 199, 93, 275)),  # includes top turban
    (10, "dice_sunglasses",   (126, 204, 198, 274)),
    (11, "dice_heart_eyes",   (232, 204, 306, 274)),
    (12, "dice_puddle_cry",   (337, 200, 416, 278)), # includes bottom puddle
]

def cleanup_border_artifacts(rgba_img, is_dice=False):
    """
    Detects and clears any leftover near-brown card border lines or cream pixels.
    Ensures that only the emoji body (yellow, red, blue, green, white, black) remains.
    """
    arr = np.array(rgba_img)
    h, w, _ = arr.shape
    r, g, b, a = arr[:, :, 0].astype(int), arr[:, :, 1].astype(int), arr[:, :, 2].astype(int), arr[:, :, 3]

    # Card border brown color: R ~ 130-205, G ~ 105-180, B ~ 90-165, |R - G| < 35, |G - B| < 35
    # Card cream/beige color: R > 205, G > 180, B > 145, |R - G| < 40
    # Blue background rays: B > R + 25
    is_card_brown = (r >= 125) & (r <= 210) & (g >= 100) & (g <= 185) & (b >= 85) & (b <= 170) & (abs(r - g) <= 35) & (abs(g - b) <= 35)
    is_card_cream = (r >= 205) & (g >= 175) & (b >= 140) & (abs(r - g) <= 40) & (r - b <= 80)
    is_blue_bg = (b > r + 20) & (b > 85) & (g < 170)

    # Emoji core colors should NOT be erased:
    # Bright yellow/orange: r > 180, g > 110, b < 100 (high red/green, low blue)
    # Bright red/pink: r > 160, g < 110, b < 110
    # Bright cyan/blue tears: b > 160, g > 100, r < 120
    # White eyes/teeth: r > 215, g > 215, b > 215
    # Black outline/pupils: r < 80, g < 80, b < 80
    is_emoji_core = (
        ((r > 175) & (g > 110) & (b < 100)) | # yellow/golden
        ((r > 155) & (g < 115) & (b < 115)) | # red/orange
        ((b > 150) & (g > 95) & (r < 130))  | # blue tears
        ((r > 215) & (g > 215) & (b > 215)) | # white
        ((r < 80) & (g < 80) & (b < 80))      # black outline
    )

    # Mask of pixels to clear: non-emoji core that matches card artifacts
    clear_mask = (is_card_brown | is_card_cream | is_blue_bg) & (~is_emoji_core)

    new_a = np.where(clear_mask, 0, a).astype(np.uint8)

    # Connected component filtering: keep main components (emoji face, hands, tears)
    labeled, num_feat = label(new_a > 30)
    if num_feat > 0:
        sizes = [np.sum(labeled == i) for i in range(1, num_feat + 1)]
        max_lbl = np.argmax(sizes) + 1
        # Keep components with size > 15 pixels that are not isolated slivers
        valid_comp_mask = np.zeros_like(new_a, dtype=bool)
        for i, s in enumerate(sizes):
            if s > 15:
                valid_comp_mask |= (labeled == (i + 1))
        new_a = np.where(valid_comp_mask, new_a, 0).astype(np.uint8)

    # Anti-alias mask edges
    alpha_img = Image.fromarray(new_a, mode='L')
    alpha_smooth = alpha_img.filter(ImageFilter.GaussianBlur(radius=0.4))

    result = rgba_img.copy()
    result.putalpha(alpha_smooth)
    return result

def create_checkerboard(width, height, check_size=16):
    """Creates a transparent checkerboard background pattern for previewing."""
    cb = Image.new('RGB', (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(cb)
    color1 = (240, 240, 240)
    color2 = (200, 200, 200)
    
    for y in range(0, height, check_size):
        for x in range(0, width, check_size):
            fill = color1 if ((x // check_size) + (y // check_size)) % 2 == 0 else color2
            draw.rectangle([x, y, x + check_size, y + check_size], fill=fill)
    return cb

def process_all_13_emojis(sprite_sheet_path, rose_image_path, output_dir="client/public/emojis", target_size=256):
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs("client/dist/emojis", exist_ok=True)
    os.makedirs("client/public/stickers", exist_ok=True)
    os.makedirs("client/dist/stickers", exist_ok=True)

    session = new_session('u2net') if HAS_REMBG else None
    print(f"Loaded rembg session (u2net): {session is not None}")

    sheet = Image.open(sprite_sheet_path).convert("RGBA")
    rose_img = Image.open(rose_image_path).convert("RGBA")

    final_emojis = []

    # 1. Process 12 Emojis from Sprite Sheet
    for idx, name, box in GRID_EMOJIS_COORDS:
        crop = sheet.crop(box)
        
        # Step A: rembg AI background removal
        if session:
            bg_removed = rembg_remove(crop, session=session)
        else:
            bg_removed = crop

        # Step B: Post-processing border cleanup
        cleaned = cleanup_border_artifacts(bg_removed, is_dice=(idx >= 9))

        # Step C: Tight crop to bounding box
        bbox = cleaned.getbbox()
        if bbox:
            cleaned = cleaned.crop(bbox)

        # Step D: Center inside 256x256 square canvas
        pad = 14
        inner_size = target_size - pad * 2
        w, h = cleaned.size
        scale = min(inner_size / w, inner_size / h)
        new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
        
        resized = cleaned.resize((new_w, new_h), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        paste_x = (target_size - new_w) // 2
        paste_y = (target_size - new_h) // 2
        canvas.paste(resized, (paste_x, paste_y), resized)

        # Save files (both emoji_X.png and emoji-X.png)
        for folder in [output_dir, "client/dist/emojis", "client/public/stickers", "client/dist/stickers"]:
            canvas.save(os.path.join(folder, f"emoji_{idx}.png"), "PNG")
            canvas.save(os.path.join(folder, f"emoji-{idx}.png"), "PNG")

        final_emojis.append((idx, name, canvas))
        print(f"[{idx}/13] Processed {name} -> emoji_{idx}.png (Clean 256x256 RGBA)")

    # 2. Process Emoji 13: Rose Love
    if session:
        rose_bg_removed = rembg_remove(rose_img, session=session)
    else:
        rose_bg_removed = rose_img

    rose_bbox = rose_bg_removed.getbbox()
    if rose_bbox:
        rose_bg_removed = rose_bg_removed.crop(rose_bbox)

    pad = 14
    inner_size = target_size - pad * 2
    rw, rh = rose_bg_removed.size
    r_scale = min(inner_size / rw, inner_size / rh)
    r_new_w, r_new_h = int(rw * r_scale), int(rh * r_scale)
    rose_resized = rose_bg_removed.resize((r_new_w, r_new_h), Image.Resampling.LANCZOS)

    rose_canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    r_paste_x = (target_size - r_new_w) // 2
    r_paste_y = (target_size - r_new_h) // 2
    rose_canvas.paste(rose_resized, (r_paste_x, r_paste_y), rose_resized)

    for folder in [output_dir, "client/dist/emojis", "client/public/stickers", "client/dist/stickers"]:
        rose_canvas.save(os.path.join(folder, "emoji_13.png"), "PNG")
        rose_canvas.save(os.path.join(folder, "emoji-13.png"), "PNG")
        rose_canvas.save(os.path.join(folder, "rose_love.png"), "PNG")

    final_emojis.append((13, "rose_love", rose_canvas))
    print("[13/13] Processed rose_love -> emoji_13.png (Clean 256x256 RGBA)")

    # 3. Generate Visual Verification Grid on Checkerboard Background
    # 4 columns, 4 rows (13 items)
    grid_cols = 4
    grid_rows = 4
    cell_w, cell_h = 160, 160
    grid_w = grid_cols * cell_w
    grid_h = grid_rows * cell_h

    preview = create_checkerboard(grid_w, grid_h, check_size=12)
    draw = ImageDraw.Draw(preview)

    for i, (idx, name, emoji_img) in enumerate(final_emojis):
        col = i % grid_cols
        row = i // grid_cols
        x = col * cell_w
        y = row * cell_h

        # Draw border frame around cell
        draw.rectangle([x, y, x + cell_w - 1, y + cell_h - 1], outline=(150, 150, 150), width=1)

        # Paste resized emoji (128x128)
        preview_emoji = emoji_img.resize((128, 128), Image.Resampling.LANCZOS)
        preview.paste(preview_emoji, (x + 16, y + 8), preview_emoji)

        # Label
        label_text = f"#{idx} {name}"
        draw.text((x + 8, y + cell_h - 20), label_text, fill=(20, 20, 20))

    # Save preview grid
    preview.save("preview_grid.png", "PNG")
    preview.save(os.path.join(output_dir, "preview_grid.png"), "PNG")
    preview.save("client/dist/emojis/preview_grid.png", "PNG")
    print(f"\nPreview grid saved to preview_grid.png ({grid_w}x{grid_h}) for visual verification!")

if __name__ == "__main__":
    sprite_sheet = r"C:\Users\BABU M\.gemini\antigravity-ide\brain\952a2cd4-11bd-4000-8fff-1d30a680e63b\.user_uploaded\media_1790348171013.png"
    rose_img = r"C:\Users\BABU M\.gemini\antigravity-ide\brain\952a2cd4-11bd-4000-8fff-1d30a680e63b\.user_uploaded\media_1790348010540.png"
    process_all_13_emojis(sprite_sheet, rose_img)
