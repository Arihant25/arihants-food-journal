import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arihant's Food Journal",
    short_name: "Food Journal",
    description: "A warm, private food journal with AI-filled nutrition and goal tracking.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "en",
    dir: "ltr",
    categories: ["health", "lifestyle", "food"],
    background_color: "#faf6ec",
    theme_color: "#41562f",
    icons: [
      { src: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { src: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
