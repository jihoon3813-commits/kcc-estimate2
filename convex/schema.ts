import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    quotes: defineTable({
        date: v.string(),
        branch: v.optional(v.string()),
        type: v.string(), // 가견적, 정식견적 등
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
        items: v.string(), // JSON string for now to keep it simple and compatible with existing logic
        storageId: v.optional(v.id("_storage")),
        pdfUrl: v.optional(v.string()),
        remark: v.optional(v.string()),
    }).index("by_name_phone", ["name", "phone"]),

    appliances: defineTable({
        type: v.string(), // A, B
        category: v.string(),
        img: v.string(),
        name: v.string(),
        model: v.string(),
        link: v.string(),
    }),

    banners: defineTable({
        img: v.string(),
        link: v.string(),
        height: v.optional(v.any()), // Can be string or number
    }),

    rental_applications: defineTable({
        quoteId: v.optional(v.id("quotes")),
        name: v.string(),
        phone: v.string(),
        address: v.string(),
        birthDate: v.string(),
        gender: v.string(),
        selectedAmount: v.number(),
        ownershipType: v.string(),
        finalBenefit: v.optional(v.number()),
        downPayment: v.optional(v.number()),
        balance: v.optional(v.number()),
        conversionMode: v.optional(v.string()),
        monthlyAmount: v.optional(v.number()),
        files: v.array(v.object({
            category: v.string(), // registry, contract, family, id_card
            name: v.string(),
            storageId: v.string(),
        })),
        agreements: v.object({
            agree1: v.boolean(),
            agree2: v.boolean(),
            agree3: v.boolean(),
        }),
        status: v.string(), // pending
        transferDate: v.optional(v.string()),
        jobCategory: v.optional(v.string()),
        createdAt: v.string(),
    }).index("by_quoteId", ["quoteId"])
      .index("by_name_phone", ["name", "phone"]),

    subscription_applications: defineTable({
        quoteId: v.optional(v.id("quotes")),
        name: v.string(),
        phone: v.string(),
        address: v.string(),
        birthDate: v.string(),
        gender: v.string(),
        selectedAmount: v.number(),
        ownershipType: v.string(),
        finalBenefit: v.optional(v.number()),
        downPayment: v.optional(v.number()),
        balance: v.optional(v.number()),
        conversionMode: v.optional(v.string()),
        monthlyAmount: v.optional(v.number()),
        files: v.array(v.object({
            category: v.string(),
            name: v.string(),
            storageId: v.string(),
        })),
        agreements: v.object({
            agree1: v.boolean(),
            agree2: v.boolean(),
            agree3: v.boolean(),
        }),
        status: v.string(), // pending
        transferDate: v.optional(v.string()),
        jobCategory: v.optional(v.string()),
        createdAt: v.string(),
    }).index("by_quoteId", ["quoteId"])
      .index("by_name_phone", ["name", "phone"]),
});
