import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const createInquiry = mutation({
    args: {
        quoteId: v.optional(v.id("quotes")),
        name: v.string(),
        phone: v.string(),
        address: v.optional(v.string()),
        paymentMethod: v.optional(v.string()),
        topics: v.array(v.string()),
        preferredTime: v.optional(v.string()),
        memo: v.optional(v.string()),
        createdAt: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const createdAt = args.createdAt || new Date().toISOString();
        const normalizedName = args.name.trim().normalize("NFC");

        const inquiryId = await ctx.db.insert("inquiries", {
            quoteId: args.quoteId,
            name: normalizedName,
            phone: args.phone,
            address: args.address || "",
            paymentMethod: args.paymentMethod || "일시불",
            topics: args.topics,
            preferredTime: args.preferredTime || "상관없음",
            memo: args.memo || "",
            status: "pending",
            createdAt: createdAt,
        });

        // If quoteId is present, also update the quote's remark field for quick access
        if (args.quoteId) {
            try {
                const quote = await ctx.db.get(args.quoteId);
                if (quote) {
                    const dateStr = new Date().toLocaleDateString("ko-KR");
                    const topicStr = args.topics.join(", ") || "견적 상담";
                    const newRemarkLine = `[문의접수 ${dateStr}] ${args.paymentMethod || "일시불"} / ${topicStr} / 희망: ${args.preferredTime || "상관없음"}${args.memo ? " / " + args.memo : ""}`;
                    const updatedRemark = quote.remark ? `${quote.remark}\n${newRemarkLine}` : newRemarkLine;
                    await ctx.db.patch(args.quoteId, { remark: updatedRemark });
                }
            } catch (err) {
                console.error("Failed to append remark to quote:", err);
            }
        }

        // Send Discord notification
        try {
            await ctx.scheduler.runAfter(0, internal.discord.sendNotification, {
                type: "inquiry",
                name: normalizedName,
                phone: args.phone,
                selectedAmount: `${args.paymentMethod || "일시불"} | ${args.topics.join(", ") || "상담요청"} (${args.preferredTime || "시간무관"})`,
                address: args.address || "주소 미지정",
                memo: args.memo || undefined,
            });
        } catch (err) {
            console.error("Failed to schedule discord notification:", err);
        }

        return inquiryId;
    },
});

export const listInquiries = query({
    handler: async (ctx) => {
        const inquiries = await ctx.db.query("inquiries").order("desc").collect();
        return Promise.all(
            inquiries.map(async (inq) => {
                let quote = null;
                if (inq.quoteId) {
                    try {
                        quote = await ctx.db.get(inq.quoteId);
                    } catch (e) {
                        quote = null;
                    }
                }
                return {
                    ...inq,
                    id: inq._id,
                    quote: quote ? {
                        id: quote._id,
                        date: quote.date,
                        branch: quote.branch,
                        type: quote.type,
                        finalBenefit: quote.finalBenefit,
                        kccPrice: quote.kccPrice,
                        pdfUrl: quote.pdfUrl,
                    } : null,
                };
            })
        );
    },
});

export const getInquiriesByQuote = query({
    args: { quoteId: v.id("quotes") },
    handler: async (ctx, args) => {
        const inquiries = await ctx.db
            .query("inquiries")
            .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
            .order("desc")
            .collect();
        return inquiries.map((inq) => ({ ...inq, id: inq._id }));
    },
});

export const updateInquiryStatus = mutation({
    args: {
        id: v.id("inquiries"),
        status: v.string(), // "pending", "in_progress", "completed"
        adminMemo: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updateData: { status: string; adminMemo?: string } = { status: args.status };
        if (args.adminMemo !== undefined) {
            updateData.adminMemo = args.adminMemo;
        }
        await ctx.db.patch(args.id, updateData);
    },
});

export const updateInquiryAdminMemo = mutation({
    args: {
        id: v.id("inquiries"),
        adminMemo: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { adminMemo: args.adminMemo });
    },
});

export const deleteInquiry = mutation({
    args: {
        id: v.id("inquiries"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
