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

    green_remodeling_applications: defineTable({
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
        signature: v.optional(v.string()), // storageId or dataUrl (Application)
        consentSignature: v.optional(v.string()), // storageId or dataUrl (Privacy)
        contractSignature: v.optional(v.string()), // storageId or dataUrl (KCC Contract)
        agreements: v.object({
            agree1: v.boolean(), // privacy consent
        }),
        isPriorityTarget: v.optional(v.boolean()), // 이자 지원 우대 대상자 여부
        beforePhotos: v.optional(v.array(v.string())), // 공사 전 사진 storageIds
        afterPhotos: v.optional(v.array(v.string())), // 공사 후 사진 storageIds
        
        postApplication: v.optional(v.object({
            completionDate: v.string(),
            ownerConfirmSignature: v.string(),
            status: v.string(), // pending, completed
        })),

        issuedBusinessFile: v.optional(v.string()), // storageId (Admin issued)
        issuedCompletionFile: v.optional(v.string()), // storageId (Admin issued)

        status: v.string(), // 임시저장, 신청완료, 완료신청중, 최종완료
        createdAt: v.string(),
    }).index("by_quoteId", ["quoteId"])
      .index("by_name_phone", ["name", "phone"]),

    pdf_templates: defineTable({
        name: v.string(),
        type: v.string(), // rental, subscription, green_remodeling
        storageId: v.string(), // 원본 PDF 파일 Storage ID
        fields: v.array(v.object({
            id: v.string(), // 고유번호 (예: customer_name)
            page: v.number(),
            x: v.number(),
            y: v.number(),
            width: v.number(),
            height: v.number(),
            type: v.string(), // text, signature
            fontSize: v.optional(v.number()),
            alignment: v.optional(v.string()), // left, center, right
            label: v.optional(v.string()), // 영역 제목
        })),
        createdAt: v.string(),
    }),
});
