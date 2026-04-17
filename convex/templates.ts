import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * 템플릿용 업로드 URL 생성
 */
export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

/**
 * 템플릿 저장 (추가/수정)
 */
export const saveTemplate = mutation({
    args: {
        id: v.optional(v.id("pdf_templates")),
        name: v.string(),
        type: v.string(),
        storageId: v.string(),
        fields: v.array(v.object({
            id: v.string(),
            page: v.number(),
            x: v.number(),
            y: v.number(),
            width: v.number(),
            height: v.number(),
            type: v.string(),
            fontSize: v.optional(v.number()),
            alignment: v.optional(v.string()),
            label: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const { id, ...data } = args;
        const now = new Date().toISOString();

        if (id) {
            await ctx.db.patch(id, { ...data });
            return id;
        } else {
            return await ctx.db.insert("pdf_templates", {
                ...data,
                createdAt: now,
            });
        }
    },
});

/**
 * 템플릿 리스트 조회
 */
export const listTemplates = query({
    handler: async (ctx) => {
        const templates = await ctx.db.query("pdf_templates").order("desc").collect();
        const results = [];
        for (const t of templates) {
            results.push({
                ...t,
                url: await ctx.storage.getUrl(t.storageId),
            });
        }
        return results;
    },
});

/**
 * 특정 템플릿 조회
 */
export const getTemplate = query({
    args: { id: v.id("pdf_templates") },
    handler: async (ctx, args) => {
        const template = await ctx.db.get(args.id);
        if (!template) return null;
        return {
            ...template,
            url: await ctx.storage.getUrl(template.storageId),
        };
    },
});

/**
 * 특정 타입의 최신 템플릿 조회
 */
export const getLatestTemplateByType = query({
    args: { 
        type: v.optional(v.string()),
        name: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        let query = ctx.db.query("pdf_templates");
        
        if (args.type) {
            query = query.filter((q) => q.eq(q.field("type"), args.type));
        }
        
        if (args.name) {
            query = query.filter((q) => q.eq(q.field("name"), args.name));
        }

        const template = await query.order("desc").first();
        
        if (!template) return null;
        return {
            ...template,
            url: await ctx.storage.getUrl(template.storageId),
        };
    },
});

/**
 * 템플릿 삭제
 */
export const deleteTemplate = mutation({
    args: { id: v.id("pdf_templates") },
    handler: async (ctx, args) => {
        const template = await ctx.db.get(args.id);
        if (template) {
            await ctx.storage.delete(template.storageId);
            await ctx.db.delete(args.id);
        }
    },
});

export const fixTemplateTypes = mutation({
    args: {},
    handler: async (ctx) => {
        const templates = await ctx.db.query("pdf_templates").collect();
        for (const t of templates) {
            if (t.name.includes("그린리모델링") || t.name.includes("개인정보")) {
                await ctx.db.patch(t._id, { type: "green_remodeling" });
            }
        }
    }
});
