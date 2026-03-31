import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const htmlPath = path.join(process.cwd(), "src", "app", "landing_page.html");
  const html = await fs.readFile(htmlPath, "utf8");

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
