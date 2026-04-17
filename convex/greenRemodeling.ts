import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * 업로드 URL 생성
 */
export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

/**
 * 그린리모델링 신청서 제출 (또는 업데이트)
 */
export const submitApplication = mutation({
    args: {
        id: v.optional(v.id("green_remodeling_applications")),
        quoteId: v.optional(v.id("quotes")),
        name: v.string(),
        phone: v.string(),
        address: v.string(),
        birthDate: v.string(),
        gender: v.string(),
        selectedAmount: v.number(),
        downPayment: v.number(),
        balance: v.number(),
        isFullApplication: v.boolean(),
        targetCategory: v.string(),
        loanMethod: v.string(),
        startDate: v.string(),
        endDate: v.string(),
        files: v.array(v.object({
            category: v.string(),
            name: v.string(),
            storageId: v.string(),
        })),
        signature: v.optional(v.string()),
        consentSignature: v.optional(v.string()),
        contractSignature: v.optional(v.string()),
        isPriorityTarget: v.optional(v.boolean()),
        beforePhotos: v.optional(v.array(v.string())),
        agreements: v.object({
            agree1: v.boolean(),
        }),
    },
    handler: async (ctx, args) => {
        const { id, ...data } = args;
        const now = new Date().toISOString();

        if (id) {
            await ctx.db.patch(id, {
                ...data,
                // Do not update status if already set, or you can manage it
            });
            return id;
        } else {
            const newId = await ctx.db.insert("green_remodeling_applications", {
                ...data,
                status: "신청완료",
                createdAt: now,
            });
            return newId;
        }
    },
});

/**
 * 임시 저장 (Draft)
 */
