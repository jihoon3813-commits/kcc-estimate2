import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

export const submitApplication = mutation({
    args: {
        id: v.optional(v.id("rental_applications")), // Optional ID for existing draft
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
    },
    handler: async (ctx, args) => {
        const { id, ...data } = args;
        let finalId;

        if (id) {
            await ctx.db.patch(id, {
                ...data,
                status: "신청완료",
            });
            finalId = id;
        } else {
            finalId = await ctx.db.insert("rental_applications", {
                ...data,
                status: "신청완료",
                createdAt: new Date().toISOString(),
            });
        }

        // Send Discord Notification
        await ctx.scheduler.runAfter(0, internal.discord.sendNotification, {
            type: 'rental',
            name: args.name,
            phone: args.phone,
            selectedAmount: `${args.selectedAmount}만원`,
            address: args.address,
            isDraft: false,
        });

        return finalId;
    },
});

export const getDraft = query({
    args: { quoteId: v.optional(v.id("quotes")), name: v.string(), phone: v.string(), amount: v.number() },
    handler: async (ctx, args) => {
        let draft;
        if (args.quoteId) {
            draft = await ctx.db
                .query("rental_applications")
                .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
                .filter((q) => q.eq(q.field("status"), "임시저장"))
                .first();
        }
        if (!draft) {
            draft = await ctx.db
                .query("rental_applications")
                .withIndex("by_name_phone", (q) => q.eq("name", args.name).eq("phone", args.phone))
                .filter((q) => q.and(
                    q.eq(q.field("status"), "임시저장"),
                    q.eq(q.field("finalBenefit"), args.amount)
                ))
                .unique();
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

export const saveDraft = mutation({
    args: {
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
    },
    handler: async (ctx, args) => {
        let existingDraft;
        if (args.quoteId) {
            existingDraft = await ctx.db
                .query("rental_applications")
                .withIndex("by_quoteId", (q) => q.eq("quoteId", args.quoteId))
                .filter((q) => q.eq(q.field("status"), "임시저장"))
                .first();
        }
        if (!existingDraft) {
            existingDraft = await ctx.db
                .query("rental_applications")
                .withIndex("by_name_phone", (q) => q.eq("name", args.name).eq("phone", args.phone))
                .filter((q) => q.and(
                    q.eq(q.field("status"), "임시저장"),
                    q.eq(q.field("finalBenefit"), args.finalBenefit)
                ))
                .unique();
        }

        if (existingDraft) {
            await ctx.db.patch(existingDraft._id, {
                ...args,
            });
            return existingDraft._id;
        } else {
            const id = await ctx.db.insert("rental_applications", {
                ...args,
                status: "임시저장",
                createdAt: new Date().toISOString(),
            });

            // Send Discord Notification for NEW temporary save
            await ctx.scheduler.runAfter(0, internal.discord.sendNotification, {
                type: 'rental',
                name: args.name,
                phone: args.phone,
                selectedAmount: `${args.selectedAmount}만원`,
                address: args.address,
                isDraft: true,
            });

            return id;
        }
    },
});

export const listApplications = query({
    args: {},
    handler: async (ctx) => {
        const apps = await ctx.db.query("rental_applications").order("desc").collect();
        const results = [];

        for (const app of apps) {
            let finalBenefit = (app as any).finalBenefit || 0;
            let balance = (app as any).balance || 0;
            let monthlyAmount = (app as any).monthlyAmount || 0;
            let downPayment = (app as any).downPayment || 0;

            if (!finalBenefit || !balance) {
                let quote = null;
                if (app.quoteId) {
                    quote = await ctx.db.get(app.quoteId);
                } else {
                    quote = await ctx.db.query("quotes")
                        .withIndex("by_name_phone", (q) => q.eq("name", app.name).eq("phone", app.phone))
                        .first();
                }

                if (quote) {
                    finalBenefit = (quote as any).finalBenefit || 0;
                    // If balance was missing, recalculate it properly from possibly new finalBenefit
                    balance = finalBenefit - downPayment;
                    if (!monthlyAmount && app.selectedAmount) {
                         monthlyAmount = (app.selectedAmount === 11 ? 111000 : app.selectedAmount === 22 ? 222000 : app.selectedAmount === 33 ? 333000 : 0);
                    }
                }
            }

            const rawFiles = app.files || [];
            const filesWithUrls = await Promise.all(
                rawFiles.map(async (f) => ({
                    ...f,
                    url: await ctx.storage.getUrl(f.storageId as any),
                }))
            );
            let idDocumentUrl = null;
            if ((app as any).idDocumentStorageId) {
                try {
                    idDocumentUrl = await ctx.storage.getUrl((app as any).idDocumentStorageId as any);
                } catch (e) {
                    idDocumentUrl = null;
                }
            }
            let signatureUrl = null;
            if ((app as any).signature && !(app as any).signature.startsWith('data:')) {
                try {
                    signatureUrl = await ctx.storage.getUrl((app as any).signature as any);
                } catch (e) {
                    signatureUrl = null;
                }
            } else if ((app as any).signature) {
                signatureUrl = (app as any).signature;
            }

            results.push({
                ...app,
                finalBenefit,
                balance,
                monthlyAmount,
                files: filesWithUrls,
                idDocumentUrl,
                signatureUrl,
            });
        }

        return results;
    },
});

export const submitRentalNewApplication = mutation({
    args: {
        quoteId: v.optional(v.id("quotes")),
        name: v.string(),
        phone: v.string(),
        address: v.optional(v.string()),
        birthDate: v.string(),
        planKey: v.string(), // 'lowupfront' | 'lowmonthly'
        planTitle: v.string(),
        upfront: v.number(),
        monthly: v.number(),
        months: v.number(),
        totalAmount: v.number(),
        idDocumentStorageId: v.optional(v.string()),
        idDocumentName: v.optional(v.string()),
        signature: v.optional(v.string()),
        consents: v.optional(v.array(v.object({
            id: v.string(),
            title: v.string(),
            agreed: v.boolean(),
            version: v.optional(v.string()),
        }))),
    },
    handler: async (ctx, args) => {
        const now = new Date();
        const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const receiptId = `R-${yyyymmdd}-${randomSuffix}`;
        const timeStr = now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

        const history = [
            {
                title: "렌탈 신청 접수",
                time: timeStr,
                note: "고객 모바일 견적서에서 렌탈 신청 접수 완료",
                actor: "고객",
            }
        ];

        const appId = await ctx.db.insert("rental_applications", {
            quoteId: args.quoteId,
            receiptId,
            name: args.name.trim().normalize("NFC"),
            phone: args.phone,
            address: args.address || "",
            birthDate: args.birthDate,
            planKey: args.planKey,
            planTitle: args.planTitle,
            upfront: args.upfront,
            monthly: args.monthly,
            months: args.months,
            totalAmount: args.totalAmount,
            downPayment: args.upfront,
            monthlyAmount: args.monthly,
            finalBenefit: args.totalAmount,
            balance: Math.max(0, args.totalAmount - args.upfront),
            idDocumentStorageId: args.idDocumentStorageId,
            idDocumentName: args.idDocumentName,
            signature: args.signature,
            consents: args.consents,
            checks: { id: false, signature: false, consent: false },
            history,
            status: "received",
            createdAt: now.toISOString(),
        });

        // If quoteId exists, append note to quote remark
        if (args.quoteId) {
            try {
                const quote = await ctx.db.get(args.quoteId);
                if (quote) {
                    const dateStr = now.toLocaleDateString("ko-KR");
                    const newRemarkLine = `[렌탈신청 ${dateStr}] ${args.planTitle} (초기: ${args.upfront.toLocaleString()}원 / 월: ${args.monthly.toLocaleString()}원 x ${args.months}개월, 접수번호: ${receiptId})`;
                    const updatedRemark = quote.remark ? `${quote.remark}\n${newRemarkLine}` : newRemarkLine;
                    await ctx.db.patch(args.quoteId, { remark: updatedRemark });
                }
            } catch (err) {
                console.error("Failed to append rental remark to quote:", err);
            }
        }

        // Send Discord Notification
        try {
            await ctx.scheduler.runAfter(0, internal.discord.sendNotification, {
                type: 'rental',
                name: args.name,
                phone: args.phone,
                selectedAmount: `${args.planTitle} (초기 ${args.upfront.toLocaleString()}원 / 월 ${args.monthly.toLocaleString()}원)`,
                address: args.address || "정보 없음",
                memo: `접수번호: ${receiptId} · 생년월일: ${args.birthDate}`,
                isDraft: false,
            });
        } catch (err) {
            console.error("Discord notification error:", err);
        }

        return { success: true, receiptId, id: appId };
    },
});

export const updateRentalReview = mutation({
    args: {
        id: v.id("rental_applications"),
        status: v.string(), // received, review, needs_info, screening, confirmed, cancelled
        checks: v.optional(v.object({
            id: v.boolean(),
            signature: v.boolean(),
            consent: v.boolean(),
        })),
        adminMemo: v.optional(v.string()),
        historyNote: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const app = await ctx.db.get(args.id);
        if (!app) throw new Error("Application not found");

        const updateData: any = { status: args.status };
        if (args.checks !== undefined) {
            updateData.checks = args.checks;
        }
        if (args.adminMemo !== undefined) {
            updateData.adminMemo = args.adminMemo;
        }

        const now = new Date();
        const timeStr = now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
        const existingHistory = (app as any).history || [];

        const statusLabels: Record<string, string> = {
            received: '신규 접수',
            review: '서류 확인 중',
            needs_info: '보완 요청',
            screening: '심사 중',
            confirmed: '계약 확정',
            cancelled: '취소',
        };

        const newEvent = {
            title: (statusLabels[args.status] || args.status) + ' 변경',
            time: timeStr,
            note: args.historyNote || args.adminMemo || '검토 상태 변경',
            actor: '운영 담당자',
        };

        updateData.history = [newEvent, ...existingHistory];

        await ctx.db.patch(args.id, updateData);
        return { success: true };
    },
});

export const updateStatus = mutation({
    args: {
        id: v.id("rental_applications"),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        console.log("Updating rental status for:", args.id, "to:", args.status);
        await ctx.db.patch(args.id, { status: args.status });
    },
});

export const getTemplateUrl = query({
    args: { storageId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId as any);
    },
});
