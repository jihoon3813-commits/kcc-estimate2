import React, { useState, useRef } from 'react';
import { Search, User, Phone, MapPin, Download, Gift, ShieldCheck, ChevronRight, MessageCircle, ExternalLink, X, Calendar, CheckCircle2, CheckCircle, Loader2, Upload, Calculator, ArrowRightLeft, Wallet, Clock, Sparkles } from 'lucide-react';
import { searchQuote, submitRentalApplication, submitSubscriptionApplication, getRentalDraft, saveRentalDraft, getSubscriptionDraft, saveSubscriptionDraft, uploadSingleFile, getTemplatePdfUrl } from '../lib/api';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import SignatureCanvas from 'react-signature-canvas';
// Vite/CJS 호환성 대응
const SignaturePad = SignatureCanvas.default || SignatureCanvas;


const CustomerPage = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [data, setData] = useState(null);
    const [banners, setBanners] = useState([]);
    const [modalType, setModalType] = useState(null); // 'A' or 'B'
    const [appliances, setAppliances] = useState({ A: [], B: [] });
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveToast, setShowSaveToast] = useState(false);
    const [saveMessage, setSaveMessage] = useState("[임시저장 완료]");
    const [draftId, setDraftId] = useState(null);

    const [searchForm, setSearchForm] = useState({ name: '', phone: '' });

    const [statusType, setStatusType] = useState('가견적'); // Default to final quote
    const [showContactMenu, setShowContactMenu] = useState(false);
    
    // Signature
    const sigCanvas = useRef(null);
    const [signatureImg, setSignatureImg] = useState(null);

    // === MODAL & ALERT STATE ===
    const [toast, setToast] = useState({ show: false, message: '' });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '확인',
        cancelText: '취소',
        onConfirm: () => { },
        showCancel: true,
        type: 'confirm' // 'confirm' or 'alert'
    });

    const showAlert = (message, title = '알림') => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            confirmText: '확인',
            showCancel: false,
            type: 'alert',
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    const showConfirm = (message, onConfirm, title = '확인') => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            confirmText: '확인',
            cancelText: '취소',
            showCancel: true,
            type: 'confirm',
            onConfirm: () => {
                onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // === CASH / BALANCE STATE ===
    const [downPayment, setDownPayment] = useState(0);
    const [balance, setBalance] = useState(0);
    const [conversionMode, setConversionMode] = useState(null); // 'full' | 'balance'
    const [calculatedSubs, setCalculatedSubs] = useState(null);
    const [selectedConversionMonth, setSelectedConversionMonth] = useState(60);

    // Initialize down payment and balance when data is loaded
    React.useEffect(() => {
        if (data?.finalBenefit) {
            const half = Math.floor((data.finalBenefit * 0.5) / 10000) * 10000;
            setDownPayment(half);
            setBalance(data.finalBenefit - half);
        }
    }, [data?.finalBenefit]);

    // Handle initial custom subs for full or balance
    const handleConversion = (mode) => {
        setConversionMode(mode);
        const amount = mode === 'full' ? data.finalBenefit : balance;
        
        const annualRate = 0.1;
        const subs = {};
        for (const m of [24, 36, 48, 60]) {
            const r = annualRate / 12;
            const pmt = (amount * r) / (1 - Math.pow(1 + r, -m));
            subs[m] = Math.floor(pmt / 10) * 10;
        }
        setCalculatedSubs(subs);
    };

    // === RENTAL APPLICATION STATE ===
    const [isRentalMode, setIsRentalMode] = useState(false);
    const [applicationType, setApplicationType] = useState(null); // 'rental' | 'subscription'
    const [rentalStep, setRentalStep] = useState(1);
    const [rentalForm, setRentalForm] = useState({
        birthDate: '',
        gender: '', // 'male' | 'female'
        selectedAmount: null, // 11, 22, 33
        ownershipType: 'own_own', // 'own_own', 'move_own', 'family_own'
        files: {
            registry: [], // Now will store { name: string, storageId: string } items
            contract: [],
            family: [],
            id_card: [],
            bank_book: []
        },
        isConversion: false,
        conversionSubs: null,
        conversionMode: null, // 'full' | 'balance'
        downPaymentToReport: 0,
        agreements: {
            agree1: false,
            agree2: false,
            agree3: false
        },
        transferDate: '',
        jobCategory: ''
    });

    // Lock body scroll when modal is open

    React.useEffect(() => {
        if (modalType) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        };
    }, [modalType]);

    // Helper for phone formatting
    const formatPhoneNumber = (value) => {
        if (!value) return value;
        const raw = value.replace(/[^\d]/g, '');
        if (raw.length < 4) return raw;
        if (raw.length < 8) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
        return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
    };

    const handlePhoneChange = (e) => {
        const formatted = formatPhoneNumber(e.target.value);
        setSearchForm(prev => ({ ...prev, phone: formatted }));
    };

    const executeSearch = async (nameVal, phoneVal, targetType) => {
        setLoading(true);
        try {
            // Updated: Search with statusType if provided
            const result = await searchQuote(nameVal, phoneVal, targetType);

            if (result.success) {
                setData(result.data);
                // Update tab to match the found quote type
                if (result.data.type) {
                    setStatusType(result.data.type);
                }
                if (result.config?.banners) {
                    setBanners(result.config.banners);
                }

                if (result.config?.appliances) {
                    setAppliances(result.config.appliances);
                } else {
                    setAppliances({
                        A: [
                            { type: 'A', cat: 'TV', img: 'https://cdn.imweb.me/thumbnail/20260109/d7e86b0ff1338.jpg', name: 'LG 울트라 HD TV 65인치', model: '65UT931C', link: '#' },
                            { type: 'A', cat: 'TV', img: 'https://cdn.imweb.me/thumbnail/20260109/1c793fead763f.jpg', name: 'LG 스탠바이미2 27인치', model: '27LX6TPGA', link: '#' },
                        ],
                        B: [
                            { type: 'B', cat: 'TV', img: 'https://cdn.imweb.me/thumbnail/20260109/9622343b2f19a.jpg', name: 'LG 울트라 HD TV 75인치', model: '75UT931C', link: '#' },
                        ]
                    });
                }
                setIsLoggedIn(true);
            } else {
                // If search with type failed, try searching without type as fallback
                const fallbackResult = await searchQuote(nameVal, phoneVal);
                if (fallbackResult.success) {
                    setData(fallbackResult.data);
                    if (fallbackResult.data.type) setStatusType(fallbackResult.data.type);
                    if (fallbackResult.config?.banners) setBanners(fallbackResult.config.banners);
                    if (fallbackResult.config?.appliances) setAppliances(fallbackResult.config.appliances);
                    setIsLoggedIn(true);
                } else {
                    alert(result.message || "조회 실패: 정보를 다시 확인해주세요.");
                }
            }
        } catch (error) {
            console.error("Search error:", error);
            alert("서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setLoading(false);
        }
    };

    // Auto-Search Effect
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const n = params.get('n');
        const p = params.get('p');
        const t = params.get('t'); // '가견적' or '최종견적'

        if (n && p) {
            const nameDec = decodeURIComponent(n);
            const phoneDec = decodeURIComponent(p);
            const typeDec = t ? decodeURIComponent(t) : null;

            setSearchForm({ name: nameDec, phone: phoneDec });
            if (typeDec) {
                setStatusType(typeDec);
                executeSearch(nameDec, phoneDec, typeDec);
            } else {
                executeSearch(nameDec, phoneDec);
            }
        }
    }, []);

    // Load Draft
    React.useEffect(() => {
        if (isRentalMode && data) {
            const loadDraft = async () => {
                const apiFunc = applicationType === 'subscription' ? getSubscriptionDraft : getRentalDraft;
                const res = await apiFunc({
                    quoteId: data._id,
                    name: data.name,
                    phone: data.phone || searchForm.phone
                });

                if (res.success && res.data) {
                    const draft = res.data;
                    setDraftId(draft._id);
                    
                    // Construct files structure from array
                    const filesObj = {
                        registry: [], contract: [], family: [], id_card: [], bank_book: []
                    };
                    if (draft.files) {
                        draft.files.forEach(f => {
                            if (filesObj[f.category]) filesObj[f.category].push(f);
                        });
                    }

                    setRentalForm(prev => {
                        const updated = {
                            ...prev,
                            birthDate: draft.birthDate || prev.birthDate || '',
                            gender: draft.gender || prev.gender || '',
                            selectedAmount: draft.selectedAmount || prev.selectedAmount || null,
                            ownershipType: draft.ownershipType || prev.ownershipType || 'own_own',
                            files: filesObj,
                            agreements: draft.agreements || prev.agreements || { agree1: false, agree2: false, agree3: false },
                            transferDate: draft.transferDate || prev.transferDate || '',
                            jobCategory: draft.jobCategory || prev.jobCategory || '',
                            // Restore conversion info if exists in draft
                            conversionMode: draft.conversionMode || prev.conversionMode,
                            downPaymentToReport: draft.downPayment !== undefined ? draft.downPayment : prev.downPaymentToReport,
                            isConversion: draft.conversionMode ? true : prev.isConversion
                        };

                        // If we have conversionMode but no conversionSubs yet (e.g. from draft load), recalculate
                        if (updated.isConversion && !updated.conversionSubs) {
                            const isFull = updated.conversionMode === 'full' || updated.conversionMode === '전액구독';
                            const amount = isFull ? data.finalBenefit : (data.finalBenefit - (updated.downPaymentToReport || 0));
                            const annualRate = 0.1;
                            const subs = {};
                            for (const m of [24, 36, 48, 60]) {
                                const r = annualRate / 12;
                                const pmt = (amount * r) / (1 - Math.pow(1 + r, -m));
                                subs[m] = Math.floor(pmt / 10) * 10;
                            }
                            updated.conversionSubs = subs;
                        }

                        return updated;
                    });
                }
            };
            loadDraft();
        } else if (!isRentalMode) {
            // Reset draft ID when closing
            setDraftId(null);
        }
    }, [isRentalMode, applicationType, data]);

    // Auto-save debounced fields
    React.useEffect(() => {
        if (!isRentalMode || !data) return;

        const timer = setTimeout(async () => {
            const apiFunc = applicationType === 'subscription' ? saveSubscriptionDraft : saveRentalDraft;
            setIsSaving(true);
            const res = await apiFunc(data, rentalForm);
            setIsSaving(false);
            if (res.success) {
                setDraftId(res.id);
                setSaveMessage("[정보 저장 완료]");
                setShowSaveToast(true);
                setTimeout(() => setShowSaveToast(false), 2000);
            } else {
                console.error("Auto-save failed:", res.message);
            }
        }, 3000); // 3 seconds debounce

        return () => clearTimeout(timer);
    }, [rentalForm.birthDate, rentalForm.gender, rentalForm.selectedAmount, rentalForm.ownershipType, rentalForm.agreements, rentalForm.transferDate, rentalForm.jobCategory]);

    const handleSearch = (e) => {
        e.preventDefault();
        executeSearch(searchForm.name, searchForm.phone, statusType);
    };

    const formatKrw = (val) => new Intl.NumberFormat('ko-KR').format(val || 0) + '원';

    const calculatePackage = (basePrice, rentalMonthly, subtractAmount) => {
        const amount = typeof basePrice === 'string' ? Number(basePrice.replace(/,/g, '')) : Number(basePrice);
        const advancePayment = (amount || 0) - (subtractAmount || 0);
        return advancePayment < 0 ? "해당없음" : formatKrw(advancePayment);
    };

    const handleFileUpload = async (type, e) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesToAdd = Array.from(e.target.files);
            setIsSaving(true);
            
            try {
                const uploadedResults = await Promise.all(filesToAdd.map(async (file) => {
                    const storageId = await uploadSingleFile(file);
                    return { name: file.name, storageId };
                }));

                const updatedForm = {
                    ...rentalForm,
                    files: {
                        ...rentalForm.files,
                        [type]: [...(rentalForm.files[type] || []), ...uploadedResults]
                    }
                };

                setRentalForm(updatedForm);

                // Immediate save draft after file upload
                const apiFunc = applicationType === 'subscription' ? saveSubscriptionDraft : saveRentalDraft;
                const res = await apiFunc(data, updatedForm);
                if (res.success) {
                    setDraftId(res.id);
                    setSaveMessage("[첨부파일 저장완료]");
                    setShowSaveToast(true);
                    setTimeout(() => setShowSaveToast(false), 4000);
                } else {
                    alert("정보 저장 중 오류가 발생했습니다: " + res.message);
                }
            } catch (err) {
                console.error("File auto-upload error:", err);
                alert("파일 업로드 중 오류가 발생했습니다.");
            } finally {
                setIsSaving(false);
            }
        }
    };

    const removeFile = async (type, index) => {
        const updatedFiles = rentalForm.files[type].filter((_, i) => i !== index);
        const updatedForm = {
            ...rentalForm,
            files: {
                ...rentalForm.files,
                [type]: updatedFiles
            }
        };
        setRentalForm(updatedForm);

        // Save draft after removal
        const apiFunc = applicationType === 'subscription' ? saveSubscriptionDraft : saveRentalDraft;
        await apiFunc(data, updatedForm);
    };

    const generateSignedPdf = async () => {
        if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
            alert("하단 [서명/날인] 영역에 전자서명을 진행해주세요.");
            return null;
        }
        try {
            let signatureDataUrl;
            try {
                signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
            } catch (sigErr) {
                console.warn("getTrimmedCanvas failed, falling back to getCanvas:", sigErr);
                signatureDataUrl = sigCanvas.current.getCanvas().toDataURL("image/png");
            }
            // Create a new PDFDocument
            const pdfDoc = await PDFDocument.create();
            pdfDoc.registerFontkit(fontkit.default || fontkit);

            // Fetch font
            const fontRes = await fetch(`${import.meta.env.BASE_URL}fonts/NanumGothic.ttf`);
            if (!fontRes.ok) {
                alert(`폰트 파일을 불러오는데 실패했습니다: ${fontRes.status}`);
                return null;
            }
            const fontBytes = await fontRes.arrayBuffer();
            const customFont = await pdfDoc.embedFont(fontBytes);

            // Embed signature image
            const sigImgBytes = await fetch(signatureDataUrl).then(r => r.arrayBuffer());
            const sigImage = await pdfDoc.embedPng(sigImgBytes);

            const pagesContent = [
                {
                    title: "개인(신용)정보 수집 이용 동의서",
                    sections: [
                        { text: "(주)비에스온 귀하", bold: true, size: 11 },
                        { text: "" },
                        { text: "귀사와의 상거래와 관련하여 귀사가 본인의 개인(신용)정보를 수집·이용하고자 하는 경우에는 「개인 정보" },
                        { text: "보호법」 제15조 및 제22조, 「신용정보의 이용 및 보호에 관한 법률」 제32조, 제33조 및 제34조에 따라" },
                        { text: "동의를 얻어야 합니다. 이에 본인은 귀사가 아래의 내용과 같이 본인의 개인(신용)정보를 수집·이용하는데" },
                        { text: "동의합니다." },
                        { text: "" },
                        { text: "1. 개인(신용)정보의 필수적 수집 · 이용에 관한 사항", bold: true, size: 11 },
                        { text: "" },
                        { text: "1 개인(신용)정보의 수집 · 이용 목적", bold: true },
                        { text: "• 상거래 관계의 설정·이행·유지·관리, 법령상 의무이행, 분쟁처리, 민원처리, 본인여부확인 등" },
                        { text: "2 수집·이용할 개인(신용)정보의 내용", bold: true },
                        { text: "• 개인식별정보 : 성명, 주소, 연락처, E-mail, 출생등록지, 성별, 국적, 본인인증정보, 기타 식별정보 등", color: rgb(0.9, 0.1, 0.1) },
                        { text: "• 기타 계약의 설정·이행·유지·관리 등과 관련하여 본인이 제공한 정보 등", color: rgb(0.9, 0.1, 0.1) },
                        { text: "3 개인(신용)정보의 보유 및 이용기간", bold: true },
                        { text: "• 동의일로부터 개인(신용)정보의 수집·이용 목적을 달성할 때까지" },
                        { text: "• 다만, 관련법규에 별도 규정이 있는 경우 그 기간을 따름" },
                        { text: "※ 귀하는 동의를 거부할 권리가 있으나, 동의하지 않는 경우 계약의 설정·이행·유지·관리 등이 불가능할" },
                        { text: "  수 있음을 알려드립니다." },
                        { text: "" },
                        { text: "2. 개인(신용)정보의 선택적 수집 · 이용에 관한 사항 (동의함 [V]  동의하지 않음 [  ])", bold: true, size: 11 },
                        { text: "" },
                        { text: "1 개인(신용)정보의 수집 · 이용 목적", bold: true },
                        { text: "• 고객 편의제공, 상품·서비스 안내 및 이용권유, 마케팅 활동, 시장조사 등", color: rgb(0.9, 0.1, 0.1) },
                        { text: "2 수집·이용할 개인(신용)정보의 내용", bold: true },
                        { text: "• 상기 이용목적 달성을 위하여 필요한 정보 (개인식별정보, 신용거래정보 등)", color: rgb(0.9, 0.1, 0.1) },
                        { text: "• 기타 계약의 설정·이행·유지·관리 등과 관련하여 본인이 제공한 정보 등", color: rgb(0.9, 0.1, 0.1) },
                        { text: "3 개인(신용)정보의 보유 및 이용기간", bold: true },
                        { text: "• 동의일로부터 개인(신용)정보의 수집·이용 목적을 달성할 때까지" },
                        { text: "• 다만, 관련법규에 별도 규정이 있는 경우 그 기간을 따름" },
                        { text: "※ 귀하는 동의를 거부할 권리가 있으나, 동의하지 않는 경우 관련 편의제공(사은품, 할인쿠폰 제공 등에" },
                        { text: "  일부 제한이 있을 수 있습니다." },
                        { text: "※ 동의한 경우에도 귀하는 동의를 철회하거나 마케팅 목적으로 귀하에게 연락하는 것을 중지하도록" },
                        { text: "  요청할 수 있습니다." },
                    ]
                },
                {
                    title: "개인(신용)정보의 조회 동의서",
                    sections: [
                        { text: "(주)비에스온 귀하", bold: true, size: 11 },
                        { text: "" },
                        { text: "본인은 귀사가 「신용정보의 이용 및 보호에 관한 법률」 제32조 제2항에 따라 아래와 같은 내용으로" },
                        { text: "신용조회회사, 신용정보집중기관 등으로부터 본인의 개인(신용)정보를 조회하는 것에 동의합니다." },
                        { text: "" },
                        { text: "1. 조회 대상 기관", bold: true, size: 11 },
                        { text: "• 종합신용정보집중기관 : 한국신용정보원, 여신금융협회 등" },
                        { text: "• 신용조회회사 : 코리아크레딧뷰로(주), NICE평가정보(주)" },
                        { text: "2. 조회할 개인(신용)정보", bold: true, size: 11 },
                        { text: "• 개인식별정보 : 성명, 주소, 연락처(휴대폰 등), E-mail, 성별, 국적, 본인인증 및 식별정보 등" },
                        { text: "• 신용거래정보 : 대출, 보증, 담보제공, 당좌거래, 신용카드, 할부금융과 관련한 금융거래 등," },
                        { text: "  상거래와 관련하여 그 거래의 종류, 기간, 금액 및 한도 등에 관한 사항" },
                        { text: "• 신용도판단정보 : 연체, 부도, 대위변제, 대지급, 신용질서 문란행위와 관련된 금액 및 발생 · 해소의" },
                        { text: "  시기 등에 관한 사항" },
                        { text: "• 신용능력정보 : 직업, 재산, 채무, 소득의 총액, 납세실적 등 신용거래능력을 판단할 수 있는 정보" },
                        { text: "• 공공기관정보 : 개인회생, 파산, 면책 등에 관한 신청 및 법원의 결정 관련정보, 채무불이행자명부" },
                        { text: "  등재·말소 결정, 체납정보, 신용회복관련정보 등" },
                        { text: "• 신용평가정보 : 신용등급, 신용평점 등" },
                        { text: "• 기타 본인의 신용을 판단할 수 있는 정보 등" },
                        { text: "3. 조회목적", bold: true, size: 11 },
                        { text: "• 상거래 관계의 설정·이행·유지·관리, 법령상 의무이행, 분쟁처리, 민원처리, 본인여부확인 등" },
                        { text: "4. 조회동의 효력기간", bold: true, size: 11 },
                        { text: "• 동의일로부터 당해 계약의 종료일(예 : 기간만기, 계약해지 등) 또는 동의철회 시 까지 동의의" },
                        { text: "  효력이 유지 됨" },
                        { text: "• 다만, 관련법규에 별도 규정이 있는 경우 그 기간을 따르며, 귀하가 신청한 계약이 체결되지 아니한" },
                        { text: "  경우에는 그 시점부터 동의의 효력은 소멸합니다." },
                        { text: "5. 조회자의 개인(신용)정보의 보유 및 이용기간", bold: true, size: 11 },
                        { text: "• 개인(신용)정보를 제공받는 날로부터 조회목적을 달성할 때까지" },
                        { text: "• 다만, 관련법규에 별도 규정이 있는 경우 그 기간을 따름" },
                        { text: "" },
                        { text: "※ 귀하는 동의를 거부할 권리가 있으나, 동의하지 않는 경우 계약의 설정·이행·유지·관리 등이 불가능할" },
                        { text: "  수 있음을 알려드립니다." },
                        { text: "※ 신용조회기록은 무등급자에 대한 신용등급산정 이외에는 신용등급에 영향을 미치지 않습니다." }
                    ]
                },
                {
                    title: "개인(신용)정보 제공 동의서 [1/2]",
                    hideSignature: true,
                    sections: [
                        { text: "(주)비에스온 귀하", bold: true, size: 11 },
                        { text: "" },
                        { text: "귀사와의 상거래와 관련하여 귀사가 본인의 개인(신용)정보를 「개인정보 보호법」 제17조 및 제22조," },
                        { text: "「신용정보의 이용 및 보호에 관한 법률」 제32조, 제33조 및 제34조에 따라 제3자에게 제공할 경우" },
                        { text: "본인의 동의를 얻어야 합니다. 이에 본인은 귀사가 본인의 개인(신용)정보를 아래와 같이 제3자에게" },
                        { text: "제공하는데 동의합니다." },
                        { text: "" },
                        { text: "1. 개인(신용)정보의 필수적 제공에 관한 사항", bold: true, size: 11 },
                        { text: "" },
                        { text: "(1) 신용정보집중기관 및 신용조회회사에 개인(신용)정보 제공", bold: true },
                        { text: "1 개인(신용)정보를 제공받는 자", bold: true },
                        { text: "• 종합신용정보집중기관 : 한국신용정보원, 여신금융협회 등", color: rgb(0.9, 0.1, 0.1) },
                        { text: "• 신용조회회사 : 코리아크레딧뷰로(주), NICE평가정보(주)" },
                        { text: "2 제공받는 자의 이용 목적", bold: true },
                        { text: "• 신용정보의 집중·관리 및 활용 등 신용정보집중기관의 업무" },
                        { text: "• 본인의 신용판단 자료 및 공공기관 정책자료로 활용" },
                        { text: "• 신용평가, 실명확인 등 신용조회회사의 업무" },
                        { text: "3 제공할 개인(신용)정보의 내용", bold: true },
                        { text: "• 개인식별정보 : 성명, 주소, 연락처(휴대폰 등), E-mail, 성별, 국적, 본인인증 및 식별정보 등" },
                        { text: "• 기타 본인의 신용을 판단할 수 있는 정보 등" },
                        { text: "4 제공받는 자의 개인(신용)정보 보유 및 이용기간", bold: true },
                        { text: "• 개인(신용)정보를 제공받는 자의 이용목적을 달성할 때까지" },
                        { text: "• 다만, 관련법규에 별도 규정이 있는 경우 그 기간을 따름" },
                        { text: "" },
                        { text: "(2) 거래목적 달성을 위한 개인(신용)정보 제공", bold: true },
                        { text: "1 개인(신용)정보를 제공받는 자", bold: true },
                        { text: "• 계약 이행에 필요한 업무를 위탁받은 자 및 공동사업자 등", color: rgb(0.9, 0.1, 0.1) },
                        { text: "• 부가/제휴서비스를 제공하기 위해 필요한 부가/제휴서비스 업체 등", color: rgb(0.9, 0.1, 0.1) },
                        { text: "※ 수탁업체·제휴업체의 현황 및 변경내용은 당사의 인터넷 홈페이지를 통해 안내해 드립니다.", color: rgb(0.9, 0.1, 0.1) },
                        { text: "2 제공받는 자의 이용목적", bold: true },
                        { text: "• 상거래의 설정·이행·유지·관리, 금융사고 조사, 법령상 의무이행, 분쟁해결, 범죄의 고소·고발,", color: rgb(0.9, 0.1, 0.1) },
                        { text: "  대금청구(SMS제공포함) 및 채권추심, 부가/제휴서비스 제공 및 각종 포인트제공·정산 등", color: rgb(0.9, 0.1, 0.1) },
                        { text: "3 제공할 개인(신용)정보의 내용", bold: true },
                        { text: "• 개인식별정보 : 성명, 주소, 연락처(휴대폰 등), E-mail, 성별, 국적, 본인인증 및 식별정보 등" },
                        { text: "• 기타 본인의 신용을 판단할 수 있는 정보 등" }
                    ]
                },
                {
                    title: "개인(신용)정보 제공 동의서 [2/2]",
                    sections: [
                        { text: "4 제공받는 자의 개인(신용)정보 보유 및 이용기간", bold: true },
                        { text: "• 개인(신용)정보를 제공받는 자의 이용목적을 달성할 때까지" },
                        { text: "• 다만, 관련법규에 별도 규정이 있는 경우 그 기간을 따름" },
                        { text: "※ 귀하는 동의를 거부할 권리가 있으나, 동의하지 않는 경우 계약의 설정·이행·유지·관리 등이 불가능할" },
                        { text: "  수 있음을 알려드립니다." },
                        { text: "" },
                        { text: "2. 개인(신용)정보의 선택적 제공에 관한 사항 (동의함 [V]  동의하지 않음 [  ])", bold: true, size: 11 },
                        { text: "" },
                        { text: "1 개인(신용)정보를 제공받는 자", bold: true },
                        { text: "• 업체명 (이용목적과 관련한 업무를 위탁받은 자)", color: rgb(0.9, 0.1, 0.1) },
                        { text: "※ 수탁업체·제휴업체의 현황 및 변경내용은 당사의 인터넷 홈페이지를 통해 안내해 드립니다.", color: rgb(0.9, 0.1, 0.1) },
                        { text: "2 제공받는 자의 이용목적", bold: true },
                        { text: "• 고객 편의제공, 이용권유, 상품·서비스 안내 및 이용권유, 마케팅 활동, 시장조사 등", color: rgb(0.9, 0.1, 0.1) },
                        { text: "3 제공할 개인(신용)정보의 내용", bold: true },
                        { text: "• 상기 이용목적 달성을 위하여 필요한 정보 (개인식별정보, 신용거래정보 등)" },
                        { text: "4 제공받는 자의 개인(신용)정보 보유 및 이용기간", bold: true },
                        { text: "• 개인(신용)정보를 제공받는 자의 수집·이용 목적을 달성할 때까지" },
                        { text: "• 다만, 관련법규에 별도 규정이 있는 경우 그 기간을 따름" },
                        { text: "※ 귀하는 동의를 거부할 권리가 있으나, 동의하지 않는 경우 관련 편의제공(사은품, 할인쿠폰 제공 등에" },
                        { text: "  일부 제한이 있을 수 있습니다." },
                        { text: "※ 동의한 경우에도 귀하는 동의를 철회하거나 마케팅 목적으로 귀하에게 연락하는 것을 중지하도록" },
                        { text: "  요청할 수 있습니다." }
                    ]
                }
            ];

            const dateObj = new Date();
            const curYear = String(dateObj.getFullYear());
            const curMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
            const curDate = String(dateObj.getDate()).padStart(2, '0');
            const cleanBirth = rentalForm.birthDate ? rentalForm.birthDate.replace(/-/g, '.') : "";
            
            // 연락처 로드 시 searchForm 활용 (못 불러오는 문제 해결)
            const customerPhone = searchForm.phone || data?.contact || rentalForm.phone || "";

            const drawAgreementPage = (pageContent) => {
                const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
                const { width, height } = page.getSize();
                
                // Draw Title Box
                page.drawRectangle({
                    x: 40, y: height - 100, width: width - 80, height: 40,
                    color: rgb(0.95, 0.95, 0.95),
                    borderColor: rgb(0, 0, 0),
                    borderWidth: 1,
                });
                
                const titleWidth = pageContent.title.length * 8; // approximate width
                // Title Center & Bold (두 번 그려 굵게 표현)
                page.drawText(pageContent.title, { x: width / 2 - titleWidth, y: height - 85, size: 16, font: customFont, color: rgb(0, 0, 0) });
                page.drawText(pageContent.title, { x: width / 2 - titleWidth + 0.3, y: height - 85, size: 16, font: customFont, color: rgb(0, 0, 0) });
                
                // Draw Main Border Box
                page.drawRectangle({
                    x: 40, y: 150, width: width - 80, height: height - 250,
                    borderColor: rgb(0, 0, 0),
                    borderWidth: 1,
                });
                
                // Draw Sections inside
                let currentY = height - 125;
                pageContent.sections.forEach(item => {
                    if (item.text) {
                        const fontSize = item.size || 10;
                        page.drawText(item.text, {
                            x: 55, y: currentY, size: fontSize, font: customFont, color: item.color || rgb(0.1, 0.1, 0.1)
                        });
                        if (item.bold) {
                            page.drawText(item.text, {
                                x: 55 + 0.3, y: currentY, size: fontSize, font: customFont, color: item.color || rgb(0.1, 0.1, 0.1)
                            });
                        }
                    }
                    currentY -= 16; // Increased line height to 16 for better readability and spacing
                });
                
                // Signature Box below
                if (!pageContent.hideSignature) {
                    const boxY = 40;
                    
                    page.drawRectangle({
                        x: 40, y: boxY, width: width - 80, height: 100,
                        borderColor: rgb(0, 0, 0),
                        borderWidth: 1,
                    });

                    page.drawText("상기 내용이 변동하는 경우 당사의 인터넷 홈페이지 게시 등을 통해 그 내용을 공시합니다.", {
                        x: 70, y: boxY + 75, size: 10, font: customFont, color: rgb(0.9, 0.1, 0.1)
                    });

                    page.drawText(`${curYear} 년   ${curMonth} 월   ${curDate} 일`, { x: 80, y: boxY + 45, size: 12, font: customFont });
                    
                    page.drawText(`본인 성명 :  ${data.name || ""}`, { x: 260, y: boxY + 50, size: 10, font: customFont });
                    page.drawText(`(서명/날인)`, { x: 420, y: boxY + 50, size: 10, font: customFont });
                    page.drawImage(sigImage, { x: 480, y: boxY + 40, width: 45, height: 22 });
                    
                    page.drawText(`연락처 :  ${customerPhone}`, { x: 260, y: boxY + 25, size: 10, font: customFont });
                    page.drawText(`생년월일 :  ${cleanBirth}`, { x: 420, y: boxY + 25, size: 10, font: customFont });

                    // Signature Box Lines
                    page.drawLine({ start: { x: 310, y: boxY + 48 }, end: { x: 400, y: boxY + 48 }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
                    page.drawLine({ start: { x: 470, y: boxY + 48 }, end: { x: 535, y: boxY + 48 }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
                    page.drawLine({ start: { x: 300, y: boxY + 23 }, end: { x: 400, y: boxY + 23 }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
                    page.drawLine({ start: { x: 465, y: boxY + 23 }, end: { x: 535, y: boxY + 23 }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
                }
            };

            pagesContent.forEach(drawAgreementPage);

            const filledPdfBytes = await pdfDoc.save();
            return new File([filledPdfBytes], `정보동의서_${data.name}.pdf`, { type: "application/pdf" });

        } catch (error) {
            console.error("PDF 생성 전체 오류:", error);
            alert("PDF 생성 중 오류가 발생했습니다:\n" + (error.message || error));
            return null;
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-[#001a3d] relative overflow-hidden text-sm">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#001a3d] to-[#003366] opacity-90"></div>

                <div className="w-full max-w-[420px] bg-white/10 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-white/20">
                    <div className="text-center mb-8 space-y-4">
                        <div className="flex justify-center mb-4">
                            <img src="https://cdn.imweb.me/upload/S20250904697320f4fd9ed/e840c9a46f66a.png" alt="KCC Logo" className="h-10 object-contain" />
                        </div>
                        <h1 className="text-lg font-extrabold text-white tracking-tight leading-tight">
                            프리미엄 견적 시스템
                        </h1>
                        <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">이름과 전화번호를 입력해주세요</p>
                    </div>

                    <form onSubmit={handleSearch} className="space-y-4">
                        {/* Status Type Selector */}
                        <div className="grid grid-cols-3 gap-2 mb-4 bg-black/20 p-1 rounded-xl">
                            {['가견적', '책임견적', '최종견적'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => {
                                        setStatusType(type);
                                        // If already has name/phone, re-trigger search to find the specific type
                                        if (searchForm.name && searchForm.phone) {
                                            executeSearch(searchForm.name, searchForm.phone, type);
                                        }
                                    }}
                                    className={`py-2 rounded-lg text-[10px] md:text-xs font-bold transition-all ${statusType === type
                                        ? 'bg-[#c5a059] text-white shadow-md'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-1">
                            <label className="text-white/50 text-[9px] font-bold uppercase tracking-widest ml-1">성함</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                                <input
                                    type="text"
                                    required
                                    placeholder="성함을 입력하세요"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-10 pr-4 text-xs text-white placeholder:text-white/20 focus:bg-white/10 outline-none transition-all font-semibold"
                                    value={searchForm.name}
                                    onChange={(e) => setSearchForm(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-white/50 text-[9px] font-bold uppercase tracking-widest ml-1">연락처</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    required
                                    placeholder="연락처를 입력하세요"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-10 pr-4 text-xs text-white placeholder:text-white/20 focus:bg-white/10 outline-none transition-all font-semibold"
                                    value={searchForm.phone}
                                    onChange={handlePhoneChange}
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-[#c5a059] text-white text-xs font-black py-4 rounded-2xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 uppercase disabled:opacity-50">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            {loading ? '조회 중...' : '조회 결과 확인하기'}
                        </button>
                    </form>

                    <div className="mt-8 text-center border-t border-white/10 pt-4">
                        <p className="text-white/40 text-[10px] font-bold">(주)티유디지털 | 공식파트너</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return <div className="min-h-screen flex items-center justify-center text-[#001a3d] font-bold text-xs uppercase tracking-widest">Loading Premium Data...</div>;

    return (
        <div className="bg-[#f7f9fc] min-h-screen pb-16 font-sans selection:bg-[#c5a059]/30 text-sm">
            <header className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-5 py-3.5 flex justify-between items-center">
                    <img src="https://cdn.imweb.me/upload/S20250904697320f4fd9ed/5b115594e9a66.png" alt="KCC Logo" className="h-6 object-contain" />
                    <div className="flex items-center gap-1.5">
                        <span className={`text-white text-[9px] font-black px-2.5 py-1.5 rounded-md shadow-sm ${data.type === '최종견적' ? 'bg-red-500' :
                            data.type === '책임견적' ? 'bg-[#c5a059]' :
                                'bg-gray-400'
                            }`}>
                            {data.type || '가견적'}
                        </span>
                        <div className="bg-[#f0f4f9] text-[#2c3e50] text-[9px] font-black px-2.5 py-1.5 rounded-full border border-gray-200 flex items-center gap-1">
                            <Calendar size={10} />
                            견적일: <span className="font-outfit">{data.date}</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
                <div className="text-center space-y-3 pt-4">
                    <div className="inline-block bg-[#001a3d]/5 px-3 py-1 rounded-full">
                        <span className="text-[#001a3d] text-[9px] font-black tracking-widest uppercase">OFFICIAL QUOTATION</span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-[#001a3d] leading-tight tracking-tight">
                        <span className="text-luxury">감사합니다.</span> {data.name}님<br />
                        <span className="text-gray-300">최고의 가치로 보답하겠습니다.</span>
                    </h2>
                </div>

                <div className="luxury-card p-6 md:p-8 relative overflow-hidden bg-white shadow-xl shadow-gray-200/50">
                    <div className="relative z-10 space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[9px] font-black text-[#c5a059] uppercase tracking-widest mb-1.5">Customer details</p>
                                <h3 className="text-2xl font-black text-[#001a3d] leading-none">{data.name} 고객님</h3>
                            </div>
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black shadow-sm ${data.type === '최종견적' ? 'bg-[#001a3d] text-[#c5a059] border border-[#c5a059]/30' :
                                data.type === '책임견적' ? 'bg-[#c5a059] text-white shadow-md' :
                                    'bg-gray-100 text-gray-400 border border-gray-200'
                                }`}>
                                {data.type || '가견적'}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100/50">
                                <div className="w-9 h-9 bg-white shadow-sm rounded-xl flex items-center justify-center text-[#c5a059]"><MapPin size={18} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight mb-0.5">Address</p>
                                    <p className="text-xs font-extrabold text-[#2c3e50] break-keep">{data.address}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100/50">
                                <div className="w-9 h-9 bg-white shadow-sm rounded-xl flex items-center justify-center text-[#c5a059]"><Phone size={18} /></div>
                                <div>
                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight mb-0.5">Contact</p>
                                    <p className="text-xs font-extrabold text-[#2c3e50] font-outfit">{formatPhoneNumber(data.phone || searchForm.phone)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {data.status === '책임견적' && (
                    <div className="bg-gradient-to-r from-[#001a3d] to-[#012a5e] p-6 md:p-8 rounded-[2rem] shadow-xl border-l-[6px] border-[#c5a059] text-white space-y-4 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-[#c5a059] p-2 rounded-xl text-[#001a3d]">
                                <ShieldCheck size={24} />
                            </div>
                            <h4 className="text-lg font-black tracking-tight">KCC글라스 공식 <span className="text-[#c5a059]">책임견적</span> 안내</h4>
                        </div>
                        <div className="space-y-3">
                            <p className="text-sm font-bold text-white/90 leading-relaxed break-keep">
                                본 견적서는 실측 후에도 금액 변동에 대한 고객 부담을 최소화하기 위해 <span className="text-[#c5a059] underline underline-offset-4 font-black">책임 견적 제도</span>를 적용합니다.
                            </p>
                            <div className="bg-white/10 p-4 rounded-2xl border border-white/5 space-y-2">
                                <p className="text-[11px] font-black text-[#c5a059] uppercase tracking-widest">책임견적 제도란?</p>
                                <p className="text-[13px] font-bold text-white/80 leading-relaxed break-keep">
                                    가견적과 동일 사양이면, 실측 후 창 사이즈가 커져도 <span className="text-white font-black underline underline-offset-4 decoration-[#c5a059]">추가금은 없고</span>, 작아지면 그만큼 <span className="text-white font-black underline underline-offset-4 decoration-[#c5a059]">자동으로 할인</span>됩니다. 금액이 달라지는 경우는 창을 추가하거나, 사양·옵션을 바꾸실 때 뿐입니다.
                                </p>
                            </div>
                            <p className="text-xs font-bold text-white/60 text-center pt-1 italic break-keep leading-relaxed">
                                지금 책임견적으로 확정하시면,<br className="md:hidden" /> 빠른 실측 및 시공이 가능합니다.
                            </p>
                            <button
                                onClick={() => setModalType('precautions')}
                                className="w-full mt-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[11px] font-black text-[#c5a059] border border-[#c5a059]/30 transition-all flex items-center justify-center gap-2"
                            >
                                <X size={14} className="rotate-45" /> 책임 견적 적용 제외 사항 확인하기
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    <h3 className="text-lg font-black text-[#001a3d] flex items-center gap-2 px-1">
                        <div className="w-8 h-8 bg-[#001a3d] text-[#c5a059] rounded-lg flex items-center justify-center shadow-md"><ChevronRight size={18} /></div>
                        결제 방식별 상세 제안
                    </h3>

                    <div className="grid grid-cols-1 gap-6">
                        {/* 1 & 2 그룹 영역 */}
                        <div className="space-y-6 bg-white p-2 md:p-4 rounded-[2.5rem] border border-gray-100 shadow-sm">
                            {/* 1. 일시불 섹션 */}
                            <div className="luxury-card overflow-hidden border-none shadow-xl">
                                <div className="bg-[#1a1c23] px-5 py-3.5 flex justify-between items-center text-white">
                                    <div className="flex items-center gap-2.5 text-sm font-black">
                                        <div className="w-6 h-6 bg-white text-[#1a1c23] rounded-full flex items-center justify-center text-[10px] font-outfit">1</div>
                                        일시불 (현금/카드)
                                    </div>
                                    <span className="bg-[#facc15] text-[#1a1c23] text-[8px] font-black px-2.5 py-1 rounded shadow-sm uppercase">Best</span>
                                </div>
                                <div className="p-4 md:p-10 space-y-6 bg-white">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400 font-bold">정상 견적금액 (상세항목 합계)</span>
                                        <span className="text-gray-400 font-bold text-base line-through font-outfit">{formatKrw(data.finalQuote)}</span>
                                    </div>
                                    <div className="bg-red-50 border border-red-100/50 px-4 py-3 rounded-2xl flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Gift size={16} className="text-red-500" />
                                            <span className="text-red-500 font-black text-xs">특별 프로모션 할인</span>
                                        </div>
                                        <span className="text-red-500 font-black text-base font-outfit">-{formatKrw(data.finalQuote - data.finalBenefit)}</span>
                                    </div>
                                    <div className="pt-6 border-t border-dashed border-gray-100 flex flex-col md:flex-row justify-between items-end gap-2 md:gap-0">
                                        <span className="text-[#001a3d] font-black text-sm md:items-start">최종 할인 혜택가</span>
                                        <div className="text-right w-full md:w-auto">
                                            <span className="text-4xl font-black text-[#2563eb] tracking-tighter font-outfit">{formatKrw(data.finalBenefit).replace('원', '')}</span>
                                            <span className="text-xl font-black text-[#2563eb] ml-0.5">원</span>
                                        </div>
                                    </div>

                                    {/* 선납금 / 잔금 조정 영역 - Enhanced Premium Design */}
                                    <div className="bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 p-4 md:p-6 rounded-[2rem] space-y-5 border border-blue-100/50 shadow-sm mt-4 relative">
                                        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
                                        
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                                                <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">스마트 구독 안내</span>
                                            </div>
                                            <div className="flex items-center gap-1 bg-blue-100 px-2 py-1 rounded-full whitespace-nowrap shrink-0">
                                                <Sparkles size={10} className="text-blue-600 animate-pulse" />
                                                <span className="text-[9px] font-black text-blue-700">부담 제약 해소</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                    <Wallet size={12} className="text-blue-500" /> 선납금
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={new Intl.NumberFormat('ko-KR').format(downPayment)}
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value.replace(/[^0-9]/g, ''));
                                                            if (val <= data.finalBenefit) {
                                                                setDownPayment(val);
                                                                setBalance(data.finalBenefit - val);
                                                            }
                                                        }}
                                                        className="w-full bg-white border border-blue-100 rounded-xl py-3 px-2 pr-6 text-[12px] min-[375px]:text-sm md:text-base font-black text-[#001a3d] outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all text-right shadow-sm"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">원</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                    <Clock size={12} /> 잔금
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={new Intl.NumberFormat('ko-KR').format(balance)}
                                                        className="w-full bg-blue-50/50 border border-blue-100/30 rounded-xl py-3 px-2 pr-6 text-[12px] min-[375px]:text-sm md:text-base font-black text-blue-900/50 outline-none text-right"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-300">원</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative pt-8 mt-2">
                                            <div className="absolute top-0 left-0 right-0 flex justify-center z-10">
                                                <div className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg animate-bounce whitespace-nowrap border border-white/20">
                                                    목돈 부담을 줄이는 최고의 방법! ✨
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2.5 pt-2">
                                                <button
                                                    onClick={() => handleConversion('full')}
                                                    className={`group relative flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-black transition-all shadow-md overflow-hidden ${conversionMode === 'full' 
                                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-200' 
                                                        : 'bg-white border-2 border-blue-50 text-blue-600 hover:border-blue-200'}`}
                                                >
                                                    <ArrowRightLeft size={16} /> 전액 구독 전환
                                                </button>
                                                <button
                                                    onClick={() => handleConversion('balance')}
                                                    className={`group relative flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-black transition-all shadow-md overflow-hidden ring-2 ring-yellow-400/20 ${conversionMode === 'balance' 
                                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-200' 
                                                        : 'bg-white border-2 border-yellow-400 text-blue-700 shadow-yellow-100 shadow-lg'}`}
                                                >
                                                    {/* Golden Shimmer Effect */}
                                                    <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-yellow-200/40 to-transparent -translate-x-full animate-[shimmer_3s_infinite] pointer-events-none"></div>
                                                    
                                                    <style dangerouslySetInnerHTML={{ __html: `
                                                        @keyframes shimmer {
                                                            0% { transform: translateX(-100%); }
                                                            100% { transform: translateX(100%); }
                                                        }
                                                    `}} />
                                                    
                                                    <ArrowRightLeft size={16} className={conversionMode === 'balance' ? 'text-white' : 'text-yellow-600'} /> 
                                                    <span className={conversionMode === 'balance' ? 'text-white' : 'text-[#001a3d]'}>잔금만 구독 전환</span>
                                                    
                                                    {!conversionMode && (
                                                        <div className="absolute top-0 right-0 bg-yellow-400 text-[#001a3d] text-[10px] px-2 py-0.5 font-black rounded-bl-lg shadow-sm">
                                                            추천
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {calculatedSubs && (
                                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                            <div className="bg-[#001a3d] p-6 md:p-8 rounded-[2rem] text-white space-y-6">
                                                <div className="flex justify-between items-center px-1">
                                                    <div className="flex items-center gap-2">
                                                        <Calculator size={16} className="text-[#c5a059]" />
                                                        <h5 className="text-xs font-black">
                                                            {conversionMode === 'full' ? '전액' : '잔금'} 구독 전환 견적
                                                        </h5>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-white/50">* 이자 포함 금액</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                                    {[24, 36, 48, 60].map(m => (
                                                        <div 
                                                            key={m} 
                                                            className={`relative p-4 rounded-2xl border transition-all text-center space-y-1 ${m === 60 ? 'bg-white text-[#001a3d] border-white shadow-xl' : 'bg-white/5 border-white/10 opacity-70'}`}
                                                        >
                                                            <p className={`text-[9px] font-black uppercase tracking-tighter ${m === 60 ? 'text-[#001a3d]/50' : 'text-white/40'}`}>{m}개월 약정</p>
                                                            <p className="text-base font-black font-outfit">{new Intl.NumberFormat('ko-KR').format(calculatedSubs[m])}원</p>
                                                            {m === 60 && (
                                                                <div className="absolute -top-2 -right-1">
                                                                    <div className="bg-[#ef4444] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                                                                        인기
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex flex-col gap-4">
                                                    <button
                                                        onClick={() => {
                                                            setApplicationType('subscription');
                                                            setIsRentalMode(true);
                                                            setRentalStep(1);
                                                            setRentalForm(prev => ({ 
                                                                ...prev, 
                                                                selectedAmount: 60, // Fixed to 60
                                                                isConversion: true,
                                                                conversionSubs: calculatedSubs,
                                                                conversionMode: conversionMode,
                                                                downPaymentToReport: conversionMode === 'balance' ? downPayment : 0
                                                            }));
                                                        }}
                                                        className="w-full py-4 bg-[#c5a059] text-sm font-black text-[#001a3d] rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2"
                                                    >
                                                        구독 신청하기 <ChevronRight size={16} />
                                                    </button>
                                                    <p className="text-[10px] text-center text-[#c5a059] font-bold">
                                                        * 위 {conversionMode === 'full' ? '전액' : `잔금(${formatKrw(balance)})`}에 대한 월 구독료 견적입니다.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        {/* 3. 60개월 렌탈 고정형 패키지 */}
                        <div className="bg-[#1e293b] p-6 md:p-10 text-white relative overflow-hidden shadow-xl shadow-black/10 rounded-[2.5rem]">
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px] -ml-24 -mb-24 opacity-30"></div>
                            <div className="relative z-10 mb-6">
                                <div className="flex justify-between items-start md:items-center mb-2">
                                    <div className="flex items-start md:items-center gap-2.5">
                                        <div className="w-6 h-6 bg-white/20 text-white rounded-full flex items-center justify-center text-[10px] font-black border border-white/20 font-outfit shrink-0 mt-0.5 md:mt-0">3</div>
                                        <h4 className="text-base font-black text-white leading-tight">
                                            60개월 렌탈<br className="md:hidden" /> 고정형 패키지
                                        </h4>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setApplicationType('rental');
                                            setIsRentalMode(true);
                                            setRentalStep(1);
                                        }}
                                        className="bg-[#c5a059] hover:bg-[#b08d48] text-[#001a3d] text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-1 shrink-0"
                                    >
                                        렌탈 신청하기 <ChevronRight size={10} />
                                    </button>
                                </div>
                                <p className="text-white/60 text-[11px] font-medium ml-8">매월 일정금액을 고정시키고 일부 금액만 선납형으로 결제하는 하이브리드 렌탈 서비스 입니다.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full relative z-10">
                                {[11, 22, 33].map(val => (
                                    <div key={val} className="bg-white/[0.08] backdrop-blur-md border border-white/10 p-4 md:p-6 rounded-2xl transition-all text-center group flex flex-col justify-center shadow-inner">
                                        <div className="text-[#c5a059] text-sm md:text-base font-black mb-1 md:mb-2 tracking-tight group-hover:scale-105 transition-transform">
                                            월 {val === 11 ? '111,000' : val === 22 ? '222,000' : '333,000'}원 고정
                                        </div>
                                        <div className="flex flex-row md:flex-col items-center justify-center gap-2 md:gap-0.5">
                                            <p className="text-[8px] text-white/40 font-black tracking-widest uppercase">선납금</p>
                                            <p className="text-lg md:text-xl font-black text-white font-outfit whitespace-nowrap">{calculatePackage(data.finalBenefit, val * 10000, val * 500000 / 1.1)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {/* 구독 PLUS 서비스 */}
                            <div className="purple-premium-gradient p-8 md:p-14 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-4xl"></div>
                                <div className="relative z-10 space-y-12">
                                    <div className="space-y-4 text-center">
                                        <span className="bg-[#facc15] text-[#311b92] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block shadow-lg">Special Promotion</span>
                                        <div className="space-y-1">
                                            <p className="text-sm md:text-base font-bold text-white/80">KCC홈씨씨 견적 고객 대상</p>
                                            <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">LG전자 가전구독료 <br className="md:hidden" /> 할인 프로모션 진행 중</h3>
                                        </div>
                                    </div>
                                    
                                    <div className="max-w-2xl mx-auto w-full">
                                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] space-y-8 shadow-2xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-20">
                                                <img src="https://www.lge.co.kr/lg5-common/images/header/lg_logo_new.svg" alt="LG Logo" className="h-10 w-auto grayscale brightness-0 invert opacity-20" />
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                                                    <div className="w-12 h-12 bg-[#facc15] text-[#311b92] rounded-xl flex items-center justify-center shrink-0 shadow-lg font-black text-lg font-outfit">10%</div>
                                                    <div>
                                                        <p className="text-[#facc15] text-[10px] font-black uppercase tracking-widest mb-1">Monthly Discount</p>
                                                        <p className="text-base md:text-lg font-black text-white leading-tight">LG전자 가전구독료 <span className="text-[#facc15]">매월 10%</span> 할인</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                                                    <div className="w-12 h-12 bg-white/20 text-white rounded-xl flex items-center justify-center shrink-0 border border-white/20"><CheckCircle size={24} /></div>
                                                    <div>
                                                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Target Products</p>
                                                        <p className="text-base md:text-lg font-black text-white leading-tight">LG전자 홈페이지 전제품 대상</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6 pt-2">
                                                <p className="text-sm md:text-base font-bold text-white/90 leading-relaxed break-keep text-center md:text-left">
                                                    창호 교체하면서 가전까지 고민 중이라면, 어디에서도 만날 수 없는 <span className="text-[#facc15] underline underline-offset-4 decoration-[#facc15]/30">LG가전 구독료 10% 할인 혜택</span>을 놓치지 마세요! <br className="hidden md:block" />
                                                    오직 KCC홈씨씨 견적 고객에게만 적용해 드립니다.
                                                </p>
                                                <div className="bg-white/5 p-5 rounded-2xl border border-dashed border-white/20 text-center">
                                                    <p className="text-xs md:text-sm font-black text-white/60 leading-relaxed">
                                                        신청 문의는 <span className="text-white">창호 상담사</span>를<br className="md:hidden" /> 통해서 가능합니다.
                                                    </p>
                                                </div>
                                                <div className="pt-2 flex justify-center">
                                                    <a
                                                        href="https://www.lge.co.kr/care-solutions"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-full bg-white text-[#311b92] py-3.5 rounded-xl font-black text-xs md:text-sm shadow-xl hover:bg-[#facc15] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group"
                                                    >
                                                        LG구독 홈페이지 바로가기
                                                        <ExternalLink size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 전용 혜택 카드 */}
                            <div className="luxury-card p-10 md:p-14 bg-white border border-gray-100 shadow-xl space-y-10">
                                <h4 className="text-xl md:text-2xl font-black text-[#001a3d] flex items-center gap-3 md:gap-4 whitespace-nowrap">
                                    <div className="w-2 h-8 md:w-2.5 md:h-10 bg-[#c5a059] rounded-full shrink-0"></div>
                                    계약 고객 특별 무상 서비스
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-[#f8fafc] p-6 md:p-8 rounded-[2rem] flex items-center gap-5 md:gap-8 border border-gray-100/50 hover:bg-white transition-all group cursor-default shadow-sm hover:shadow-xl hover:shadow-gray-200/50">
                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white shadow-lg rounded-[1rem] md:rounded-[1.25rem] flex items-center justify-center text-[#c5a059] transition-transform group-hover:rotate-6 border border-gray-50"><ShieldCheck size={28} className="md:w-8 md:h-8" /></div>
                                        <div>
                                            <p className="text-[9px] md:text-[11px] font-black text-[#c5a059] uppercase tracking-[0.15em] mb-1 opacity-80 whitespace-nowrap">Upgrade Option 01</p>
                                            <p className="text-base md:text-lg font-black text-[#2c3e50] tracking-tight leading-tight md:leading-snug break-keep">
                                                고성능 더블로이유리<br /> 무상 업그레이드
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-[#f8fafc] p-6 md:p-8 rounded-[2rem] flex items-center gap-5 md:gap-8 border border-gray-100/50 hover:bg-white transition-all group cursor-default shadow-sm hover:shadow-xl hover:shadow-gray-200/50">
                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white shadow-lg rounded-[1rem] md:rounded-[1.25rem] flex items-center justify-center text-[#c5a059] transition-transform group-hover:rotate-6 border border-gray-50"><ExternalLink size={28} className="md:w-8 md:h-8" /></div>
                                        <div>
                                            <p className="text-[9px] md:text-[11px] font-black text-[#c5a059] uppercase tracking-[0.15em] mb-1 opacity-80 whitespace-nowrap">Upgrade Option 02</p>
                                            <p className="text-base md:text-lg font-black text-[#2c3e50] tracking-tight leading-tight md:leading-snug break-keep">
                                                최고급 블랙 STS<br /> 방충망 전면 교체
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 pt-4">
                    <h3 className="text-lg font-black text-[#001a3d] flex items-center gap-2 px-1">
                        <div className="w-8 h-8 bg-gray-100 text-[#001a3d] rounded-lg flex items-center justify-center shadow-sm"><CheckCircle2 size={18} /></div>
                        상세 견적 내역
                    </h3>

                    <div className="luxury-card overflow-hidden border-none shadow-xl">
                        <div className="bg-[#1e40af] px-6 py-3.5 flex justify-between items-center text-white">
                            <span className="text-[11px] font-black uppercase tracking-widest">Item List</span>
                            <span className="text-[10px] font-bold opacity-80">부가세 포함</span>
                        </div>
                        <div className="p-4 md:p-6 bg-[#f8fafc] grid grid-cols-1 md:grid-cols-2 gap-5">
                            {data.items?.map((item, idx) => (
                                <div key={idx} className="bg-white rounded-2xl flex flex-col justify-between shadow-sm border border-gray-100 group transition-all p-3 md:p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-outfit tracking-tighter transition-transform group-hover:scale-110">#{idx + 1}</span>
                                            <h4 className="text-sm font-black text-[#001a3d]">{item.loc}</h4>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-[#001a3d] font-outfit">{formatKrw(item.price)}</p>
                                        </div>
                                    </div>

                                    <div className="bg-[#fcfcfd] border border-gray-100/80 p-2 rounded-xl space-y-2 shadow-inner relative overflow-hidden">
                                        <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-[11px] font-bold relative z-10">
                                            <div className="space-y-0.5">
                                                <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">제품명</p>
                                                <p className="text-[#2c3e50] font-extrabold truncate">{item.prod}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">규격</p>
                                                <p className="text-[#2c3e50] font-extrabold font-outfit tracking-tighter">{item.size}</p>
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">창형태</p>
                                                <div className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black text-[#2c3e50] tracking-tight flex items-center">
                                                    {(item.winType && item.winType.trim() !== "") ? item.winType : '-'}
                                                </div>
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">{item.isEtc ? '상세내용' : '모델명'}</p>
                                                <div className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-xs font-black text-[#2c3e50] tracking-tight flex items-center">
                                                    {(item.model && item.model.trim() !== "") ? item.model : '-'}
                                                </div>
                                            </div>

                                            {/* 옵션 정보 (잠금장치/방충망) */}
                                            {(item.handle || item.screen) && !item.isEtc && (
                                                <div className="col-span-2 space-y-1 pt-1 border-t border-gray-100/50 mt-1">
                                                    <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">추가 옵션</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {item.handle && (
                                                            <div className="p-2 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-600 flex flex-col justify-center">
                                                                <span className="text-[8px] text-gray-400 mb-0.5">핸들</span>
                                                                <span className="break-keep leading-tight">{item.handle}</span>
                                                            </div>
                                                        )}
                                                        {item.screen && (
                                                            <div className="p-2 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-600 flex flex-col justify-center">
                                                                <span className="text-[8px] text-gray-400 mb-0.5">방충망</span>
                                                                <span className="break-keep leading-tight">{item.screen}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {!item.isEtc && (
                                                <div className="col-span-2 pt-2 border-t border-gray-100/50 space-y-3">

                                                    {/* 1. 유리 사양 (스펙) - 한 줄에 파란색/핑크색 */}
                                                    <div className="space-y-1">
                                                        <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">유리사양</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="bg-[#ebf5ff] text-[#2563eb] px-2.5 py-2 rounded-lg border border-blue-50 flex flex-col justify-center">
                                                                <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter mb-0.5">Inner (내부)</span>
                                                                <span className="text-[10px] font-black leading-tight break-keep">{item.glassIn || '-'}</span>
                                                            </div>
                                                            {item.glassOut && item.glassOut.trim() !== "" && (
                                                                <div className="bg-[#fff0f6] text-[#db2777] px-2.5 py-2 rounded-lg border border-pink-50 flex flex-col justify-center">
                                                                    <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter mb-0.5">Outer (외부)</span>
                                                                    <span className="text-[10px] font-black leading-tight break-keep">{item.glassOut}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 2. 유리 두께/종류 (상세) - 한 줄에 파란색/핑크색 */}
                                                    {(item.thickIn || item.typeIn || item.thickOut || item.typeOut) && (
                                                        <div className="space-y-1">
                                                            <p className="text-gray-400 text-[8px] uppercase tracking-widest font-black opacity-60">유리두께</p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="bg-[#ebf5ff] text-[#2563eb] px-2.5 py-2 rounded-lg border border-blue-50 flex flex-col justify-center opacity-90">
                                                                    <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter mb-0.5">Inner Thick</span>
                                                                    <div className="text-[9px] font-bold flex gap-1.5 items-center">
                                                                        <span>{item.thickIn || '-'}</span>
                                                                    </div>
                                                                </div>
                                                                {(item.thickOut) && (
                                                                    <div className="bg-[#fff0f6] text-[#db2777] px-2.5 py-2 rounded-lg border border-pink-50 flex flex-col justify-center opacity-90">
                                                                        <span className="text-[8px] font-black opacity-50 uppercase tracking-tighter mb-0.5">Outer Thick</span>
                                                                        <div className="text-[9px] font-bold flex gap-1.5 items-center">
                                                                            <span>{item.thickOut || '-'}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <div className="luxury-card p-6 md:p-10 flex justify-center items-center bg-[#001a3d] text-white border-none shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-blue-500/5 rounded-full blur-[120px]"></div>
                        <div className="flex flex-row items-center gap-4 md:gap-10 relative z-10 w-full justify-center">
                            <div className="w-10 h-10 md:w-14 md:h-14 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[#c5a059] shadow-inner border border-white/10 shrink-0"><CheckCircle2 size={24} className="md:w-7 md:h-7" /></div>
                            <div className="flex flex-col items-start gap-1">
                                <p className="text-white/40 font-black text-[8px] md:text-[9px] uppercase tracking-[0.3em] font-outfit leading-none mb-0.5">Investment Total Summary</p>
                                <div className="relative inline-block">
                                    <p className="text-3xl md:text-5xl font-black text-[#c5a059] font-outfit tracking-tighter leading-none">{formatKrw(data.finalQuote)}</p>
                                    <p className="text-[9px] text-white/40 font-bold absolute -right-0 -bottom-3.5 md:-bottom-4.5 whitespace-nowrap">부가세 포함</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {data.pdfUrl && (
                        <div className="flex justify-center pt-2">
                            <a
                                href={data.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="premium-btn w-full py-5 md:py-6 px-4 md:px-16 flex items-center justify-center gap-2 md:gap-4 shadow-xl text-base md:text-lg tracking-tight font-black hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap"
                            >
                                <Download size={20} className="md:w-6 md:h-6" /> 상세 견적서 PDF 다운로드
                            </a>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 pt-4">
                {banners?.map((b, i) => (
                    <a key={i} href={b.link} target="_blank" rel="noopener noreferrer" className="luxury-card overflow-hidden bg-white shadow-xl border-none transition-transform hover:scale-[1.01] duration-500 w-full md:max-w-[48%]">
                        <img src={b.img} alt="광고 배너" className="w-full h-auto object-cover" />
                    </a>
                ))}
            </div>

            <footer className="pt-8 pb-4 text-center space-y-6">
                <p className="text-gray-400 font-bold text-[9px] uppercase tracking-[0.6em] opacity-50">Main Project Partner</p>
                <h4 className="text-lg md:text-2xl font-black text-[#001a3d] tracking-tighter decoration-luxury decoration-2 whitespace-nowrap px-2">
                    (주)KCC글라스 홈씨씨 | (주)티유디지털
                </h4>
                <div className="max-w-2xl mx-auto space-y-4 text-[11px] font-extrabold text-gray-500 leading-relaxed px-4">
                    <p className="opacity-80 text-center">서울시 가산디지털1로 83, 파트너스타워1, 802호<br />사업자등록번호: 220-87-15092 ｜ 김정열 대표이사</p>
                    <div className="bg-gray-100/80 p-4 rounded-[1.5rem] border border-gray-200/50 text-[#001a3d] shadow-inner inline-block min-w-[300px]">
                        <span className="text-[9px] uppercase tracking-[0.4em] text-[#c5a059] font-black mb-1 inline-block border-b-2 border-[#c5a059]/10 pb-1">Deposit Info</span><br />
                        <span className="text-base font-black font-outfit">(국민은행) 421737-04-015908</span><br />
                        <span className="font-black text-[11px] opacity-80 mt-0.5 block tracking-wider">계좌주 : (주)티유디지털</span>
                    </div>
                </div>
            </footer>

            <div className="pt-2 border-t border-gray-100/30 text-center">
                <img src="https://cdn.imweb.me/upload/S20250904697320f4fd9ed/87d2040aa0130.png" alt="하단 로고" className="w-full max-w-2xl mx-auto object-contain opacity-100 rounded-2xl" />
            </div>
        </div>

            {/* Contact Menu */}
            <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end gap-3">
                {showContactMenu && (
                    <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-4 fade-in duration-200 mb-2">
                        <a href="tel:01046057977" className="bg-white text-[#001a3d] p-3 rounded-xl shadow-xl flex items-center justify-between gap-2 min-w-[130px] border border-gray-100 hover:bg-gray-50 transition-colors">
                            <span className="font-bold text-xs">전화걸기</span>
                            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center shadow-md"><Phone size={12} fill="currentColor" /></div>
                        </a>
                        <a href="sms:01046057977" className="bg-white text-[#001a3d] p-3 rounded-xl shadow-xl flex items-center justify-between gap-2 min-w-[130px] border border-gray-100 hover:bg-gray-50 transition-colors">
                            <span className="font-bold text-xs">문자보내기</span>
                            <div className="w-6 h-6 bg-yellow-400 text-white rounded-full flex items-center justify-center shadow-md"><MessageCircle size={12} fill="currentColor" /></div>
                        </a>
                        <a href="http://pf.kakao.com/_xiRTwn/chat" target="_blank" rel="noopener noreferrer" className="bg-white text-[#001a3d] p-3 rounded-xl shadow-xl flex items-center justify-between gap-2 min-w-[130px] border border-gray-100 hover:bg-gray-50 transition-colors">
                            <span className="font-bold text-xs">카톡상담</span>
                            <div className="w-6 h-6 bg-[#FAE100] text-[#371D1E] rounded-full flex items-center justify-center shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                    <path d="M12 3c-5.523 0-10 3.577-10 8.001 0 2.62 1.558 4.965 3.996 6.435-.16.575-.582 2.083-.665 2.45-.105.474.173.467.362.341 1.503-1.002 3.064-2.115 3.996-2.733.748.11 1.52.17 2.311.17 5.523 0 10-3.577 10-8.001S17.523 3 12 3z" />
                                </svg>
                            </div>
                        </a>
                    </div>
                )}
                <button
                    onClick={() => setShowContactMenu(!showContactMenu)}
                    className="bg-[#001a3d] text-[#c5a059] p-3 rounded-[1.25rem] shadow-2xl shadow-[#001a3d]/50 flex items-center gap-2 active:scale-90 transition-all border-2 border-white/10 group"
                >
                    <div className={`w-6 h-6 bg-[#c5a059] text-[#001a3d] rounded-lg flex items-center justify-center shadow-lg relative z-10 transition-transform duration-300 ${showContactMenu ? 'rotate-45' : 'group-hover:rotate-12'}`}>
                        {showContactMenu ? <X size={16} /> : <MessageCircle size={16} />}
                    </div>
                    <span className="text-white font-black pr-1 text-[11px] tracking-tighter relative z-10 uppercase">
                        {showContactMenu ? '닫기' : '문의하기'}
                    </span>
                </button>
            </div>


            {modalType && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

                    {/* Overlay: Closes modal */}
                    <div
                        className="absolute inset-0 bg-[#001a3d]/98 backdrop-blur-2xl transition-opacity animate-in fade-in"
                        onClick={() => setModalType(null)}
                    ></div>

                    {/* Modal Content: Stops click propagation to prevent closing */}
                    <div
                        className="bg-white w-[92%] md:w-full max-w-xl h-[90vh] md:h-[85vh] rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 shadow-black/40 border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="p-6 md:p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/10 shrink-0">
                            <div className="space-y-2">
                                <span className="bg-[#c5a059] text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">
                                    {modalType === 'precautions' ? 'Important Notice' : 'Membership Choice'}
                                </span>
                                <h3 className="text-lg md:text-xl font-black text-[#001a3d] leading-tight tracking-tighter mt-1 break-keep">
                                    {modalType === 'precautions' ? '책임 견적 적용 제외 및 유의사항' : `옵션 타입 ${modalType} 가전`}
                                </h3>
                            </div>
                            <button onClick={() => setModalType(null)} className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center text-[#2c3e50] shadow-sm active:scale-95">
                                <X size={26} />
                            </button>
                        </header>

                        {/* Scrollable Area */}
                        <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-gray-50/5 min-h-0 relative" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
                            {modalType === 'precautions' ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl">
                                        <p className="text-orange-900 text-[13px] font-bold leading-relaxed break-keep">
                                            아래의 경우에는 책임 견적 적용 대상에서 제외되며, 실측 후 최종 견적 금액이 조정될 수 있습니다.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            "창호 개수 또는 설치 위치 변경",
                                            "제품군 또는 사양 변경 (예: 단창 ↔ 이중창, 등급 상향 등)",
                                            "옵션 및 부자재 추가 (특수유리, 보강자재 등)",
                                            "고객 요청에 의한 구조·구성 변경",
                                            "현장 여건상 시공 불가 또는 시공 방식 변경이 필요한 경우 (이 경우 반드시 사전에 고객님께 안내 드립니다.)"
                                        ].map((text, idx) => (
                                            <div key={idx} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm transition-transform active:scale-[0.99]">
                                                <div className="w-6 h-6 bg-[#c5a059]/10 text-[#c5a059] rounded-lg flex items-center justify-center text-xs font-black shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <p className="text-sm font-bold text-[#2c3e50] leading-snug break-keep">{text}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-[#f8fafc] p-6 rounded-3xl border border-gray-100 mt-4">
                                        <p className="text-[11px] text-gray-400 font-bold leading-relaxed text-center">
                                            ※ 실측 및 현장 상담 과정에서 사양 변경이 발생할 경우 투명하게 재안내 드립니다.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {appliances?.[modalType]?.map((item, idx) => (
                                        <div key={idx} className="bg-white rounded-[2rem] border border-gray-100 p-5 flex flex-col gap-5 shadow-xl shadow-gray-100/50 group hover:border-[#c5a059]/30 transition-all">
                                            <div className="w-full aspect-video bg-white rounded-3xl overflow-hidden border-2 border-gray-50 relative shrink-0">
                                                <img src={item.img} alt={item.name} className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-110" />
                                                <div className="absolute top-2 right-2 bg-[#001a3d] text-[#c5a059] text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Premium</div>
                                            </div>
                                            <div className="space-y-4 px-1 flex-1 flex flex-col">
                                                <div className="flex-1">
                                                    <span className="text-[#c5a059] text-[9px] font-black uppercase tracking-widest bg-[#c5a059]/10 px-2.5 py-1 rounded-lg mb-2 inline-block">{item.cat}</span>
                                                    <h4 className="text-base font-black text-[#2c3e50] leading-tight line-clamp-2 h-10 tracking-tight">{item.name}</h4>
                                                    <p className="text-[10px] text-gray-400 font-black mt-2 font-outfit uppercase tracking-widest opacity-80">{item.model}</p>
                                                </div>

                                                {item.link && item.link !== '#' && item.link.trim() !== '' ? (
                                                    <a
                                                        href={item.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-[#001a3d] text-white font-black py-2.5 px-4 text-[11px] flex items-center justify-center gap-2 w-full rounded-xl transition-all tracking-tight hover:bg-[#c5a059] hover:text-[#001a3d] shadow-lg shadow-black/10 active:scale-95 cursor-pointer block text-center no-underline"
                                                    >
                                                        제품 자세히 보기 <ExternalLink size={13} />
                                                    </a>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            alert("상세 페이지 준비 중입니다.");
                                                        }}
                                                        className="bg-[#001a3d] text-white font-black py-2.5 px-4 text-[11px] flex items-center justify-center gap-2 w-full rounded-xl transition-all tracking-tight hover:bg-[#c5a059] hover:text-[#001a3d] shadow-lg shadow-black/10 active:scale-95 cursor-pointer"
                                                    >
                                                        제품 자세히 보기 <ExternalLink size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>


                    </div>
                </div>
            )}

            {/* === RENTAL APPLICATION SUB-PAGE (FULL SCREEN MODAL) === */}
            {
                isRentalMode && (
                    <div className="fixed inset-0 z-[200] bg-[#f0f4f9] flex flex-col animate-in slide-in-from-bottom-10 duration-300">
                        {/* Header */}
                        <header className="bg-white px-5 py-4 flex items-center justify-between shadow-sm shrink-0 sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <button onClick={() => {
                                    if (rentalStep > 1) setRentalStep(prev => prev - 1);
                                    else {
                                        showConfirm(
                                            `${applicationType === 'subscription' ? '구독' : '렌탈'} 신청을 중단하시겠습니까?`,
                                            () => setIsRentalMode(false)
                                        );
                                    }
                                }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <ChevronRight size={24} className="rotate-180 text-[#001a3d]" />
                                </button>
                                <h2 className="text-lg font-black text-[#001a3d]">{applicationType === 'subscription' ? '스마트 구독 서비스 신청' : '렌탈 서비스 신청'}</h2>
                                {isSaving && (
                                    <div className="flex items-center gap-1.5 ml-3 bg-blue-50 px-2.5 py-1 rounded-lg animate-pulse border border-blue-100/50 shadow-sm">
                                        <Loader2 size={12} className="animate-spin text-blue-600" />
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">정보 수정 중...</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-[10px] font-black text-[#c5a059] bg-[#c5a059]/10 px-3 py-1 rounded-full">
                                Step {rentalStep} / 4
                            </div>
                        </header>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto p-5 md:p-8 max-w-2xl mx-auto w-full pb-24">
                            {/* Progress Bar */}
                            <div className="h-1 bg-gray-200 w-full mb-8 rounded-full overflow-hidden">
                                <div className="h-full bg-[#001a3d] transition-all duration-500 ease-out" style={{ width: `${(rentalStep / 4) * 100}%` }}></div>
                            </div>

                            {/* STEP 1: Applicant Info */}
                            {rentalStep === 1 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-[#001a3d]">신청자 정보를<br />확인해주세요</h3>
                                        <p className="text-gray-500 text-sm font-bold">안전한 계약을 위해 본인 정보를 입력해주세요.</p>
                                    </div>

                                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 block">이름</label>
                                                <input type="text" value={data.name} disabled className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-black text-[#001a3d] opacity-70" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 block">연락처</label>
                                                <input type="text" value={formatPhoneNumber(data.phone)} disabled className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-black text-[#001a3d] opacity-70" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 block">설치 주소</label>
                                                <textarea value={data.address} disabled className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-black text-[#001a3d] opacity-70 resize-none h-20" />
                                            </div>
                                        </div>

                                        <div className="h-px bg-gray-100"></div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[11px] font-black text-[#001a3d] uppercase tracking-widest mb-1 block">생년월일 (8자리)</label>
                                                <input
                                                    type="tel"
                                                    maxLength={10}
                                                    placeholder="예: 1980-01-01"
                                                    value={rentalForm.birthDate}
                                                    onChange={(e) => {
                                                        let val = e.target.value.replace(/\D/g, '');
                                                        if (val.length >= 5) val = val.slice(0, 4) + '-' + val.slice(4);
                                                        if (val.length >= 8) val = val.slice(0, 7) + '-' + val.slice(7);
                                                        setRentalForm({ ...rentalForm, birthDate: val });
                                                    }}
                                                    className="w-full bg-white border border-gray-200 focus:border-[#c5a059] rounded-xl px-4 py-3.5 font-black text-lg text-[#001a3d] placeholder:text-gray-300 outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-black text-[#001a3d] uppercase tracking-widest mb-2 block">성별</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {['male', 'female'].map((g) => (
                                                        <button
                                                            key={g}
                                                            onClick={() => setRentalForm({ ...rentalForm, gender: g })}
                                                            className={`py-3.5 rounded-xl font-black text-sm transition-all border ${rentalForm.gender === g
                                                                ? 'bg-[#001a3d] text-white border-[#001a3d] shadow-lg scale-[1.02]'
                                                                : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            {g === 'male' ? '남성' : '여성'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
 
                                    {/* Subscription Exclusive: Installment Details & Transfer/Job Info */}
                                    {applicationType === 'subscription' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
                                                <div>
                                                    <label className="text-[11px] font-black text-[#001a3d] uppercase tracking-widest mb-2 block">이체일자 선택</label>
                                                    <div className="relative">
                                                        <select
                                                            value={rentalForm.transferDate}
                                                            onChange={(e) => setRentalForm({ ...rentalForm, transferDate: e.target.value })}
                                                            className="w-full bg-white border border-gray-200 focus:border-[#c5a059] rounded-xl px-4 py-3.5 font-black text-sm text-[#001a3d] outline-none appearance-none transition-all cursor-pointer"
                                                        >
                                                            <option value="">이체일자를 선택하세요</option>
                                                            {[...Array(28)].map((_, i) => (
                                                                <option key={i + 1} value={`${i + 1}일`}>{i + 1}일</option>
                                                            ))}
                                                            <option value="말일">말일</option>
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                            <ChevronRight size={18} className="rotate-90 text-gray-300" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[11px] font-black text-[#001a3d] uppercase tracking-widest mb-2 block">직군선택</label>
                                                    <div className="space-y-3">
                                                        <div className="relative">
                                                            <select
                                                                value={[
                                                                    "건설관련직", "기계관련직", "섬유및의복관련직", "식품가공관련직", 
                                                                    "재료관련직", "전기·전자관련직", "정보통신관련직", "화학관련직", 
                                                                    "환경·인쇄·목재·가구·공예및생산단순직", "경영·회계·사무관련직", 
                                                                    "금융·보험관련직", "관리직", "군인", "농립어업관련직", 
                                                                    "교육및자연과학·사회과학연구관련직", "문화·예술·디자인·방송관련직", 
                                                                    "법률·경찰·소방·교도관련직", "보건·의료관련직", "사회복지및종교관련직", 
                                                                    "경비및청소관련직", "미용·숙박·여행·오락·스포츠관련직", 
                                                                    "영업및판매관련직", "운전및운송관련직", "음식서비스관련직", "주부", "무직"
                                                                ].includes(rentalForm.jobCategory) ? rentalForm.jobCategory : (rentalForm.jobCategory ? '직접입력' : '')}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === '직접입력') {
                                                                        setRentalForm({ ...rentalForm, jobCategory: '직접입력' });
                                                                    } else {
                                                                        setRentalForm({ ...rentalForm, jobCategory: val });
                                                                    }
                                                                }}
                                                                className="w-full bg-white border border-gray-200 focus:border-[#c5a059] rounded-xl px-4 py-3.5 font-black text-sm text-[#001a3d] outline-none appearance-none transition-all cursor-pointer"
                                                            >
                                                                <option value="">직군을 선택하세요</option>
                                                                {[
                                                                    "건설관련직", "기계관련직", "섬유및의복관련직", "식품가공관련직", 
                                                                    "재료관련직", "전기·전자관련직", "정보통신관련직", "화학관련직", 
                                                                    "환경·인쇄·목재·가구·공예및생산단순직", "경영·회계·사무관련직", 
                                                                    "금융·보험관련직", "관리직", "군인", "농립어업관련직", 
                                                                    "교육및자연과학·사회과학연구관련직", "문화·예술·디자인·방송관련직", 
                                                                    "법률·경찰·소방·교도관련직", "보건·의료관련직", "사회복지및종교관련직", 
                                                                    "경비및청소관련직", "미용·숙박·여행·오락·스포츠관련직", 
                                                                    "영업및판매관련직", "운전및운송관련직", "음식서비스관련직", "주부", "무직"
                                                                ].map(job => (
                                                                    <option key={job} value={job}>{job}</option>
                                                                ))}
                                                                <option value="직접입력">직접입력</option>
                                                            </select>
                                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                                <ChevronRight size={18} className="rotate-90 text-gray-300" />
                                                            </div>
                                                        </div>

                                                        {/* 직접입력 선택 시 또는 리스트에 없는 값일 경우 입력 필드 표시 */}
                                                        {(![
                                                            "건설관련직", "기계관련직", "섬유및의복관련직", "식품가공관련직", 
                                                            "재료관련직", "전기·전자관련직", "정보통신관련직", "화학관련직", 
                                                            "환경·인쇄·목재·가구·공예및생산단순직", "경영·회계·사무관련직", 
                                                            "금융·보험관련직", "관리직", "군인", "농립어업관련직", 
                                                            "교육및자연과학·사회과학연구관련직", "문화·예술·디자인·방송관련직", 
                                                            "법률·경찰·소방·교도관련직", "보건·의료관련직", "사회복지및종교관련직", 
                                                            "경비및청소관련직", "미용·숙박·여행·오락·스포츠관련직", 
                                                            "영업및판매관련직", "운전및운송관련직", "음식서비스관련직", "주부", "무직", ""
                                                        ].includes(rentalForm.jobCategory) || rentalForm.jobCategory === '직접입력') && (
                                                            <input
                                                                type="text"
                                                                placeholder="직군을 직접 입력해주세요"
                                                                value={rentalForm.jobCategory === '직접입력' ? '' : rentalForm.jobCategory}
                                                                onChange={(e) => setRentalForm({ ...rentalForm, jobCategory: e.target.value })}
                                                                className="w-full bg-white border border-gray-200 focus:border-[#c5a059] rounded-xl px-4 py-3.5 font-black text-sm text-[#001a3d] outline-none transition-all animate-in fade-in slide-in-from-top-2"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 2: Amount Selection */}
                            {rentalStep === 2 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-[#001a3d]">{applicationType === 'subscription' ? '원하시는 월 구독료를' : '원하시는 월 렌탈료를'}<br />선택해주세요</h3>
                                        <p className="text-gray-500 text-sm font-bold">선택하신 금액에 따라 선납금이 달라집니다.</p>
                                    </div>

                                    <div className="space-y-4">
                                        {(applicationType === 'subscription' ? [24, 36, 48, 60] : [11, 22, 33]).map((val) => {
                                            const isSubscription = applicationType === 'subscription';
                                            const calculation = isSubscription
                                                ? (rentalForm.isConversion 
                                                    ? formatKrw(rentalForm.conversionSubs?.[val] || 0)
                                                    : formatKrw(data.subs?.[val] || 0))
                                                : calculatePackage(data.finalBenefit, val * 10000, val * 500000 / 1.1);
                                            const isSelected = rentalForm.selectedAmount === val;
                                            const isDisabled = !isSubscription && calculation === '해당없음';

                                            return (
                                                <div
                                                    key={val}
                                                    onClick={() => {
                                                        if (!isDisabled) {
                                                            setRentalForm({ ...rentalForm, selectedAmount: val });
                                                        }
                                                    }}
                                                    className={`p-6 rounded-[2rem] border-2 transition-all relative overflow-hidden ${isDisabled ? 'cursor-not-allowed opacity-50 bg-gray-50 border-gray-100' : 'cursor-pointer'} ${isSelected
                                                        ? 'bg-[#001a3d] border-[#001a3d] text-white shadow-xl scale-[1.02]'
                                                        : isDisabled ? '' : 'bg-white border-gray-100 text-[#001a3d] hover:border-gray-200'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-center relative z-10">
                                                        <div>
                                                            <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'text-[#c5a059]' : 'text-gray-400'}`}>Monthly Pay</p>
                                                            <h4 className="text-2xl font-black">
                                                                {isSubscription ? `${val}개월 약정` : `월 ${val === 11 ? '111,000' : val === 22 ? '222,000' : '333,000'}원`}
                                                            </h4>
                                                        </div>
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#c5a059] bg-[#c5a059]' : 'border-gray-200'}`}>
                                                            {isSelected && <CheckCircle size={14} className="text-[#001a3d]" />}
                                                        </div>
                                                    </div>
                                                    <div className={`mt-6 pt-6 border-t border-dashed ${isSelected ? 'border-white/10' : 'border-gray-100'}`}>
                                                        <div className="flex justify-between items-end">
                                                            <span className={`text-xs font-bold ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>{isSubscription ? '월 구독료' : '초기 선납금'}</span>
                                                            <span className="text-xl font-black font-outfit">{isSubscription ? calculation : calculation}</span>
                                                        </div>
                                                        {isDisabled && (
                                                            <p className="text-[10px] text-red-400 mt-2 font-bold">* 렌탈 총액이 견적가보다 큽니다. 선택 불가.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Document Upload */}
                            {rentalStep === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                                    {/* Real-time Save Notice Banner */}
                                    <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-[2rem] space-y-3 shadow-sm">
                                        <div className="flex items-center gap-2 text-blue-700">
                                            <div className="w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-lg">
                                                <CheckCircle size={14} />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.1em]">Security & Auto-Save</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-gray-900 text-[13px] font-black leading-tight break-keep">
                                                업로드된 파일은 실시간으로 안전하게 자동 저장됩니다.
                                            </p>
                                            <p className="text-gray-500 text-[11px] font-bold leading-relaxed break-keep">
                                                모든 서류 준비가 끝났다면 [다음으로]를 눌러 신청을 완료하시고, 서류가 더 필요하다면 창을 닫으신 후 나중에 다시 업로드하셔도 됩니다.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-[#001a3d]">필수 서류를<br />등록해주세요</h3>
                                        <p className="text-gray-500 text-sm font-bold opacity-80">부동산 소유 형태에 따라 필요한 서류가 다릅니다.</p>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Type Selector */}
                                        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-1">
                                            {[
                                                { id: 'own_own', label: '본인 소유' },
                                                { 
                                                    id: 'family_own', 
                                                    label: applicationType === 'subscription' ? '가족소유' : '가족소유(불가)', 
                                                    disabled: applicationType === 'subscription' ? false : true 
                                                },
                                                { 
                                                    id: 'move_own', 
                                                    label: applicationType === 'subscription' ? '이사예정' : '이사예정(불가)', 
                                                    disabled: applicationType === 'subscription' ? false : true 
                                                }
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => !t.disabled && setRentalForm({ ...rentalForm, ownershipType: t.id })}
                                                    disabled={t.disabled}
                                                    className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${rentalForm.ownershipType === t.id
                                                        ? 'bg-[#001a3d] text-white shadow-md'
                                                        : t.disabled ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-400 hover:text-gray-600'
                                                        }`}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Upload Area */}
                                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
                                            {/* Dynamic Content Based on Type */}
                                            {/* 본인 소유 */}
                                            {rentalForm.ownershipType === 'own_own' && (
                                                <div className="space-y-6">
                                                    {[
                                                        { key: 'registry', label: '등기부등본', desc: '본인 명의의 부동산임을 증명해야 합니다.', icon: <Upload size={18} /> },
                                                        { key: 'id_card', label: '신분증 사본', desc: '신원을 확인하기 위한 서류입니다.', icon: <ShieldCheck size={18} /> },
                                                        ...(applicationType === 'subscription' ? [{ key: 'bank_book', label: '통장사본(자동이체용)', desc: '구독료 자동이체 설정을 위한 서류입니다.', icon: <Upload size={18} /> }] : [])
                                                    ].map(doc => (
                                                        <div key={doc.key} className="space-y-4">
                                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-xs font-bold leading-relaxed">
                                                                📌 <b>{doc.label}</b>을 첨부해주세요.<br />
                                                                <span className="opacity-70 font-medium">{doc.desc}</span>
                                                            </div>
                                                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                                                                <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(doc.key, e)} />
                                                                <div className="mx-auto text-gray-300 mb-2 group-hover:text-[#c5a059] transition-colors flex justify-center">{doc.icon}</div>
                                                                <p className="text-xs font-black text-gray-500">
                                                                    {doc.label} 사진/파일 업로드
                                                                    <span className="block text-[10px] text-gray-400 font-medium mt-1">(여러 장 선택 가능)</span>
                                                                </p>
                                                            </div>
                                                            {rentalForm.files[doc.key] && rentalForm.files[doc.key].map((f, i) => (
                                                                <div key={i} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 border border-gray-100">
                                                                    <span className="truncate flex-1">{f.name}</span>
                                                                    <button onClick={() => removeFile(doc.key, i)} className="text-gray-400 hover:text-red-500 p-1"><X size={14} /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* 가족 소유 */}
                                            {rentalForm.ownershipType === 'family_own' && (
                                                <div className="space-y-6">
                                                    {[
                                                        { key: 'registry', label: '등기부등본', desc: '부동산 소유주 확인을 위한 서류입니다.', icon: <Upload size={18} /> },
                                                        { key: 'family', label: '가족관계증명서', desc: '소유주와의 관계를 증명해야 합니다.', icon: <Upload size={18} /> },
                                                        { key: 'id_card', label: '신분증 사본', desc: '신원을 확인하기 위한 서류입니다.', icon: <ShieldCheck size={18} /> },
                                                        { key: 'bank_book', label: '통장사본(자동이체용)', desc: '구독/렌탈료 자동이체 설정을 위한 서류입니다.', icon: <Upload size={18} /> }
                                                    ].map(doc => (
                                                        <div key={doc.key} className="space-y-4">
                                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-xs font-bold leading-relaxed">
                                                                📌 <b>{doc.label}</b>을 첨부해주세요.<br />
                                                                <span className="opacity-70 font-medium">{doc.desc}</span>
                                                            </div>
                                                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                                                                <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(doc.key, e)} />
                                                                <div className="mx-auto text-gray-300 mb-2 group-hover:text-[#c5a059] transition-colors flex justify-center">{doc.icon}</div>
                                                                <p className="text-xs font-black text-gray-500">
                                                                    {doc.label} 사진/파일 업로드
                                                                    <span className="block text-[10px] text-gray-400 font-medium mt-1">(여러 장 선택 가능)</span>
                                                                </p>
                                                            </div>
                                                            {rentalForm.files[doc.key] && rentalForm.files[doc.key].map((f, i) => (
                                                                <div key={i} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 border border-gray-100">
                                                                    <span className="truncate flex-1">{f.name}</span>
                                                                    <button onClick={() => removeFile(doc.key, i)} className="text-gray-400 hover:text-red-500 p-1"><X size={14} /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* 이사 예정 */}
                                            {rentalForm.ownershipType === 'move_own' && (
                                                <div className="space-y-6">
                                                    {[
                                                        { key: 'contract', label: '부동산 매매계약서', desc: '이사 예정인 주소지의 계약 증빙이 필요합니다.', icon: <Upload size={18} /> },
                                                        { key: 'id_card', label: '신분증 사본', desc: '신원을 확인하기 위한 서류입니다.', icon: <ShieldCheck size={18} /> },
                                                        { key: 'bank_book', label: '통장사본(자동이체용)', desc: '구독/렌탈료 자동이체 설정을 위한 서류입니다.', icon: <Upload size={18} /> }
                                                    ].map(doc => (
                                                        <div key={doc.key} className="space-y-4">
                                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-xs font-bold leading-relaxed">
                                                                📌 <b>{doc.label}</b>을 첨부해주세요.<br />
                                                                <span className="opacity-70 font-medium">{doc.desc}</span>
                                                            </div>
                                                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                                                                <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(doc.key, e)} />
                                                                <div className="mx-auto text-gray-300 mb-2 group-hover:text-[#c5a059] transition-colors flex justify-center">{doc.icon}</div>
                                                                <p className="text-xs font-black text-gray-500">
                                                                    {doc.label} 사진/파일 업로드
                                                                    <span className="block text-[10px] text-gray-400 font-medium mt-1">(여러 장 선택 가능)</span>
                                                                </p>
                                                            </div>
                                                            {rentalForm.files[doc.key] && rentalForm.files[doc.key].map((f, i) => (
                                                                <div key={i} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-xs font-bold text-gray-600 border border-gray-100">
                                                                    <span className="truncate flex-1">{f.name}</span>
                                                                    <button onClick={() => removeFile(doc.key, i)} className="text-gray-400 hover:text-red-500 p-1"><X size={14} /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Agreements */}
                            {rentalStep === 4 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 pb-12">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-[#001a3d]">마지막으로<br />동의가 필요해요</h3>
                                        <p className="text-gray-500 text-sm font-bold">
                                            {applicationType === 'subscription' ? '신용조회를 위해 약관 확인이 필요합니다.' : '신용조회를 위한 약관 동의가 필요합니다.'}
                                        </p>
                                    </div>

                                    {applicationType === 'subscription' ? (
                                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-8">
                                            <div className="flex flex-col items-center justify-center text-center space-y-6 py-8">
                                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
                                                    <ShieldCheck size={32} />
                                                </div>
                                                <div className="space-y-4">
                                                    <p className="text-sm font-bold text-gray-600 leading-relaxed text-center">
                                                        - 아래 링크를 클릭해서 모바일 신용조회 동의를 진행해주세요.<br />
                                                        - 아래 링크 클릭 시 앞에 입력한 내용은 자동 저장 됩니다.<br />
                                                        - 동의 완료 후 별도 신용조회 후 담당자가 안내드릴 예정입니다.
                                                    </p>
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm(`${applicationType === 'subscription' ? '구독' : '렌탈'} 신청을 완료하시겠습니까?\n제출된 정보로 신용조회가 진행됩니다.`)) {
                                                                 setIsSubmitting(true);
                                                                 
                                                                 // 구독은 전자서명 없이 신청 데이터만 저장
                                                                 const res = await submitSubscriptionApplication(data, rentalForm, draftId);
                                                                setIsSubmitting(false);

                                                                if (res.success) {
                                                                    const successMsg = `구독 신청이 정상적으로 저장되었습니다.\n이어서 열리는 페이지를 통해 모바일 신용조회 동의를 반드시 진행해주세요.\n신용조회 동의 확인 후 담당자가 별도 연락 드릴 예정입니다.(1~2일 소요)`;
                                                                    alert(successMsg);
                                                                    window.open("https://m.hankookcapital.co.kr/ib20/mnu/HKMUCR010101", "_blank");
                                                                    setIsRentalMode(false);
                                                                    setApplicationType(null);
                                                                    setRentalStep(1);
                                                                } else {
                                                                    alert("신청 중 오류가 발생했습니다: " + res.message);
                                                                }
                                                            }
                                                        }}
                                                        className="inline-flex items-center gap-2 bg-[#001a3d] text-white px-8 py-4 rounded-2xl font-black text-base hover:bg-blue-900 transition-all shadow-lg active:scale-95 text-center leading-tight"
                                                    >
                                                        {isSubmitting ? <Loader2 className="animate-spin" /> : (
                                                            <>
                                                                지금까지 내용 저장하고<br />
                                                                모바일 신용조회 동의하기 <ExternalLink size={18} />
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* All Agreement Checkbox */}
                                            <button
                                                onClick={() => {
                                                    const allChecked = rentalForm.agreements.agree1 && rentalForm.agreements.agree2 && rentalForm.agreements.agree3;
                                                    setRentalForm(prev => ({
                                                        ...prev,
                                                        agreements: { agree1: !allChecked, agree2: !allChecked, agree3: !allChecked }
                                                    }));
                                                }}
                                                className="w-full flex items-center gap-3 p-5 bg-blue-50/50 rounded-2xl border border-blue-100 transition-all active:scale-[0.98]"
                                            >
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${rentalForm.agreements.agree1 && rentalForm.agreements.agree2 && rentalForm.agreements.agree3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                    <CheckCircle size={16} />
                                                </div>
                                                <span className="font-black text-[#001a3d]">모든 약관에 전체 동의합니다.</span>
                                            </button>

                                            <div className="space-y-4">
                                                {/* Agreement 1 */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-sm font-black text-gray-700">개인(신용)정보 수집·이용 동의서 (필수)</span>
                                                        <button onClick={() => setRentalForm(prev => ({ ...prev, agreements: { ...prev.agreements, agree1: !prev.agreements.agree1 } }))}>
                                                            <CheckCircle size={20} className={rentalForm.agreements.agree1 ? "text-blue-600" : "text-gray-300"} />
                                                        </button>
                                                    </div>
                                                    <div className="h-24 overflow-y-auto p-4 bg-gray-50 rounded-xl text-[11px] text-gray-500 leading-relaxed font-medium border border-gray-100">
                                                        (주)비에스온 귀하<br /><br />
                                                        귀사와의 상거래와 관련하여 귀사가 본인의 개인(신용)정보를 수집·이용하고자 하는 경우에는 「개인정보 보호법」 제15조 및 제22조, 「신용정보의 이용 및 보호에 관한 법률」 제32조, 제33조 및 제34조에 따라 동의를 얻어야 합니다. 이에 본인은 귀사가 아래의 내용과 같이 본인의 개인(신용)정보를 수집·이용하는데 동의합니다.<br /><br />
                                                        1. 개인(신용)정보의 필수적 수집 · 이용에 관한 사항<br /><br />
                                                        1) 개인(신용)정보의 수집 · 이용 목적<br />
                                                        • 상거래 관계의 설정·이행·유지·관리, 법령상 의무이행, 분쟁처리, 민원처리, 본인여부확인 등<br />
                                                        2) 수집·이용할 개인(신용)정보의 내용<br />
                                                        • 개인식별정보 : 성명, 주소, 연락처, E-mail, 출생등록지, 성별, 국적, 본인인증정보, 기타 식별정보 등<br />
                                                        • 기타 계약의 설정·이행·유지·관리 등과 관련하여 본인이 제공한 정보 등<br />
                                                        3) 개인(신용)정보의 보유 및 이용기간<br />
                                                        • 동의일로부터 개인(신용)정보의 수집·이용 목적을 달성할 때까지<br />
                                                        • 다만, 관련법규에 별도 규정이 있는 경우 그 기간을 따름<br />
                                                        ※ 귀하는 동의를 거부할 권리가 있으나, 동의하지 않는 경우 계약의 설정·이행·유지·관리 등이 불가능할 수 있음을 알려드립니다.
                                                    </div>
                                                </div>

                                                {/* Agreement 2 */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-sm font-black text-gray-700">개인(신용)정보의 조회 동의서 (필수)</span>
                                                        <button onClick={() => setRentalForm(prev => ({ ...prev, agreements: { ...prev.agreements, agree2: !prev.agreements.agree2 } }))}>
                                                            <CheckCircle size={20} className={rentalForm.agreements.agree2 ? "text-blue-600" : "text-gray-300"} />
                                                        </button>
                                                    </div>
                                                    <div className="h-24 overflow-y-auto p-4 bg-gray-50 rounded-xl text-[11px] text-gray-500 leading-relaxed font-medium border border-gray-100">
                                                        (주)비에스온 귀하<br /><br />
                                                        본인은 귀사가 「신용정보의 이용 및 보호에 관한 법률」 제32조 제2항에 따라 아래와 같은 내용으로 신용조회회사, 신용정보집중기관 등으로부터 본인의 개인(신용)정보를 조회하는 것에 동의합니다.<br /><br />
                                                        1. 조회 대상 기관<br />
                                                        • 종합신용정보집중기관 : 한국신용정보원, 여신금융협회 등<br />
                                                        • 신용조회회사 : 코리아크레딧뷰로(주), NICE평가정보(주)<br />
                                                        2. 조회할 개인(신용)정보<br />
                                                        • 개인식별정보 : 성명, 주소, 연락처(휴대폰 등), E-mail, 성별, 국적, 본인인증 및 식별정보 등<br />
                                                        • 신용거래정보 : 대출, 보증, 담보제공, 당좌거래, 신용카드, 할부금융과 관련한 금융거래 등 상거래와 관련하여 그 거래의 종류, 기간, 금액 및 한도 등에 관한 사항<br />
                                                        • 신용도판단정보 : 연체, 부도, 대위변제, 대지급, 신용질서 문란행위와 관련된 금액 및 발생 · 해소의 시기 등에 관한 사항<br />
                                                        • 신용능력정보 : 직업, 재산, 채무, 소득의 총액, 납세실적 등 신용거래능력을 판단할 수 있는 정보<br />
                                                        • 공공기관정보 : 개인회생, 파산, 면책 등에 관한 신청 및 법원의 결정 관련정보, 채무불이행자명부 등재·말소 결정, 체납정보, 신용회복관련정보 등<br />
                                                        • 신용평가정보 : 신용등급, 신용평점 등<br />
                                                        • 기타 본인의 신용을 판단할 수 있는 정보 등<br />
                                                        3. 조회목적<br />
                                                        • 상거래 관계의 설정·이행·유지·관리, 법령상 의무이행, 분쟁처리, 민원처리, 본인여부확인 등<br />
                                                        4. 조회동의 효력기간<br />
                                                        • 동의일로부터 당해 계약의 종료일(예 : 기간만기, 계약해지 등) 또는 동의철회 시 까지 동의의 효력이 유지 됨<br />
                                                        • 다만, 관련법규에 별도 규정이 있는 경우 그 기간을 따르며, 귀하가 신청한 계약이 체결되지 아니한 경우에는 그 시점부터 동의의 효력은 소멸합니다.<br />
                                                        5. 조회자의 개인(신용)정보의 보유 및 이용기간<br />
                                                        • 개인(신용)정보를 제공받는 날로부터 조회목적을 달성할 때까지<br />
                                                        • 다만, 관련법규에 별도 규정이 있는 경우 그 기간을 따름<br /><br />
                                                        ※ 귀하는 동의를 거부할 권리가 있으나, 동의하지 않는 경우 계약의 설정·이행·유지·관리 등이 불가능할 수 있음을 알려드립니다.<br />
                                                        ※ 신용조회기록은 무등급자에 대한 신용등급산정 이외에는 신용등급에 영향을 미치지 않습니다.
                                                    </div>
                                                </div>

                                                {/* Agreement 3 */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-sm font-black text-gray-700">개인(신용)정보 제공 동의서 (필수)</span>
                                                        <button onClick={() => setRentalForm(prev => ({ ...prev, agreements: { ...prev.agreements, agree3: !prev.agreements.agree3 } }))}>
                                                            <CheckCircle size={20} className={rentalForm.agreements.agree3 ? "text-blue-600" : "text-gray-300"} />
                                                        </button>
                                                    </div>
                                                    <div className="h-24 overflow-y-auto p-4 bg-gray-50 rounded-xl text-[11px] text-gray-500 leading-relaxed font-medium border border-gray-100">
                                                        (주)비에스온 귀하<br /><br />
                                                        귀사와의 상거래와 관련하여 귀사가 본인의 개인(신용)정보를 「개인정보 보호법」 제17조 및 제22조, 「신용정보의 이용 및 보호에 관한 법률」 제32조, 제33조 및 제34조에 따라 제3자에게 제공할 경우 본인의 동의를 얻어야 합니다. 이에 본인은 귀사가 본인의 개인(신용)정보를 아래와 같이 제3자에게 제공하는데 동의합니다.<br /><br />
                                                        1. 개인(신용)정보의 필수적 제공에 관한 사항<br /><br />
                                                        (1) 신용정보집중기관 및 신용조회회사에 개인(신용)정보 제공<br />
                                                        1) 개인(신용)정보를 제공받는 자<br />
                                                        • 종합신용정보집중기관 : 한국신용정보원, 여신금융협회 등<br />
                                                        • 신용조회회사 : 코리아크레딧뷰로(주), NICE평가정보(주)<br />
                                                        2) 제공받는 자의 이용 목적<br />
                                                        • 신용정보의 집중·관리 및 활용 등 신용정보집중기관의 업무<br />
                                                        • 본인의 신용판단 자료 및 공공기관 정책자료로 활용<br />
                                                        • 신용평가, 실명확인 등 신용조회회사의 업무<br />
                                                        3) 제공할 개인(신용)정보의 내용<br />
                                                        • 개인식별정보 : 성명, 주소, 연락처(휴대폰 등), E-mail, 성별, 국적, 본인인증 및 식별정보 등<br />
                                                        • 기타 본인의 신용을 판단할 수 있는 정보 등<br />
                                                        4) 제공받는 자의 개인(신용)정보 보유 및 이용기간<br />
                                                        • 개인(신용)정보를 제공받는 자의 이용목적을 달성할 때까지<br />
                                                        • 다만, 관련법규에 별도 규정이 있는 경우 그 기간을 따름
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 전자서명 (렌탈 전용) */}
                                    {applicationType === 'rental' && (
                                        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-200 shadow-sm relative overflow-hidden text-left mt-6">
                                            <div className="mb-4">
                                                <h4 className="text-sm font-black text-[#001a3d] flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-[#001a3d] text-white rounded-md flex items-center justify-center shadow-md"><ShieldCheck size={14} /></div>
                                                    전자 서명 <span className="text-red-500">*</span>
                                                </h4>
                                                <p className="text-[11px] text-gray-500 font-bold mt-1">위에 정자로 서명해주세요. 입력하신 서명은 정보동의서에 자동 표기됩니다.</p>
                                            </div>
                                            <div className="bg-white border-2 border-dashed border-gray-300 rounded-[1.5rem] relative overflow-hidden transition-all hover:border-[#c5a059]/50">
                                                <SignaturePad 
                                                    ref={sigCanvas} 
                                                    canvasProps={{ className: 'w-full h-40 bg-white cursor-crosshair' }} 
                                                />
                                                <button 
                                                    onClick={() => { sigCanvas.current.clear(); setSignatureImg(null); }} 
                                                    className="absolute top-3 right-3 text-[10px] bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg shadow-sm font-black hover:bg-gray-200 active:scale-95 transition-all outline-none"
                                                >
                                                    다시 쓰기
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bottom Action Button */}
                        {rentalStep <= 4 && !(rentalStep === 4 && applicationType === 'subscription') && (
                            <div className="p-5 md:p-8 bg-white border-t border-gray-100 safe-area-bottom flex flex-col gap-3">
                                {rentalStep === 3 && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm("첨부파일을 업데이트 하시겠습니까?")) {
                                                alert("첨부파일 정보가 안전하게 업데이트 되었습니다.");
                                                setIsRentalMode(false);
                                            }
                                        }}
                                        className="w-full bg-gray-50 text-[#001a3d] py-4 rounded-2xl text-base font-black transition-all border border-gray-100 flex items-center justify-center gap-2 hover:bg-gray-100 active:scale-[0.98]"
                                    >
                                        첨부파일 업데이트 하기
                                    </button>
                                )}
                                <button
                                    disabled={(() => {
                                        if (rentalStep === 1) return !rentalForm.birthDate || rentalForm.birthDate.length < 10 || !rentalForm.gender;
                                        if (rentalStep === 2) {
                                            if (applicationType === 'subscription') return !rentalForm.selectedAmount;
                                            const calc = calculatePackage(data.finalBenefit, rentalForm.selectedAmount * 10000, rentalForm.selectedAmount * 500000 / 1.1);
                                            return !rentalForm.selectedAmount || calc === '해당없음';
                                        }
                                        if (rentalStep === 3) {
                                            // Allow proceeding if at least one file is uploaded across any category
                                            const allFiles = Object.values(rentalForm.files).flat();
                                            return allFiles.length === 0;
                                        }
                                        if (rentalStep === 4) {
                                            return !rentalForm.agreements.agree1 || !rentalForm.agreements.agree2 || !rentalForm.agreements.agree3;
                                        }
                                        return false;
                                    })()}
                                    onClick={async () => {
                                        if (rentalStep < 4) {
                                            setRentalStep(prev => prev + 1);
                                        } else {
                                            // Handle final submission for RENTAL (Subscription is handled inside STEP 4 UI)
                                            showConfirm(
                                                '렌탈 신청을 완료하시겠습니까?\n제출된 정보로 신용조회가 진행됩니다.',
                                                async () => {
                                                    const pdfFile = await generateSignedPdf();
                                                    if (!pdfFile) return;

                                                    setIsSubmitting(true);

                                                    // 1. PDF 파일 업로드 (스토리지 저장)
                                                    let newStorageId;
                                                    try {
                                                        newStorageId = await uploadSingleFile(pdfFile);
                                                    } catch(e) { 
                                                        console.error("PDF 업로드 실패:", e); 
                                                    }

                                                    // 2. 신청 폼 데이터 구성 (PDF 파일 포함)
                                                    const updatedForm = {
                                                        ...rentalForm,
                                                        files: {
                                                            ...rentalForm.files,
                                                            agreementsPdf: newStorageId ? [{ name: pdfFile.name, storageId: newStorageId }] : []
                                                        }
                                                    };

                                                    const res = await submitRentalApplication(data, updatedForm, draftId);
                                                    setIsSubmitting(false);

                                                    if (res.success) {
                                                        showAlert(
                                                            `렌탈 신청이 정상적으로 완료되었습니다.\n신청 가능 여부를 확인한 후 담당자를 통해 연락드리겠습니다.\n감사합니다.(1~2일 소요)`,
                                                            '신청 완료'
                                                        );
                                                        setIsRentalMode(false);
                                                        setApplicationType(null);
                                                        setRentalStep(1);
                                                    } else {
                                                        showAlert("신청 중 오류가 발생했습니다: " + res.message, "오류");
                                                    }
                                                }
                                            );
                                        }
                                    }}
                                    className="w-full bg-[#001a3d] text-white py-4 rounded-2xl text-lg font-black shadow-xl hover:bg-blue-900 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : (
                                        rentalStep === 4 ? '신청 완료하기' : (rentalStep === 3 ? '신용조회 동의하러 가기' : '다음으로')
                                    )}
                                    {!isSubmitting && rentalStep < 4 && <ChevronRight size={20} />}
                                </button>
                            </div>
                        )}
                        {showSaveToast && (
                            <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[300] bg-[#001a3d] text-[#c5a059] px-8 py-4 rounded-2xl font-black text-sm shadow-2xl animate-in fade-in slide-in-from-top-4 flex items-center gap-3 border-2 border-[#c5a059]/30 backdrop-blur-xl">
                                <div className="w-6 h-6 bg-[#c5a059] text-[#001a3d] rounded-lg flex items-center justify-center shadow-lg">
                                    <CheckCircle size={16} />
                                </div>
                                <span className="text-white tracking-tight">{saveMessage}</span>
                            </div>
                        )}
                    </div>
                )
            }
            {/* Custom Confirm/Alert Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-[#001a3d]/80 backdrop-blur-sm" onClick={() => {
                        if (confirmModal.type === 'alert') setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }}></div>
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
                        <div className="p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-[#f0f4f9] text-[#001a3d] rounded-2xl flex items-center justify-center mx-auto mb-2">
                                {confirmModal.type === 'alert' ? <ShieldCheck size={32} /> : <Calculator size={32} />}
                            </div>
                            <h3 className="text-xl font-black text-[#001a3d] leading-tight">{confirmModal.title}</h3>
                            <p className="text-gray-500 font-bold text-sm leading-relaxed whitespace-pre-wrap break-keep">
                                {confirmModal.message}
                            </p>
                        </div>
                        <div className="flex border-t border-gray-100 h-16">
                            {confirmModal.showCancel && (
                                <button
                                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 text-gray-400 font-black text-sm hover:bg-gray-50 transition-colors border-r border-gray-100"
                                >
                                    {confirmModal.cancelText}
                                </button>
                            )}
                            <button
                                onClick={confirmModal.onConfirm}
                                className={`flex-1 font-black text-sm transition-colors ${confirmModal.type === 'alert' ? 'text-[#001a3d] hover:bg-gray-50' : 'text-blue-600 hover:bg-blue-50'}`}
                            >
                                {confirmModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerPage;
