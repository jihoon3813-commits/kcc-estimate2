import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Quotes Mutations
export const saveQuote = mutation({
    args: {
        date: v.string(),
        branch: v.optional(v.string()),
        type: v.string(),
        name: v.string(),
        phone: v.string(),
        address: v.optional(v.string()),
        kccPrice: v.number(),
        finalQuote: v.number(),
        finalBenefit: v.number(),
        discountRate: v.number(),
        extraDiscount: v.number(),
        marginAmt: v.optional(v.number()),
        marginRate: v.optional(v.number()),
        sub24: v.number(),
        sub36: v.number(),
        sub48: v.number(),
        sub60: v.number(),
        items: v.string(),
        storageId: v.optional(v.id("_storage")),
        pdfUrl: v.optional(v.string()),
        remark: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Trim name to prevent whitespace issues
        const normalizedName = args.name.trim().normalize("NFC");
        const quoteId = await ctx.db.insert("quotes", { ...args, name: normalizedName });
        return quoteId;
    },
});

export const internalSaveQuote = internalMutation({
    args: {
        date: v.string(),
        branch: v.optional(v.string()),
        type: v.string(),
        name: v.string(),
        phone: v.string(),
        address: v.optional(v.string()),
        kccPrice: v.number(),
        finalQuote: v.number(),
        finalBenefit: v.number(),
        discountRate: v.number(),
        extraDiscount: v.number(),
        marginAmt: v.optional(v.number()),
        marginRate: v.optional(v.number()),
        sub24: v.number(),
        sub36: v.number(),
        sub48: v.number(),
        sub60: v.number(),
        items: v.string(),
        pdfUrl: v.optional(v.string()),
        remark: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const normalizedName = args.name.trim().normalize("NFC");
        const quoteId = await ctx.db.insert("quotes", { ...args, name: normalizedName });
        return quoteId;
    },
});

export const updateRemark = mutation({
    args: {
        id: v.id("quotes"),
        remark: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { remark: args.remark });
    },
});

export const updateItems = mutation({
    args: {
        id: v.id("quotes"),
        items: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { items: args.items });
    },
});

export const updateFinancials = mutation({
    args: {
        id: v.id("quotes"),
        finalBenefit: v.number(),
        discountRate: v.number(),
        extraDiscount: v.number(),
        marginAmt: v.number(),
        marginRate: v.number(),
        sub24: v.number(),
        sub36: v.number(),
        sub48: v.number(),
        sub60: v.number(),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    },
});

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

export const clearAllQuotes = internalMutation({
    args: {},
    handler: async (ctx) => {
        const quotes = await ctx.db.query("quotes").collect();
        for (const q of quotes) {
            await ctx.db.delete(q._id);
        }
    },
});

export const getQuote = query({
    args: { id: v.id("quotes") },
    handler: async (ctx, args) => {
        const quote = await ctx.db.get(args.id);
        if (!quote) return null;
        return {
            ...quote,
            pdfUrl: quote.storageId ? await ctx.storage.getUrl(quote.storageId) : quote.pdfUrl,
        };
    },
});

// Queries
export const listQuotes = query({
    handler: async (ctx) => {
        const quotes = await ctx.db.query("quotes").order("desc").collect();
        return Promise.all(
            quotes.map(async (q) => ({
                ...q,
                pdfUrl: q.storageId ? await ctx.storage.getUrl(q.storageId) : q.pdfUrl,
            }))
        );
    },
});

export const searchQuote = query({
    args: {
        name: v.string(),
        phone: v.string(),
        statusType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const normalizedName = args.name.trim().normalize("NFC");

        // Prepare phone variations to try (clean, dashed, etc)
        const cleanPhone = args.phone.replace(/[^0-9]/g, "");

        // Basic 3-4-4 or 3-3-4 formatting logic for Korea
        let dashedPhone = cleanPhone;
        if (cleanPhone.length === 11) {
            dashedPhone = `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 7)}-${cleanPhone.slice(7)}`;
        } else if (cleanPhone.length === 10) {
            if (cleanPhone.startsWith('02')) {
                dashedPhone = `${cleanPhone.slice(0, 2)}-${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`;
            } else {
                dashedPhone = `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
            }
        }

        // Try exact input, clean (no dashes), and standard dashed format
        const phonesToTry = new Set([args.phone, cleanPhone, dashedPhone]);

        for (const phoneVariant of phonesToTry) {
            let quotes = await ctx.db
                .query("quotes")
                .withIndex("by_name_phone", (q) =>
                    q.eq("name", normalizedName).eq("phone", phoneVariant)
                )
                .order("desc")
                .collect();

            // Filter by statusType if provided
            if (args.statusType) {
                quotes = quotes.filter((q) => q.type === args.statusType);
            }

            if (quotes.length > 0) {
                const quote = quotes[0];
                return {
                    ...quote,
                    pdfUrl: quote.storageId
                        ? await ctx.storage.getUrl(quote.storageId)
                        : quote.pdfUrl,
                };
            }
        }
        return null;
    },
});

/**
 * 연이율 9.4% 소급 적용 마이그레이션
 */
export const migrateInterestRates = mutation({
    args: {},
    handler: async (ctx) => {
        const annualRate = 0.094;
        const r = annualRate / 12;

        const calculatePmt = (amount: number, months: number) => {
            if (amount <= 0) return 0;
            const pmt = (amount * r) / (1 - Math.pow(1 + r, -months));
            return Math.floor(pmt / 10) * 10;
        };

        // 1. 모든 견적(quotes) 업데이트
        const quotes = await ctx.db.query("quotes").collect();
        for (const q of quotes) {
            const finalBenefit = q.finalBenefit || 0;
            await ctx.db.patch(q._id, {
                sub24: calculatePmt(finalBenefit, 24),
                sub36: calculatePmt(finalBenefit, 36),
                sub48: calculatePmt(finalBenefit, 48),
                sub60: calculatePmt(finalBenefit, 60),
            });
        }

        // 2. 모든 할부신청(subscription_applications) 업데이트
        const subscriptions = await ctx.db.query("subscription_applications").collect();
        for (const s of subscriptions) {
            // 신청 시점의 잔금(balance) 또는 할인가(finalBenefit) 기준으로 재계산
            // 할부 개월수(selectedAmount) 확인
            const amountToCalc = s.balance || s.finalBenefit || 0;
            const months = s.selectedAmount || 60;
            if (amountToCalc > 0) {
                await ctx.db.patch(s._id, {
                    monthlyAmount: calculatePmt(amountToCalc, months)
                });
            }
        }

        // 3. 렌탈신청(rental_applications) 업데이트 (일부 이율 기반 계산이 있는 경우)
        const rentals = await ctx.db.query("rental_applications").collect();
        for (const rent of rentals) {
            // 렌탈은 보통 60개월 고정
            const amountToCalc = rent.balance || rent.finalBenefit || 0;
            if (amountToCalc > 0 && (rent as any).monthlyAmount > 330000) { 
                // 기존 monthlyAmount가 11/22/33 패키지가 아닌 경우에만 (이율 기반일 확률 높음)
                await ctx.db.patch(rent._id, {
                    monthlyAmount: calculatePmt(amountToCalc, 60)
                });
            }
        }

        return { success: true, count: quotes.length + subscriptions.length + rentals.length };
    }
});
