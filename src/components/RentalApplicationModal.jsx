import React, { useState, useEffect, useRef } from 'react';
import '../styles/rental.css';
import logoImg from '../assets/logo.png';
import { uploadSingleFile } from '../lib/api';

const DEFAULT_TERMS = [
  {
    id: 'collection',
    title: '개인(신용)정보 수집·이용 동의서',
    body: `[개인(신용)정보 수집·이용 안내]
1. 수집·이용 목적: KCC 창호 렌탈 서비스 신청 접수, 본인 확인, 계약 체결 여부 심사 및 상담 안내
2. 수집 항목: 성명, 생년월일, 휴대전화번호, 주소, 신분증 사본, 전자서명 정보
3. 보유 및 이용 기간: 렌탈 서비스 신청 접수일로부터 계약 종료 및 법정 의무 보존 기간까지
4. 귀하는 개인정보 수집·이용에 동의하지 않을 권리가 있으나, 미동의 시 렌탈 서비스 신청 및 심사가 불가합니다.`
  },
  {
    id: 'inquiry',
    title: '개인(신용)정보 조회 동의서',
    body: `[개인(신용)정보 조회 안내]
1. 조회 목적: 렌탈 계약 체결 및 유지를 위한 신용조회 및 렌탈 자격 심사
2. 조회 기관: 렌탈 제휴 금융사 및 신용정보집중기관(NICE평가정보, 코리아크레딧뷰로 등)
3. 조회 항목: 개인식별정보, 신용도평가정보(신용평점, 대출현황, 연체정보 등)
4. 동의의 효력 기간: 본 동의일로부터 렌탈 신청 심사 완료 및 계약 체결 종료일까지`
  },
  {
    id: 'provision',
    title: '개인(신용)정보 제공 동의서',
    body: `[개인(신용)정보 제3자 제공 안내]
1. 제공받는 자: KCC글라스 공식 파트너사, 렌탈 제휴 금융사
2. 제공 목적: 렌탈 심사 진행, 시공 일정 조율 및 사후 A/S 관리
3. 제공 항목: 성명, 연락처, 주소, 견적 및 시공 세부 사양, 렌탈 신청 정보
4. 보유 및 이용 기간: 서비스 제공 목적 달성 및 관계 법령에 따른 보존 기간까지`
  }
];

