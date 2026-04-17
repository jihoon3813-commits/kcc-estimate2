import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
console.log("Initializing Convex client with URL:", convexUrl);
const convex = new ConvexReactClient(convexUrl);

/**
 * 견적 데이터 저장
 */
export const saveQuote = async (data, file) => {
    let storageId = undefined;

    if (file) {
        try {
            console.log("Starting PDF upload...");
            // 1. Get upload URL
            const postUrl = await convex.mutation(api.quotes.generateUploadUrl);
            console.log("Got upload URL:", postUrl);

            // 2. Upload file
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!result.ok) throw new Error("File upload failed");

            const { storageId: sid } = await result.json();
            storageId = sid;
            console.log("File uploaded successfully, storageId:", storageId);
        } catch (error) {
            console.error("PDF Upload Error:", error);
        }
    }

    const params = {
        date: new Date().toLocaleDateString('en-CA'), // Returns YYYY-MM-DD in local time
        branch: data.branch || "",
        type: data.statusType || "가견적",
        name: data.customerName || "",
        phone: data.customerPhone || "",
        address: data.address || "",
        kccPrice: Number(data.totalSum) || 0,
        finalQuote: Number(data.finalQuote) || 0,
        finalBenefit: Number(data.finalBenefit) || 0,
        discountRate: Number(data.discountRate) || 0,
        extraDiscount: Number(data.extraDiscount) || 0,
        marginAmt: Number(data.marginAmount) || 0,
        marginRate: Number(data.marginRate) || 0,
        sub24: Number(data.subs[24]) || 0,
        sub36: Number(data.subs[36]) || 0,
        sub48: Number(data.subs[48]) || 0,
        sub60: Number(data.subs[60]) || 0,
        items: JSON.stringify(data.items || []),
        storageId: storageId || undefined,
        pdfUrl: "",
        remark: ""
    };

    try {
        console.log("Saving quote to Convex...", params);
        const id = await convex.mutation(api.quotes.saveQuote, params);
        console.log("Quote saved successfully, ID:", id);
        return { success: true, id };
    } catch (error) {
        console.error("Convex Save Error:", error);
        return { success: false, message: error.message };
    }
};

