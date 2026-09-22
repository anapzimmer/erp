import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/dashboard/",
        "/configuracoes/",
        "/cadastros/",
        "/central-impressao/",
        "/plataforma/",
      ],
    },
    sitemap: "https://www.glasscode.com.br/sitemap.xml",
    host: "https://www.glasscode.com.br",
  };
}