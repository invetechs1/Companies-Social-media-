/** Media type detection from a URL's file extension, shared across provider adapters. */

const VIDEO_EXT = /\.(mp4|mov|m4v|webm)(\?.*)?$/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;

export function isVideoUrl(url: string): boolean {
  return VIDEO_EXT.test(url);
}

export function isImageUrl(url: string): boolean {
  return IMAGE_EXT.test(url);
}
