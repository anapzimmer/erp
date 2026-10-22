import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.glasscode.com.br";

  return [
    {
      url: `${baseUrl}/fundadores`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/como-funciona`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/recursos`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/planos`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
