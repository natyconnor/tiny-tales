import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sharedStories: defineTable({
    shortId: v.string(),
    contentHash: v.string(),
    topic: v.string(),
    title: v.string(),
    content: v.string(),
    maxLetters: v.number(),
    imageUrls: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_shortId", ["shortId"])
    .index("by_contentHash", ["contentHash"]),
});
