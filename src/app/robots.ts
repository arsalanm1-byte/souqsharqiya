import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/email";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/*/messages", "/*/account", "/*/my/", "/*/admin", "/*/saved", "/*/post", "/*/login"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