export const saveDraft = mutation({
    args: {
        quoteId: v.optional(v.id("quotes")),
        name: v.string(),
        phone: v.string(),
        address: v.string(),
        birthDate: v.string(),
        gender: v.string(),
        selectedAmount: v.number(),
        downPayment: v.number(),
        balance: v.number(),
        isFullApplication: v.boolean(),
        targetCategory: v.string(),
        loanMethod: v.string(),
        startDate: v.string(),
        endDate: v.string(),
        files: v.array(v.object({
            category: v.string(),
            name: v.string(),
            storageId: v.string(),
        })),
        agreements: v.object({
            agree1: v.boolean(),
        }),
        signature: v.optional(v.string()),
        consentSignature: v.optional(v.string()),
        contractSignature: v.optional(v.string()),
        isPriorityTarget: v.optional(v.boolean()),
        beforePhotos: v.optional(v.array(v.string())),
        afterPhotos: v.optional(v.array(v.string())),
        postApplication: v.optional(v.object({
            completionDate: v.string(),
            ownerConfirmSignature: v.string(),
            status: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        const { name, phone, quoteId, birthDate } = args;
        
        // Find existing draft
        let existing;
        
        // 1. Try matching by quoteId first (highest priority)
        if (quoteId) {
            existing = await ctx.db
                .query("green_remodeling_applications")
                .withIndex("by_quoteId", (q) => q.eq("quoteId", quoteId))
                .filter((q) => q.eq(q.field("status"), "임시저장"))
                .first();
        }

        // 2. If not found, try matching by name + phone + birthDate (administrative requirement)
        if (!existing && birthDate) {
            existing = await ctx.db
                .query("green_remodeling_applications")
                .withIndex("by_name_phone", (q) => q.eq("name", name).eq("phone", phone))
                .filter((q) => q.and(
                    q.eq(q.field("status"), "임시저장"),
                    q.eq(q.field("birthDate"), birthDate)
                ))
                .order("desc") // Get the latest one if multiple exist somehow
                .first();
        }

        // 3. Fallback: match by name + phone only (legacy/minimal data)
        if (!existing) {
             existing = await ctx.db
                .query("green_remodeling_applications")
                .withIndex("by_name_phone", (q) => q.eq("name", name).eq("phone", phone))
                .filter((q) => q.and(
                    q.eq(q.field("status"), "임시저장"),
                    q.eq(q.field("selectedAmount"), args.selectedAmount)
                ))
                .order("desc")
                .first();
        }

        if (existing) {
            await ctx.db.patch(existing._id, {
                ...args,
            });
            return existing._id;
        } else {
            const id = await ctx.db.insert("green_remodeling_applications", {
                ...args,
                status: "임시저장",
                createdAt: new Date().toISOString(),
            });
            return id;
        }
    },
});

/**
 * 신청 리스트 조회 (Admin용)
 */
export const listApplications = query({
    handler: async (ctx) => {
        const apps = await ctx.db.query("green_remodeling_applications").order("desc").collect();
        return await Promise.all(apps.map(async (app) => {
            const files = await Promise.all((app.files || []).map(async (file) => ({
                ...file,
                url: file.storageId ? await ctx.storage.getUrl(file.storageId) : null
            })));
            const issuedBusinessFileUrl = app.issuedBusinessFile ? await ctx.storage.getUrl(app.issuedBusinessFile) : null;
            const issuedCompletionFileUrl = app.issuedCompletionFile ? await ctx.storage.getUrl(app.issuedCompletionFile) : null;
            
            let quoteItems = [];
            if (app.quoteId) {
                const quote = await ctx.db.get(app.quoteId);
                if (quote && quote.items) {
                    try {
                        quoteItems = JSON.parse(quote.items);
                    } catch (e) {
                        console.error("Failed to parse quote items", e);
                    }
                }
            }
            
            return { ...app, files, issuedBusinessFileUrl, issuedCompletionFileUrl, quoteItems };
        }));
    },
});

/**
 * 사업완료 확인서 발급 신청 (Post-construction)
 */
export const submitPostApplication = mutation({
    args: {
        id: v.id("green_remodeling_applications"),
        completionDate: v.string(),
        ownerConfirmSignature: v.string(),
        afterPhotos: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, completionDate, ownerConfirmSignature, afterPhotos } = args;
        await ctx.db.patch(id, {
            afterPhotos,
            postApplication: {
                completionDate,
                ownerConfirmSignature,
                status: "완료신청중",
            },
            status: "완료신청중",
        });
        return id;
    },
});

/**
 * 어드민 파일 발행 (사업확인서 / 사업완료 확인서)
 */
export const issueFile = mutation({
    args: {
        id: v.id("green_remodeling_applications"),
        storageId: v.string(),
        type: v.string(), // business, completion
    },
    handler: async (ctx, args) => {
        const { id, storageId, type } = args;
        if (type === 'business') {
            await ctx.db.patch(id, { issuedBusinessFile: storageId });
        } else if (type === 'completion') {
            await ctx.db.patch(id, { issuedCompletionFile: storageId, status: "최종완료" });
        }
    },
});

/**
 * 특정 신청 정보 조회
 */
export const getApplication = query({
    args: { id: v.id("green_remodeling_applications") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

/**
 * 임시 저장 데이터 조회
 */
export const getDraft = query({
    args: { quoteId: v.optional(v.id("quotes")), name: v.string(), phone: v.string(), birthDate: v.optional(v.string()) },
    handler: async (ctx, args) => {
        let draft;
        // 1. Try matching by quoteId first
        if (args.quoteId) {
            draft = await ctx.db
                .query("green_remodeling_applications")
                .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
                .filter((q) => q.eq(q.field("status"), "임시저장"))
                .first();
        }
        
        // 2. If not found, try matching by name+phone+birthDate
        if (!draft && args.birthDate) {
            draft = await ctx.db
                .query("green_remodeling_applications")
                .withIndex("by_name_phone", (q) => q.eq("name", args.name).eq("phone", args.phone))
                .filter((q) => q.and(
                    q.eq(q.field("status"), "임시저장"),
                    q.eq(q.field("birthDate"), args.birthDate)
                ))
                .order("desc")
                .first();
        }

        if (draft) {
            const files = await Promise.all((draft.files || []).map(async (file) => ({
                ...file,
                url: file.storageId ? await ctx.storage.getUrl(file.storageId) : null
            })));
            return { ...draft, files };
        }

        return draft;
    },
});

/**
 * 최신 신청 정보 조회 (고객용 - 다운로드 링크 확인 등)
 */
export const getLatestApplication = query({
    args: { quoteId: v.optional(v.id("quotes")), name: v.string(), phone: v.string(), birthDate: v.optional(v.string()) },
    handler: async (ctx, args) => {
        let app;
        // 1. Try strict match by quoteId
        if (args.quoteId) {
            app = await ctx.db
                .query("green_remodeling_applications")
                .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
                .order("desc")
                .first();
        }

        // 2. Try match by name+phone+birthDate
        if (!app && args.birthDate) {
            app = await ctx.db
                .query("green_remodeling_applications")
                .withIndex("by_name_phone", (q) => q.eq("name", args.name).eq("phone", args.phone))
                .filter((q) => q.eq(q.field("birthDate"), args.birthDate))
                .order("desc")
                .first();
        }

        // 3. Last fallback: match by name+phone only (for Step 0 hint)
        if (!app) {
             app = await ctx.db
                .query("green_remodeling_applications")
                .withIndex("by_name_phone", (q) => q.eq("name", args.name).eq("phone", args.phone))
                .order("desc")
                .first();
        }

        if (app) {
            const issuedBusinessFileUrl = app.issuedBusinessFile ? await ctx.storage.getUrl(app.issuedBusinessFile) : null;
            const issuedCompletionFileUrl = app.issuedCompletionFile ? await ctx.storage.getUrl(app.issuedCompletionFile) : null;
            return { ...app, issuedBusinessFileUrl, issuedCompletionFileUrl };
        }
        return null;
    },
});

/**
 * 상태 업데이트
 */
export const updateStatus = mutation({
    args: { id: v.id("green_remodeling_applications"), status: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: args.status });
    },
});