export const getQuote = async (id) => {
    try {
        const quote = await convex.query(api.quotes.getQuote, { id });
        if (!quote) return { success: false, message: "견적 정보를 찾을 수 없습니다." };
        return {
            success: true,
            data: {
                ...quote,
                subs: { 24: quote.sub24, 36: quote.sub36, 48: quote.sub48, 60: quote.sub60 },
                items: JSON.parse(quote.items || "[]")
            }
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const getAdminQuoteList = async () => {
    try {
        const data = await convex.query(api.quotes.listQuotes);
        return { success: true, data: data.map(q => ({ ...q, id: q._id })) };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const updateQuoteRemark = async (params) => {
    try {
        await convex.mutation(api.quotes.updateRemark, { id: params.id, remark: params.remark });
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const updateQuoteItems = async (params) => {
    try {
        await convex.mutation(api.quotes.updateItems, { id: params.id, items: JSON.stringify(params.items) });
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const updateQuoteFinancials = async (params) => {
    try {
        await convex.mutation(api.quotes.updateFinancials, params);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

/**
 * 견적 데이터 조회
 */
export const searchQuote = async (name, phone, statusType) => {
    try {
        const queryArgs = { name, phone };
        if (statusType) queryArgs.statusType = statusType;
        const quote = await convex.query(api.quotes.searchQuote, queryArgs);
        if (!quote) return { success: false, message: "일치하는 견적 정보를 찾을 수 없습니다." };

        const [appliances, banners] = await Promise.all([
            convex.query(api.config.listAppliances),
            convex.query(api.config.listBanners)
        ]);

        const formattedAppliances = { A: [], B: [] };
        appliances.forEach(app => {
            formattedAppliances[app.type].push({
                type: app.type,
                cat: app.category,
                img: app.img,
                name: app.name,
                model: app.model,
                link: app.link
            });
        });

        return {
            success: true,
            data: {
                ...quote,
                subs: { 24: quote.sub24, 36: quote.sub36, 48: quote.sub48, 60: quote.sub60 },
                items: JSON.parse(quote.items || "[]")
            },
            config: {
                appliances: formattedAppliances,
                banners: banners
            }
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
};
/**
 * 렌탈 신청 데이터 및 파일 저장
 */
export const submitRentalApplication = async (customerData, rentalForm, draftId) => {
    try {
        // Collect all files. Some might be already uploaded (storageId), some might be new (File object)
        const uploadedFiles = [];
        const filesToUpload = [];

        if (rentalForm.files) {
            for (const category in rentalForm.files) {
                const files = rentalForm.files[category];
                if (Array.isArray(files)) {
                    for (const f of files) {
                        if (f.storageId) {
                            uploadedFiles.push({ category, name: f.name, storageId: f.storageId });
                        } else if (f instanceof File) {
                            filesToUpload.push({ category, file: f });
                        } else if (f.name && !f.storageId) {
                            // This case shouldn't really happen if we auto-upload, but for safety
                            filesToUpload.push({ category, file: f });
                        }
                    }
                }
            }
        }

        // Upload any remaining files (though they should be uploaded already by auto-save)
        if (filesToUpload.length > 0) {
            console.log(`Uploading ${filesToUpload.length} remaining files...`);
            await Promise.all(filesToUpload.map(async ({ category, file }) => {
                const storageId = await uploadSingleFile(file);
                uploadedFiles.push({ category, name: file.name, storageId });
            }));
        }

        const params = {
            ...(draftId ? { id: draftId } : {}),
            quoteId: customerData._id || undefined,
            name: customerData.name || "",
            phone: customerData.phone || "",
            address: customerData.address || "",
            birthDate: rentalForm.birthDate,
            gender: rentalForm.gender,
            selectedAmount: rentalForm.selectedAmount,
            ownershipType: rentalForm.ownershipType,
            finalBenefit: customerData.finalBenefit || 0,
            downPayment: rentalForm.downPaymentToReport || 0,
            balance: (customerData.finalBenefit || 0) - (rentalForm.downPaymentToReport || 0),
            conversionMode: rentalForm.conversionMode || 'full',
            monthlyAmount: rentalForm.selectedAmount ? (rentalForm.selectedAmount === 11 ? 111000 : rentalForm.selectedAmount === 22 ? 222000 : rentalForm.selectedAmount === 33 ? 333000 : 0) : 0,
            files: uploadedFiles,
            agreements: rentalForm.agreements
        };

        console.log("Submitting final rental application...", params);
        const id = await convex.mutation(api.rentals.submitApplication, params);
        return { success: true, id };
    } catch (error) {
        console.error("Rental Application Error:", error);
        return { success: false, message: error.message };
    }
};

export const uploadSingleFile = async (file) => {
    if (!(file instanceof File)) {
        console.warn("Attempted to upload something that is not a File object:", file);
        return null;
    }
    const postUrl = await convex.mutation(api.rentals.generateUploadUrl);
    const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
    });
    if (!result.ok) throw new Error(`Upload failed for ${file.name}`);
    const { storageId } = await result.json();
    return storageId;
};

export const uploadTemplatePdf = async (file) => {
    try {
        const storageId = await uploadSingleFile(file);
        if(!storageId) throw new Error("업로드에 실패했습니다.");
        const url = await convex.query(api.rentals.getTemplateUrl, { storageId });
        return { success: true, storageId, url };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const getRentalDraft = async (params) => {
    try {
        const draft = await convex.query(api.rentals.getDraft, {
            quoteId: params.quoteId,
            name: params.name,
            phone: params.phone,
            amount: params.amount
        });
        return { success: true, data: draft };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const saveRentalDraft = async (customerData, rentalForm) => {
    try {
        const params = {
            quoteId: customerData._id || undefined,
            name: customerData.name || "",
            phone: customerData.phone || "",
            address: customerData.address || "",
            birthDate: rentalForm.birthDate || "",
            gender: rentalForm.gender || "",
            selectedAmount: rentalForm.selectedAmount || 0,
            ownershipType: rentalForm.ownershipType || "own_own",
            finalBenefit: customerData.finalBenefit || 0,
            downPayment: rentalForm.downPaymentToReport || 0,
            balance: (customerData.finalBenefit || 0) - (rentalForm.downPaymentToReport || 0),
            conversionMode: rentalForm.conversionMode || 'full',
            monthlyAmount: rentalForm.selectedAmount ? (rentalForm.selectedAmount === 11 ? 111000 : rentalForm.selectedAmount === 22 ? 222000 : rentalForm.selectedAmount === 33 ? 333000 : 0) : 0,
            files: (rentalForm.files ? Object.entries(rentalForm.files).flatMap(([cat, files]) => 
                files.filter(f => f.storageId).map(f => ({ category: cat, name: f.name, storageId: f.storageId }))
            ) : []),
            agreements: {
                agree1: rentalForm.agreements?.agree1 || false,
                agree2: rentalForm.agreements?.agree2 || false,
                agree3: rentalForm.agreements?.agree3 || false
            }
        };
        const id = await convex.mutation(api.rentals.saveDraft, params);
        return { success: true, id };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const getRentalApplicationList = async () => {
    try {
        const data = await convex.query(api.rentals.listApplications);
        return { success: true, data };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const getSubscriptionApplicationList = async () => {
    try {
        const data = await convex.query(api.subscriptions.listApplications);
        return { success: true, data };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const updateRentalStatus = async (id, status) => {
    try {
        await convex.mutation(api.rentals.updateStatus, { id, status });
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const updateSubscriptionStatus = async (id, status) => {
    try {
        await convex.mutation(api.subscriptions.updateStatus, { id, status });
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const submitSubscriptionApplication = async (customerData, form, draftId) => {
    try {
        const uploadedFiles = [];
        const filesToUpload = [];

        if (form.files) {
            for (const category in form.files) {
                const files = form.files[category];
                if (Array.isArray(files)) {
                    for (const f of files) {
                        if (f.storageId) {
                            uploadedFiles.push({ category, name: f.name, storageId: f.storageId });
                        } else if (f instanceof File) {
                            filesToUpload.push({ category, file: f });
                        }
                    }
                }
            }
        }

        if (filesToUpload.length > 0) {
            await Promise.all(filesToUpload.map(async ({ category, file }) => {
                const storageId = await uploadSingleFile(file);
                uploadedFiles.push({ category, name: file.name, storageId });
            }));
        }

        const params = {
            ...(draftId ? { id: draftId } : {}),
            quoteId: customerData._id || undefined,
            name: customerData.name || "",
            phone: customerData.phone || "",
            address: customerData.address || "",
            birthDate: form.birthDate,
            gender: form.gender,
            selectedAmount: form.selectedAmount,
            ownershipType: form.ownershipType,
            finalBenefit: customerData.finalBenefit || 0,
            downPayment: form.downPaymentToReport || 0,
            balance: (customerData.finalBenefit || 0) - (form.downPaymentToReport || 0),
            conversionMode: form.conversionMode || 'full',
            monthlyAmount: (form.conversionSubs && form.selectedAmount) ? form.conversionSubs[form.selectedAmount] : 0,
            files: uploadedFiles,
            agreements: { ...form.agreements },
            transferDate: form.transferDate,
            jobCategory: form.jobCategory,
        };

        const id = await convex.mutation(api.subscriptions.submitApplication, params);
        return { success: true, id };
    } catch (error) {
        console.error("Subscription Application Error:", error);
        return { success: false, message: error.message };
    }
};

export const getSubscriptionDraft = async (params) => {
    try {
        const draft = await convex.query(api.subscriptions.getDraft, {
            quoteId: params.quoteId,
            name: params.name,
            phone: params.phone,
            amount: params.amount
        });
        return { success: true, data: draft };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const saveSubscriptionDraft = async (customerData, form) => {
    try {
        const params = {
            quoteId: customerData._id || undefined,
            name: customerData.name || "",
            phone: customerData.phone || "",
            address: customerData.address || "",
            birthDate: form.birthDate || "",
            gender: form.gender || "",
            selectedAmount: form.selectedAmount || 0,
            ownershipType: form.ownershipType || "own_own",
            finalBenefit: customerData.finalBenefit || 0,
            downPayment: form.downPaymentToReport || 0,
            balance: (customerData.finalBenefit || 0) - (form.downPaymentToReport || 0),
            conversionMode: form.conversionMode || 'full',
            monthlyAmount: (form.conversionSubs && form.selectedAmount) ? form.conversionSubs[form.selectedAmount] : 0,
            files: (form.files ? Object.entries(form.files).flatMap(([cat, files]) => 
                files.filter(f => f.storageId).map(f => ({ category: cat, name: f.name, storageId: f.storageId }))
            ) : []),
            agreements: {
                agree1: form.agreements?.agree1 || false,
                agree2: form.agreements?.agree2 || false,
                agree3: form.agreements?.agree3 || false
            },
            transferDate: form.transferDate,
            jobCategory: form.jobCategory,
        };
        const id = await convex.mutation(api.subscriptions.saveDraft, params);
        return { success: true, id };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const getTemplatePdfUrl = async (storageId) => {
    try {
        const url = await convex.query(api.rentals.getTemplateUrl, { storageId });
        return { success: true, url };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

// --- 그린리모델링 API 추가 ---

export const getGreenDraft = async (params) => {
    try {
        const draft = await convex.query(api.greenRemodeling.getDraft, {
            quoteId: params.quoteId,
            name: params.name,
            phone: params.phone,
            amount: params.amount,
            birthDate: params.birthDate
        });
        return { success: true, data: draft };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const saveGreenDraft = async (customerData, form) => {
    try {
        const params = {
            quoteId: customerData._id || undefined,
            name: customerData.name || "",
            phone: customerData.phone || "",
            address: customerData.address || "",
            birthDate: form.birthDate || "",
            gender: form.gender || "",
            selectedAmount: form.greenAmount || 0,
            downPayment: form.greenDownPayment || 0,
            balance: form.greenBalance || 0,
            isFullApplication: form.isFullGreen || false,
            targetCategory: form.targetCategory || "해당없음",
            loanMethod: form.loanMethod || "은행대출",
            startDate: form.startDate || "",
            endDate: form.endDate || "",
            files: (form.files ? Object.entries(form.files).flatMap(([cat, files]) => 
                files.filter(f => f.storageId).map(f => ({ category: cat, name: f.name, storageId: f.storageId }))
            ) : []),
            agreements: {
                agree1: form.agreements?.agree1 || false
            },
            signature: form.signature || undefined,
            consentSignature: form.consentSignature || undefined,
            contractSignature: form.contractSignature || undefined
        };
        const id = await convex.mutation(api.greenRemodeling.saveDraft, params);
        return { success: true, id };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const submitGreenApplication = async (customerData, form, draftId) => {
    try {
        const uploadedFiles = [];
        const filesToUpload = [];

        if (form.files) {
            for (const category in form.files) {
                const files = form.files[category];
                if (Array.isArray(files)) {
                    for (const f of files) {
                        if (f.storageId) {
                            uploadedFiles.push({ category, name: f.name, storageId: f.storageId });
                        } else if (f instanceof File) {
                            filesToUpload.push({ category, file: f });
                        }
                    }
                }
            }
        }

        if (filesToUpload.length > 0) {
            await Promise.all(filesToUpload.map(async ({ category, file }) => {
                const storageId = await uploadSingleFile(file);
                uploadedFiles.push({ category, name: file.name, storageId });
            }));
        }

        const params = {
            ...(draftId ? { id: draftId } : {}),
            quoteId: customerData._id || undefined,
            name: customerData.name || "",
            phone: customerData.phone || "",
            address: customerData.address || "",
            birthDate: form.birthDate,
            gender: form.gender,
            selectedAmount: form.greenAmount,
            downPayment: form.greenDownPayment,
            balance: form.greenBalance,
            isFullApplication: form.isFullGreen,
            targetCategory: form.targetCategory,
            loanMethod: form.loanMethod,
            startDate: form.startDate,
            endDate: form.endDate,
            files: uploadedFiles,
            signature: form.signature || undefined,
            consentSignature: form.consentSignature || undefined,
            contractSignature: form.contractSignature || undefined,
            agreements: {
                agree1: form.agreements.agree1
            }
        };

        const id = await convex.mutation(api.greenRemodeling.submitApplication, params);
        return { success: true, id };
    } catch (error) {
        console.error("Green Remodeling Application Error:", error);
        return { success: false, message: error.message };
    }
};

export const getGreenApplicationList = async () => {
    try {
        const data = await convex.query(api.greenRemodeling.listApplications);
        return { success: true, data };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const updateGreenStatus = async (id, status) => {
    try {
        await convex.mutation(api.greenRemodeling.updateStatus, { id, status });
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const getGreenLatestApplication = async (params) => {
    try {
        const data = await convex.query(api.greenRemodeling.getLatestApplication, {
            quoteId: params.quoteId,
            name: params.name,
            phone: params.phone,
            birthDate: params.birthDate,
        });
        return { success: true, data };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const issueGreenFile = async (id, storageId, type) => {
    try {
        await convex.mutation(api.greenRemodeling.issueFile, { id, storageId, type });
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const submitGreenPostApplication = async (params) => {
    try {
        await convex.mutation(api.greenRemodeling.submitPostApplication, params);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

/**
 * PDF 템플릿 API
 */
export const savePdfTemplate = async (data) => {
    try {
        const mutationArgs = {
            name: data.name,
            type: data.type,
            storageId: data.storageId,
            fields: data.fields || []
        };
        if (data._id) {
            mutationArgs.id = data._id;
        }
        const id = await convex.mutation(api.templates.saveTemplate, mutationArgs);
        return { success: true, id };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const getTemplateList = async () => {
    try {
        const data = await convex.query(api.templates.listTemplates);
        return { success: true, data };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const deletePdfTemplate = async (id) => {
    try {
        await convex.mutation(api.templates.deleteTemplate, { id });
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

export const getLatestTemplateByType = async (type, name) => {
    try {
        const data = await convex.query(api.templates.getLatestTemplateByType, { type, name });
        return { success: true, data };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

