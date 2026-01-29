import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate a short random ID (similar to nanoid)
function generateShortId(length = 8): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Simple hash function for content deduplication (djb2 algorithm)
function hashContent(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // Convert to unsigned 32-bit integer and then to hex string
  return (hash >>> 0).toString(16);
}

export const share = mutation({
  args: {
    topic: v.string(),
    title: v.string(),
    content: v.string(),
    maxLetters: v.number(),
    imageUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Create a hash of the story content for deduplication
    const contentHash = hashContent(
      `${args.topic}|${args.title}|${args.content}|${args.maxLetters}`
    );

    // Check if this story has already been shared
    const existing = await ctx.db
      .query("sharedStories")
      .withIndex("by_contentHash", (q) => q.eq("contentHash", contentHash))
      .first();

    if (existing) {
      // Return the existing share link instead of creating a duplicate
      return { shortId: existing.shortId };
    }

    // Create new share
    const shortId = generateShortId();

    await ctx.db.insert("sharedStories", {
      shortId,
      contentHash,
      topic: args.topic,
      title: args.title,
      content: args.content,
      maxLetters: args.maxLetters,
      imageUrls: args.imageUrls,
      createdAt: Date.now(),
    });

    return { shortId };
  },
});

export const getByShortId = query({
  args: { shortId: v.string() },
  handler: async (ctx, { shortId }) => {
    const story = await ctx.db
      .query("sharedStories")
      .withIndex("by_shortId", (q) => q.eq("shortId", shortId))
      .first();

    return story;
  },
});
