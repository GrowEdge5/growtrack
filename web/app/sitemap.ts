import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://growtrack.pro";
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0
    },
    {
      url: `${baseUrl}/wallet/0xd8da6bf26964af9d7eed9e03e53415d37aa96045`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8
    },
    {
      url: `${baseUrl}/wallet/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3
    }
  ];
}
