"""Create web gallery assets without changing the original photographs.

Run with Python and Pillow: python scripts/optimize-gallery.py
"""

from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1] / "src/assets/gallery"


def main():
    originals = sorted(ROOT.glob("*/*.jpg"))
    total = 0
    for source in originals:
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")
            for variant, size, quality in [("full", 1920, 82), ("thumbnails", 640, 78)]:
                destination = ROOT / "optimized" / variant / source.relative_to(ROOT).with_suffix(".webp")
                destination.parent.mkdir(parents=True, exist_ok=True)
                resized = image.copy()
                resized.thumbnail((size, size), Image.Resampling.LANCZOS)
                resized.save(destination, "WEBP", quality=quality, method=6)
                total += destination.stat().st_size
    before = sum(path.stat().st_size for path in originals)
    print(f"{len(originals)} originals preserved: {before:,} bytes; web variants: {total:,} bytes ({100 * (1 - total / before):.1f}% smaller)")


if __name__ == "__main__":
    main()
