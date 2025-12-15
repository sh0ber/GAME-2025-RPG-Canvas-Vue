/**
 * Loads a single image asynchronously wrapped in a Promise.
 * @param {string} url - The source URL of the image.
 * @returns {Promise<HTMLImageElement>} A promise that resolves with the loaded Image object.
 */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}