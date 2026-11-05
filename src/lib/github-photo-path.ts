export function getGitHubPhotoPath(
    photoUrl: string,
    owner: string,
    repo: string,
): { branch: "main"; path: string } | null {
    try {
        const url = new URL(photoUrl);

        if (
            url.origin !== "https://raw.githubusercontent.com" ||
            url.username ||
            url.password
        ) {
            return null;
        }

        const [urlOwner, urlRepo, branch, folder, ...fileParts] = url.pathname
            .slice(1)
            .split("/")
            .map((part) => decodeURIComponent(part));

        if (
            urlOwner?.toLowerCase() !== owner.toLowerCase() ||
            urlRepo?.toLowerCase() !== repo.toLowerCase() ||
            branch !== "main" ||
            folder !== "images" ||
            fileParts.length === 0 ||
            fileParts.some(
                (part) =>
                    !part ||
                    part === "." ||
                    part === ".." ||
                    part.includes("/") ||
                    part.includes("\\") ||
                    part.includes("%"),
            )
        ) {
            return null;
        }

        return {
            branch,
            path: `images/${fileParts.map(encodeURIComponent).join("/")}`,
        };
    } catch {
        return null;
    }
}