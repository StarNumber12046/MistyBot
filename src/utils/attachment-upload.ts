import type { Attachment } from "discord.js";
import { uploadUrl } from "./ut.js";

/**
 * Uploads multiple Discord attachments and returns their uploaded URLs
 * @param attachments - Array of Discord attachments to upload
 * @returns Array of successfully uploaded URLs (filters out failed uploads)
 */
export async function uploadAttachments(
  attachments: Attachment[]
): Promise<string[]> {
  const uploadPromises = attachments.map(async (attachment) => {
    const url = attachment.url;
    const uploadedUrl = await uploadUrl(url);
    return uploadedUrl;
  });

  const uploadedUrls = await Promise.all(uploadPromises);
  return uploadedUrls.filter(Boolean) as string[];
}
