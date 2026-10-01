import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

const GITHUB_API = "https://api.github.com";

function getHeaders() {
    return {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
}

export async function GET() {
    try {
        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;

        if (!owner || !repo || !process.env.GITHUB_TOKEN) {
            return NextResponse.json(
                { error: "GitHub environment variables are missing." },
                { status: 500 },
            );
        }

        const linkedItems = await sql`
      SELECT photo_url
      FROM items
      WHERE photo_url IS NOT NULL
    `;

        const linkedUrls = new Set(
            linkedItems
                .map((item) => item.photo_url)
                .filter((url): url is string => Boolean(url)),
        );

        const response = await fetch(
            `${GITHUB_API}/repos/${owner}/${repo}/git/trees/main?recursive=1`,
            {
                headers: getHeaders(),
                cache: "no-store",
            },
        );

        if (!response.ok) {
            throw new Error(`GitHub returned ${response.status}`);
        }

        const data = await response.json();

        const images = data.tree
            .filter(
                (item: { path?: string; type?: string }) =>
                    item.type === "blob" &&
                    item.path?.startsWith("images/"),
            )
            .map((item: { path: string }) => ({
                path: item.path,
                url: `https://raw.githubusercontent.com/${owner}/${repo}/main/${item.path}`,
            }))
            .filter(
                (image: { url: string }) => !linkedUrls.has(image.url),
            );

        return NextResponse.json({ images });
    } catch (error) {
        console.error("Relink images error:", error);

        return NextResponse.json(
            { error: "Failed to load GitHub images." },
            { status: 500 },
        );
    }
}