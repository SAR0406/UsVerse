import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const LANDING_PAGE_PATH = path.join(process.cwd(), "src", "app", "landing_page.html");
let cachedLandingPageHtml: Promise<string> | null = null;

export async function GET() {
  try {
    cachedLandingPageHtml ??= fs.readFile(LANDING_PAGE_PATH, "utf8");
    const html = await cachedLandingPageHtml;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    cachedLandingPageHtml = null;
    console.error("Failed to read landing_page.html for / route", error);
    return new NextResponse("Landing page is unavailable.", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
