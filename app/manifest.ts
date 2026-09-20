import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Seijun — Personal Cycle Tracker",
    short_name: "Seijun",
    description: "Seijun — Personal Cycle Tracker",
    start_url: "/login",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f3fe",
    theme_color: "#7152b5",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
