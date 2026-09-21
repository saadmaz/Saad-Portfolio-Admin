/**
 * RASTER IMAGE DECLARATIONS
 * These allow you to import standard photos and graphics.
 * Usage: import profile from "@/assets/profile.jpg";
 */
declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.jpeg" {
  const value: string;
  export default value;
}

declare module "*.gif" {
  const value: string;
  export default value;
}

declare module "*.webp" {
  const value: string;
  export default value;
}

declare module "*.ico" {
  const value: string;
  export default value;
}

/**
 * VECTOR & GRAPHICS
 * SVGs are often handled differently. If using SVGR, this might change, 
 * but for standard <img> tag usage, this declaration is perfect.
 */
declare module "*.svg" {
  const value: string;
  export default value;
}

/**
 * DOCUMENT & FILE ASSETS
 * Crucial for your Download Resume and Download Project Case Study features.
 */
declare module "*.pdf" {
  const content: string;
  export default content;
}

declare module "*.csv" {
  const content: string;
  export default content;
}

/**
 * VIDEO & MULTIMEDIA
 * Use these for background hero videos or project demo clips.
 */
declare module "*.mp4" {
  const value: string;
  export default value;
}

declare module "*.webm" {
  const value: string;
  export default value;
}

declare module "*.ogg" {
  const value: string;
  export default value;
}

/**
 * AUDIO ASSETS
 * In case you add sound effects or podcast snippets to your blog/insights.
 */
declare module "*.mp3" {
  const value: string;
  export default value;
}

declare module "*.wav" {
  const value: string;
  export default value;
}

/**
 * FONT DECLARATIONS
 * If you decide to host custom fonts locally instead of using Google Fonts.
 */
declare module "*.woff" {
  const value: string;
  export default value;
}

declare module "*.woff2" {
  const value: string;
  export default value;
}

declare module "*.eot" {
  const value: string;
  export default value;
}

declare module "*.ttf" {
  const value: string;
  export default value;
}

declare module "*.otf" {
  const value: string;
  export default value;
}

/// <reference types="vite/client" />