export default function RentalApplicationModal({
  isOpen,
  onClose,
  planKey = 'lowupfront',
  plan = { title: '초기 부담을 줄이는 렌탈', upfront: 500000, monthly: 222000, months: 60 },
  quote = { id: '0870', customerName: '주원', phone: '010-3261-8355', location: '용인시 수지구 · 51평', product: 'KCC 홈씨씨 창호 교체' },
  onSubmitApplication,
}) {
  const [step, setStep] = useState(1);
  const [birthDate, setBirthDate] = useState('');
  const [birthError, setBirthError] = useState('');
  const [priceCheck, setPriceCheck] = useState(false);

  // File upload state
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileError, setFileError] = useState('');

  // Terms state
  const [termChecks, setTermChecks] = useState({
    collection: false,
    inquiry: false,
    provision: false,
  });
  const [allTermsChecked, setAllTermsChecked] = useState(false);
  const [expandedTerms, setExpandedTerms] = useState({
    collection: false,
    inquiry: false,
    provision: false,
  });

  // Signature state
  const canvasRef = useRef(null);
  const [strokes, setStrokes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [hasSigned, setHasSigned] = useState(false);
  const [isSignatureExpanded, setIsSignatureExpanded] = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);

  // Flow & error states
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptId, setReceiptId] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const won = (n) => new Intl.NumberFormat('ko-KR').format(Math.round(n || 0)) + '원';
  const totalAmount = (plan.upfront || 0) + (plan.monthly || 0) * (plan.months || 60);

  // Reset modal when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setBirthDate('');
      setBirthError('');
      setPriceCheck(false);
      clearFile();
      clearSignature();
      setTermChecks({ collection: false, inquiry: false, provision: false });
      setAllTermsChecked(false);
      setFormError('');
      setIsComplete(false);
      setIsSubmitting(false);
      setReceiptId('');
      setShowExitConfirm(false);
      setHasChanged(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, planKey]);

  // Sync All Terms checkbox
  useEffect(() => {
    const values = Object.values(termChecks);
    const allChecked = values.length > 0 && values.every(Boolean);
    setAllTermsChecked(allChecked);
  }, [termChecks]);

  // Canvas drawing & resize
  const paintCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvas.width || !canvas.height) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let scale = 1;
    if (!isDrawing && strokes.length > 0) {
      let extentX = 1;
      let extentY = 0.01;
      for (const stroke of strokes) {
        for (const p of stroke) {
          extentX = Math.max(extentX, p.x);
          extentY = Math.max(extentY, p.y);
        }
      }
      scale = Math.min(canvas.width / (extentX + 0.02), canvas.height / (extentY + 0.02));
      setCanvasScale(scale);
    } else {
      scale = canvasScale;
    }

    ctx.strokeStyle = '#1b334e';
    ctx.lineWidth = 2.4 * (window.devicePixelRatio || 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokes) {
      ctx.beginPath();
      stroke.forEach((p, i) => {
        const x = p.x * scale;
        const y = p.y * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    canvas.width = Math.round(rect.width * (window.devicePixelRatio || 1));
    canvas.height = Math.round(rect.height * (window.devicePixelRatio || 1));
    paintCanvas();
  };

  useEffect(() => {
    if (step === 3) {
      requestAnimationFrame(resizeCanvas);
    }
  }, [step, isSignatureExpanded]);

  useEffect(() => {
    paintCanvas();
    const signed = strokes.some(stroke =>
      stroke.reduce((length, p, i) => (i ? length + Math.hypot(p.x - stroke[i - 1].x, p.y - stroke[i - 1].y) : 0), 0) > 0.07
    );
    setHasSigned(signed);
  }, [strokes]);

  const clearSignature = () => {
    setStrokes([]);
    setCurrentStroke(null);
    setIsDrawing(false);
    setHasSigned(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const scale = canvasScale / (window.devicePixelRatio || 1);
    return {
      x: Math.max(0, Math.min(r.width, e.clientX - r.left)) / scale,
      y: Math.max(0, Math.min(r.height, e.clientY - r.top)) / scale
    };
  };

  const handlePointerDown = (e) => {
    if (isSubmitting || e.button !== 0) return;
    e.preventDefault();
    setIsDrawing(true);
    const pt = getPoint(e);
    const newStroke = [pt];
    setCurrentStroke(newStroke);
    setStrokes((prev) => [...prev, newStroke]);
    e.currentTarget.setPointerCapture(e.pointerId);
    setHasChanged(true);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pt = getPoint(e);
    setStrokes((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last) {
        next[next.length - 1] = [...last, pt];
      }
      return next;
    });
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setCurrentStroke(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // BirthDate formatting & validation
  const handleBirthInput = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = rawDigits.slice(0, 4);
    if (rawDigits.length > 4) formatted += '-' + rawDigits.slice(4, 6);
    if (rawDigits.length > 6) formatted += '-' + rawDigits.slice(6, 8);
    setBirthDate(formatted);
    setBirthError('');
    setHasChanged(true);
    clearSignature();
  };

  const validateBirthDate = () => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
    let valid = false;
    if (m) {
      const year = +m[1];
      const month = +m[2];
      const day = +m[3];
      const d = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      valid = year >= 1900 && d <= today && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
    }
    if (!valid) {
      setBirthError('생년월일을 YYYY-MM-DD 형식의 실제 날짜로 입력해주세요.');
      return false;
    }
    setBirthError('');
    return true;
  };

  // File handling
  const clearFile = () => {
    setFile(null);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl('');
    setFileName('');
    setFileSize('');
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleFileChange = async (e) => {
    const candidate = e.target.files?.[0];
    if (!candidate) return;

    if (candidate.size > 10 * 1024 * 1024) {
      setFileError('10MB 이하의 파일을 선택해주세요.');
      e.target.value = '';
      return;
    }
    if (!candidate.size) {
      setFileError('비어 있는 파일입니다. 다른 사진을 선택해주세요.');
      e.target.value = '';
      return;
    }

    try {
      const bytes = new Uint8Array(await candidate.slice(0, 32).arrayBuffer());
      const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const brand = String.fromCharCode(...bytes.slice(4, 12));
      const heic = brand.startsWith('ftyp') && /heic|heix|hevc|hevx|mif1|msf1/.test(String.fromCharCode(...bytes));

      if (!png && !jpg && !heic) {
        setFileError('JPG, PNG 또는 HEIC 사진을 선택해주세요.');
        e.target.value = '';
        return;
      }
    } catch {
      // Pass through if header check fails
    }

    clearFile();
    setFile(candidate);
    setFileUrl(URL.createObjectURL(candidate));
    setFileName(candidate.name);
    setFileSize(`${(candidate.size / 1024 / 1024).toFixed(2)}MB · 파일 등록 완료`);
    setFileError('');
    setHasChanged(true);
    clearSignature();
  };

  // Step advancement
  const handleNext = () => {
    setFormError('');
    if (step === 1) {
      if (!validateBirthDate()) return;
      if (!priceCheck) {
        setFormError('납부 금액 확인에 체크해주세요.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!file) {
        setFormError('등록할 신분증 사진을 선택해주세요.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (isSubmitting || step <= 1) return;
    setFormError('');
    setStep(step - 1);
  };

  // Submit application
  const handleSubmit = async () => {
    if (!termChecks.collection || !termChecks.inquiry || !termChecks.provision) {
      setFormError('필수 동의 항목을 모두 확인해주세요.');
      return;
    }
    if (!hasSigned) {
      setFormError('계약자 본인의 서명을 입력해주세요.');
      return;
    }
    if (!file) {
      setStep(2);
      setFormError('신분증 사진을 등록해주세요.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      // 1. Upload ID document
      let idStorageId = undefined;
      try {
        idStorageId = await uploadSingleFile(file);
      } catch (err) {
        console.error('ID file upload failed:', err);
      }

      // 2. Export signature as dataURL or upload blob
      let signatureData = '';
      const canvas = canvasRef.current;
      if (canvas) {
        signatureData = canvas.toDataURL('image/png');
      }

      // 3. Prepare application payload
      const applicationData = {
        quoteId: quote.id || undefined,
        name: quote.customerName || '고객',
        phone: quote.phone || '010-3261-8355',
        address: quote.location || '',
        birthDate: birthDate,
        planKey: planKey,
        planTitle: plan.title,
        upfront: plan.upfront,
        monthly: plan.monthly,
        months: plan.months,
        totalAmount: totalAmount,
        idDocumentStorageId: idStorageId,
        idDocumentName: fileName,
        signature: signatureData,
        consents: DEFAULT_TERMS.map(t => ({
          id: t.id,
          title: t.title,
          agreed: true,
          version: '2026-11-11'
        }))
      };

      if (onSubmitApplication) {
        const result = await onSubmitApplication(applicationData);
        if (result && result.receiptId) {
          setReceiptId(result.receiptId);
        } else {
          setReceiptId(`R-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`);
        }
      } else {
        setReceiptId(`R-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`);
      }

      setIsComplete(true);
      setStep(4);
    } catch (err) {
      console.error('Rental application submit error:', err);
      setFormError('신청 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAttempt = () => {
    if (isSubmitting) return;
    if (hasChanged && !isComplete) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="rental-modal-backdrop" onClick={handleCloseAttempt}>
      <div className="rental-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="r-shell">
          {/* Header */}
          <header className="r-head">
            <div className="r-topline">
              <div className="r-brand">
                <img src={logoImg} alt="KCC 홈씨씨" />
                <span>렌탈 신청</span>
              </div>
              <button
                className="r-close"
                type="button"
                onClick={handleCloseAttempt}
                aria-label="렌탈 신청 닫기"
              >
                ×
              </button>
            </div>
            <div className="r-eyebrow">MY HOME · RENTAL APPLICATION</div>
            <h2>
              {step === 1 && '내 집을 위한 새로운 시작.'}
              {step === 2 && '신청에 필요한 서류 등록'}
              {step === 3 && '마지막으로 동의와 서명'}
              {step === 4 && '렌탈 신청 접수 완료'}
            </h2>
            <p>
              {step === 1 && '견적에서 바로, 간편하게 신청하세요.'}
              {step === 2 && '계약자 본인의 신분증을 준비해주세요.'}
              {step === 3 && '신청 내용을 확인하고 서명해주세요.'}
              {step === 4 && '접수 내용을 확인해주세요.'}
            </p>

            {/* Progress Bar */}
            {step < 4 && (
              <ol className="r-progress" aria-label="신청 진행 단계">
                <li className={step === 1 ? 'current' : step > 1 ? 'complete' : ''}>
                  <i>{step > 1 ? '✓' : '1'}</i>정보 확인
                </li>
                <li className={step === 2 ? 'current' : step > 2 ? 'complete' : ''}>
                  <i>{step > 2 ? '✓' : '2'}</i>신분증 등록
                </li>
                <li className={step === 3 ? 'current' : ''}>
                  <i>3</i>동의·서명
                </li>
              </ol>
            )}
          </header>

          {/* Body */}
          <div className="r-body">
            {/* Step 1: Info & Plan confirmation */}
            {step === 1 && (
              <section data-r-step="1">
                <div className="r-panel">
                  <h3 className="r-section-title">
                    <span>01</span>신청자 정보를 확인해주세요.
                  </h3>
                  <div className="r-fields">
                    <div className="r-field">
                      <label htmlFor="r-name">계약자 이름</label>
                      <input id="r-name" value={quote.customerName} readOnly />
                    </div>
                    <div className="r-field">
                      <label htmlFor="r-phone">휴대폰 번호</label>
                      <input id="r-phone" value={quote.phone} readOnly />
                    </div>
                    <div className="r-field wide">
                      <label htmlFor="r-birth">
                        생년월일 <span style={{ color: '#ec7229' }}>*</span>
                      </label>
                      <input
                        id="r-birth"
                        type="text"
                        inputMode="numeric"
                        placeholder="YYYY-MM-DD (예: 1985-06-15)"
                        maxLength={10}
                        value={birthDate}
                        onChange={handleBirthInput}
                        aria-invalid={Boolean(birthError)}
                      />
                      <small id="r-birth-help">숫자 8자리를 입력하면 자동으로 구분됩니다.</small>
                      {birthError && <p className="r-error">{birthError}</p>}
                    </div>
                  </div>
                  <p className="r-note">
                    견적서의 신청자 정보입니다. 정보가 다르면 담당자에게 변경을 요청해주세요.
                  </p>
                </div>

                <div className="r-panel r-amount">
                  <div className="r-amount-title">{plan.title}</div>
                  <div className="r-monthly">
                    <span>매월</span>
                    <strong>
                      {won(plan.monthly)}
                    </strong>
                    <span>/ {plan.months}개월</span>
                  </div>
                  <div className="r-cost-grid">
                    <div>
                      <small>초기 납입액</small>
                      <b>{won(plan.upfront)}</b>
                    </div>
                    <div>
                      <small>총 납부 예정금액</small>
                      <b>{won(totalAmount)}</b>
                    </div>
                  </div>
                </div>

                <label className="r-checkline" style={{ marginTop: '14px' }}>
                  <input
                    type="checkbox"
                    checked={priceCheck}
                    onChange={(e) => {
                      setPriceCheck(e.target.checked);
                      setHasChanged(true);
                    }}
                  />
                  <span>
                    위 <b>초기 납입액·월 납부액·총 납부액</b>을 확인했습니다.
                  </span>
                </label>
                <p className="r-note">
                  신청 후 담당자가 계약 조건과 진행 가능 여부를 안내합니다. 신청만으로 계약이 확정되지는 않습니다.
                </p>
              </section>
            )}

            {/* Step 2: ID Photo upload */}
            {step === 2 && (
              <section data-r-step="2">
                <div className="r-eyebrow">DOCUMENT VERIFICATION</div>
                <h3 className="r-upload-title">
                  계약자 본인의<br />신분증을 등록해주세요.
                </h3>
                <p className="r-lead">
                  사진을 선택하거나 바로 촬영할 수 있어요.<br />
                  등록한 파일은 제출 전까지 변경할 수 있습니다.
                </p>

                <div className="r-panel">
                  {!file ? (
                    <div className="r-upload-box">
                      <div className="r-id-art" aria-hidden="true">
                        <div className="r-id-person"></div>
                        <div className="r-id-lines"><i></i><i></i><i></i></div>
                      </div>
                      <strong>신분증 사진 1장</strong>
                      <p>JPG · PNG · HEIC · 최대 10MB</p>
                    </div>
                  ) : (
                    <div className="r-file-card">
                      <img src={fileUrl} alt="선택한 첨부 이미지 미리보기" />
                      <div className="r-file-meta">
                        <div>
                          <strong>{fileName}</strong>
                          <small>{fileSize}</small>
                        </div>
                        <button className="r-remove" type="button" onClick={clearFile}>
                          삭제
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="r-upload-buttons">
                    <button type="button" onClick={() => fileInputRef.current?.click()}>
                      사진 선택
                    </button>
                    <button type="button" onClick={() => cameraInputRef.current?.click()}>
                      카메라로 촬영
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  {fileError && <p className="r-error">{fileError}</p>}

                  <ul className="r-tips">
                    <li>신분증의 네 모서리가 모두 보이게 촬영해주세요.</li>
                    <li>빛 반사나 흔들림 없이 선명한 사진을 사용해주세요.</li>
                    <li>선택한 사진은 최종 신청 시 함께 안전하게 제출됩니다.</li>
                  </ul>
                </div>
                <p className="r-note">
                  카메라 실행 여부는 기기와 브라우저에 따라 달라집니다. 사진 선택으로도 등록할 수 있어요.
                </p>
              </section>
            )}

            {/* Step 3: Terms & Electronic Signature */}
            {step === 3 && (
              <section data-r-step="3">
                <div className="r-panel">
                  <h3 className="r-section-title">
                    <span>03</span>신청에 필요한 동의
                  </h3>

                  <label className="r-checkline r-all">
                    <input
                      type="checkbox"
                      checked={allTermsChecked}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setTermChecks({ collection: checked, inquiry: checked, provision: checked });
                        setHasChanged(true);
                      }}
                    />
                    <span>모든 약관에 전체 동의합니다.</span>
                  </label>

                  <div id="r-terms">
                    {DEFAULT_TERMS.map((term) => (
                      <div className="r-term" key={term.id}>
                        <div className="r-term-head">
                          <label className="r-checkline">
                            <input
                              type="checkbox"
                              checked={Boolean(termChecks[term.id])}
                              onChange={(e) => {
                                setTermChecks((prev) => ({ ...prev, [term.id]: e.target.checked }));
                                setHasChanged(true);
                              }}
                            />
                            <span>
                              {term.title} <small>(필수)</small>
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTerms((prev) => ({ ...prev, [term.id]: !prev[term.id] }))
                            }
                          >
                            {expandedTerms[term.id] ? '접기' : '보기'}
                          </button>
                        </div>
                        {expandedTerms[term.id] && (
                          <div className="r-term-copy">{term.body}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="r-panel">
                  <div className="r-sign-top">
                    <h3>
                      전자 서명 <small style={{ color: '#2967e8' }}>필수</small>
                    </h3>
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsSignatureExpanded((prev) => !prev)}
                      >
                        {isSignatureExpanded ? '작게 보기' : '크게 쓰기'}
                      </button>
                      <button type="button" onClick={clearSignature}>
                        다시 쓰기
                      </button>
                    </div>
                  </div>

                  <div className={`r-sign-wrap ${isSignatureExpanded ? 'expanded' : ''}`}>
                    <canvas
                      ref={canvasRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                    />
                    {!hasSigned && (
                      <div className="r-sign-hint">
                        <span>✎</span>이곳에 계약자 본인이 서명해주세요.
                      </div>
                    )}
                  </div>

                  <div className="r-sign-status">
                    <span className={hasSigned ? 'signed' : ''}>
                      {hasSigned ? '서명을 입력했어요.' : '아직 서명하지 않았어요.'}
                    </span>
                    <span>손가락 · 마우스 · 펜</span>
                  </div>

                  <p className="r-note">
                    위 신청 내용과 동의서를 확인한 후 서명해주세요. 서명은 이번 신청 내용과 함께 제출됩니다.
                  </p>
                </div>

                <div className="r-summary">
                  <div><span>선택 상품</span><strong>{quote.product || 'KCC 홈씨씨 창호 교체'}</strong></div>
                  <div><span>초기 납입액</span><strong>{won(plan.upfront)}</strong></div>
                  <div><span>월 납부액 · {plan.months}개월</span><strong>{won(plan.monthly)}</strong></div>
                  <div><span>총 납부 예정금액</span><strong>{won(totalAmount)}</strong></div>
                </div>
              </section>
            )}

            {/* Step 4: Complete screen */}
            {step === 4 && (
              <section className="r-success">
                <div className="r-success-icon">✓</div>
                <div className="r-eyebrow">APPLICATION RECEIVED</div>
                <h3>
                  렌탈 신청이<br />정상 접수되었습니다.
                </h3>
                <p>
                  담당자가 신청 내용을 확인한 뒤 연락드립니다.<br />
                  계약 확정 여부는 심사 후 별도로 안내합니다.
                </p>

                <div className="r-summary">
                  <div><span>접수 번호</span><strong>{receiptId}</strong></div>
                  <div><span>계약자</span><strong>{quote.customerName} 고객님</strong></div>
                  <div><span>선택 렌탈</span><strong>{plan.title}</strong></div>
                  <div><span>납부 조건</span><strong>초기 {won(plan.upfront)} / 월 {won(plan.monthly)} ({plan.months}개월)</strong></div>
                  <div><span>총 예정금액</span><strong>{won(totalAmount)}</strong></div>
                </div>

                <ol className="r-next-steps">
                  <li>신청 내용 및 신분증 서류 확인</li>
                  <li>필요 시 추가 안내와 렌탈 심사 진행</li>
                  <li>계약 확정 및 시공 일정 협의</li>
                </ol>
              </section>
            )}
          </div>

          {/* Footer */}
          <footer className="r-footer">
            {formError && <p className="r-error" style={{ marginBottom: '10px' }}>{formError}</p>}

            {step < 4 ? (
              <>
                <div className="r-footer-status">
                  <span>STEP {step} OF 3</span>
                  <b>월 {won(plan.monthly)} · {plan.months}개월</b>
                </div>
                <div className="r-button-row">
                  {step > 1 && (
                    <button
                      className="r-button r-secondary"
                      type="button"
                      onClick={handlePrev}
                      disabled={isSubmitting}
                    >
                      이전
                    </button>
                  )}
                  <button
                    className="r-button r-primary"
                    type="button"
                    onClick={handleNext}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? '신청 내용을 전송하고 있어요…'
                      : step === 1
                      ? '신분증 등록하기 →'
                      : step === 2
                      ? '동의·서명으로 계속 →'
                      : '렌탈 신청 접수하기 →'}
                  </button>
                </div>
              </>
            ) : (
              <button
                className="r-button r-primary"
                type="button"
                style={{ width: '100%' }}
                onClick={onClose}
              >
                내 견적서로 돌아가기
              </button>
            )}
          </footer>

          {/* Exit Confirmation Dialog */}
          {showExitConfirm && (
            <div className="r-exit">
              <div>
                <h3>작성을 중단할까요?</h3>
                <p>
                  입력한 생년월일, 첨부파일과 서명이 삭제됩니다. 계속 작성하면 지금 내용을 유지할 수 있어요.
                </p>
                <div className="r-button-row">
                  <button
                    className="r-button r-primary"
                    type="button"
                    onClick={() => setShowExitConfirm(false)}
                  >
                    계속 작성하기
                  </button>
                  <button
                    className="r-button r-secondary"
                    type="button"
                    onClick={() => {
                      setShowExitConfirm(false);
                      onClose();
                    }}
                  >
                    내용 지우고 닫기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
