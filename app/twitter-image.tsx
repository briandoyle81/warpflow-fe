import {
  ogImageAlt,
  ogImageSize,
  voidTacticsShareImageResponse,
} from "./og-share-image";

export const runtime = "edge";

export const alt = ogImageAlt;
export const size = ogImageSize;
export const contentType = "image/png";

export default function TwitterImage() {
  return voidTacticsShareImageResponse();
}
