import { NextResponse } from "next/server";
import { getGitHubPhotoPath } from "@/lib/github-photo-path";

function getGitHubConfig() {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
        throw new Error("GitHub environment variables are missing");
    }

    return { token, owner, repo };
}

function getGitHubHeaders(token: string) {
    return {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
    };
}

function createImagePath(extension: string) {
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const folder = fileName.substring(0, 2);

    return {
        fileName,
        path: `images/${folder}/${fileName}`,
    };
}
const MAX_PHOTO_BYTES = 3_000_000;
const MAX_BATCH_BYTES = 4_000_000;

async function detectPhotoExtension(
    file: File,
): Promise<"jpg" | "png" | "webp" | null> {
    const header = Buffer.from(await file.slice(0, 12).arrayBuffer());

    if (header.length < 12) return null;

    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
        return "jpg";
    }

    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    if (header.subarray(0, 8).equals(pngSignature)) {
        return "png";
    }

    if (
        header.toString("ascii", 0, 4) === "RIFF" &&
        header.toString("ascii", 8, 12) === "WEBP"
    ) {
        return "webp";
    }

    return null;
}
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 },
            );
        }

        if (file.size > MAX_PHOTO_BYTES) {
            return NextResponse.json(
                { error: "De foto mag maximaal 3 MB groot zijn." },
                { status: 413 },
            );
        }

        const extension = await detectPhotoExtension(file);

        if (!extension) {
            return NextResponse.json(
                { error: "Gebruik een JPEG-, PNG- of WebP-foto." },
                { status: 415 },
            );
        }

        const { token, owner, repo } = getGitHubConfig();
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");
        const { fileName, path } = createImagePath(extension);
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                method: "PUT",
                headers: getGitHubHeaders(token),
                body: JSON.stringify({
                    message: `Add image ${fileName}`,
                    content: base64,
                }),
            },
        );

        if (!response.ok) {
            const error = await response.text();

            console.error("GitHub upload failed:", {
                status: response.status,
                statusText: response.statusText,
                error,
                path,
            });

            return NextResponse.json(
                {
                    error: "GitHub upload failed",
                    details: error,
                    path,
                },
                { status: response.status },
            );
        }

        const data = await response.json();

        return NextResponse.json({
            url: data.content.download_url,
            path,
        });
    } catch (error) {
        console.error("GitHub upload error:", error);

        return NextResponse.json(
            { error: "Failed to upload image" },
            { status: 500 },
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { token, owner, repo } = getGitHubConfig();
        const body = await request.json();
        const photoUrl = body?.url;

        if (!photoUrl || typeof photoUrl !== "string") {
            return NextResponse.json(
                { error: "No image URL provided" },
                { status: 400 },
            );
        }

        const photo = getGitHubPhotoPath(photoUrl, owner, repo);

        if (!photo) {
            return NextResponse.json(
                { error: "Deze foto kan niet via DateCheck verwijderd worden." },
                { status: 400 },
            );
        }

        const { branch, path } = photo;

        const fileResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            },
        );

        if (fileResponse.status === 404) {
            return NextResponse.json({
                message: "Image already deleted",
            });
        }

        if (!fileResponse.ok) {
            const error = await fileResponse.text();

            return NextResponse.json(
                {
                    error: "Failed to find GitHub image",
                    details: error,
                },
                { status: fileResponse.status },
            );
        }

        const fileData = await fileResponse.json();

        const deleteResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
                method: "DELETE",
                headers: getGitHubHeaders(token),
                body: JSON.stringify({
                    message: `Delete image ${path}`,
                    sha: fileData.sha,
                    branch,
                }),
            },
        );

        if (!deleteResponse.ok) {
            const error = await deleteResponse.text();

            return NextResponse.json(
                {
                    error: "Failed to delete GitHub image",
                    details: error,
                },
                { status: deleteResponse.status },
            );
        }

        return NextResponse.json({
            message: "Image deleted successfully",
        });
    } catch (error) {
        console.error("GitHub delete error:", error);

        return NextResponse.json(
            { error: "Failed to delete image" },
            { status: 500 },
        );
    }
}

