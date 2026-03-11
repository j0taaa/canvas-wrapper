import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Canvas Wrapper",
    short_name: "Canvas",
    description: "Canvas-like PWA dashboard built with Next.js.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/window.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
