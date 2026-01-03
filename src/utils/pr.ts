import { Octokit } from "@octokit/rest";
import { Buffer } from "buffer";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

interface PullRequestParams {
  owner: string;
  repo: string;
  baseBranch: string;
  filePath: string;
  editFn: (currentContent: string) => string;
  commitMessage: string;
}

export async function editFile({
  owner,
  repo,
  baseBranch,
  filePath,
  editFn,
  commitMessage,
}: PullRequestParams): Promise<boolean> {
  try {
    // 3. Get file content
    const fileRes = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: baseBranch,
    });

    if (!("content" in fileRes.data) || !("sha" in fileRes.data)) {
      throw new Error("Unsupported file structure");
    }

    const currentContent = Buffer.from(fileRes.data.content, "base64").toString(
      "utf-8"
    );
    const updatedContent = editFn(currentContent);
    console.log(updatedContent);
    if (updatedContent === currentContent) {
      console.warn("🟨 File content unchanged. No PR created.");
      return true;
    }

    // 4. Update file
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(updatedContent).toString("base64"),
      sha: fileRes.data.sha,
      branch: "main",
    });
    return true;
  } catch (error) {
    console.error("❌ Failed to update:", (error as Error).message || error);
    return false;
  }
}