export async function PUT(request: Request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll("files");

        if (files.length === 0) {
            return NextResponse.json(
                { error: "No files provided" },
                { status: 400 },
            );
        }

        const uploads: { file: File; extension: string }[] = [];
        let totalBytes = 0;

        for (const file of files) {
            if (!(file instanceof File)) {
                return NextResponse.json(
                    { error: "De upload bevat een ongeldig bestand." },
                    { status: 400 },
                );
            }

            totalBytes += file.size;

            if (
                file.size > MAX_PHOTO_BYTES ||
                totalBytes > MAX_BATCH_BYTES
            ) {
                return NextResponse.json(
                    { error: "Maximaal 3 MB per foto en 4 MB per upload." },
                    { status: 413 },
                );
            }

            const extension = await detectPhotoExtension(file);

            if (!extension) {
                return NextResponse.json(
                    { error: "Gebruik alleen JPEG-, PNG- of WebP-foto’s." },
                    { status: 415 },
                );
            }

            uploads.push({ file, extension });
        }

        const { token, owner, repo } = getGitHubConfig();
        const headers = getGitHubHeaders(token);

        const refResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`,
            {
                headers,
            },
        );

        if (!refResponse.ok) {
            const error = await refResponse.text();

            return NextResponse.json(
                {
                    error: "Failed to get GitHub branch",
                    details: error,
                },
                { status: refResponse.status },
            );
        }

        const refData = await refResponse.json();
        const latestCommitSha = refData.object.sha;

        const commitResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
            {
                headers,
            },
        );

        if (!commitResponse.ok) {
            const error = await commitResponse.text();

            return NextResponse.json(
                {
                    error: "Failed to get GitHub commit",
                    details: error,
                },
                { status: commitResponse.status },
            );
        }

        const commitData = await commitResponse.json();
        const baseTreeSha = commitData.tree.sha;

        const blobs: {
            path: string;
            mode: "100644";
            type: "blob";
            sha: string;
        }[] = [];

        const uploadedImages: {
            url: string;
            path: string;
        }[] = [];

        for (const { file, extension } of uploads) {
            const buffer = Buffer.from(await file.arrayBuffer());

            const blobResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        content: buffer.toString("base64"),
                        encoding: "base64",
                    }),
                },
            );

            if (!blobResponse.ok) {
                const error = await blobResponse.text();

                return NextResponse.json(
                    {
                        error: "Failed to create GitHub image blob",
                        details: error,
                    },
                    { status: blobResponse.status },
                );
            }

            const blobData = await blobResponse.json();

            const { path } = createImagePath(extension);
            blobs.push({
                path,
                mode: "100644",
                type: "blob",
                sha: blobData.sha,
            });

            uploadedImages.push({
                url: `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`,
                path,
            });
        }

        const treeResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/trees`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    base_tree: baseTreeSha,
                    tree: blobs,
                }),
            },
        );

        if (!treeResponse.ok) {
            const error = await treeResponse.text();

            return NextResponse.json(
                {
                    error: "Failed to create GitHub tree",
                    details: error,
                },
                { status: treeResponse.status },
            );
        }

        const treeData = await treeResponse.json();

        const newCommitResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/commits`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    message: `Add ${uploadedImages.length} image${uploadedImages.length === 1 ? "" : "s"}`,
                    tree: treeData.sha,
                    parents: [latestCommitSha],
                }),
            },
        );

        if (!newCommitResponse.ok) {
            const error = await newCommitResponse.text();

            return NextResponse.json(
                {
                    error: "Failed to create GitHub commit",
                    details: error,
                },
                { status: newCommitResponse.status },
            );
        }

        const newCommitData = await newCommitResponse.json();

        const updateRefResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`,
            {
                method: "PATCH",
                headers,
                body: JSON.stringify({
                    sha: newCommitData.sha,
                }),
            },
        );

        if (!updateRefResponse.ok) {
            const error = await updateRefResponse.text();

            return NextResponse.json(
                {
                    error: "Failed to update GitHub branch",
                    details: error,
                },
                { status: updateRefResponse.status },
            );
        }

        return NextResponse.json({
            images: uploadedImages,
        });
    } catch (error) {
        console.error("GitHub bulk upload error:", error);

        return NextResponse.json(
            { error: "Failed to bulk upload images" },
            { status: 500 },
        );
    }
}