const fullImages = import.meta.glob<string>(
    "../assets/gallery/optimized/full/**/*.webp",
    { eager: true, query: "?url", import: "default" }
);
const thumbnails = import.meta.glob<string>(
    "../assets/gallery/optimized/thumbnails/**/*.webp",
    { eager: true, query: "?url", import: "default" }
);

const thumbnailsByImage = new Map(
    Object.entries(fullImages).map(([path, url]) => [
        url,
        thumbnails[path.replace("/full/", "/thumbnails/")] ?? url,
    ])
);

export const getGalleryThumbnail = (image: string) =>
    thumbnailsByImage.get(image) ?? image;
