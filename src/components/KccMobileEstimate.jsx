import React, { useState, useEffect, useRef } from 'react';
import '../styles/kcc-estimate.scoped.css';
import logoImg from '../assets/logo.png';
import windowImg from '../assets/window.webp';
import kitchenImg from '../assets/kitchen.webp';

export default function KccMobileEstimate({
  data: propData,
  isLoggedIn = false,
  onOpenSearch,
  onOpenApplication,
  onSaveConsultation
}) {
  // Use propData if provided, otherwise fallback to the default sample quote
  const data = propData || {
    name: '주원',
    address: '용인시 수지구 51평',
    type: '가견적',
    date: '2026.07.08',
    kccPrice: 11556600,
    finalBenefit: 10500000,
    _id: '0870'
  };

  const finalBenefit = Number(data.finalBenefit) || 10500000;
  const totalSum = Number(data.kccPrice) || 11556600;
  const discountAmount = Math.max(0, totalSum - finalBenefit);
  const halfAmount = Math.floor(finalBenefit * 0.5);
  const balanceAmount = finalBenefit - halfAmount;

  // 60-Month Amortization with ~9.4% annual rate
  const annualRate = 0.094;
  const r = annualRate / 12;

  // Plan 2: Low Upfront (500k upfront)
  const upfrontA = 500000;
  const balanceA = Math.max(0, finalBenefit - upfrontA);
  const monthlyA = Math.round((balanceA * r) / (1 - Math.pow(1 + r, -60)) / 1000) * 1000;
  const totalA = upfrontA + (monthlyA * 60);

  // Plan 3: Low Monthly (50% upfront)
  const upfrontB = halfAmount;
  const balanceB = balanceAmount;
  const monthlyB = Math.round((balanceB * r) / (1 - Math.pow(1 + r, -60)) / 1000) * 1000;
  const totalB = upfrontB + (monthlyB * 60);

  const money = (val) => new Intl.NumberFormat('ko-KR').format(Math.round(val || 0)) + '원';

  const plans = {
    cash: {
      name: '일시불 할인 결제',
      detail: `총 ${money(finalBenefit)} · 선금 50% / 잔금 50%`,
      button: '일시불 결제 상담하기'
    },
    lowupfront: {
      name: '초기 부담을 줄이는 렌탈',
      detail: `초기 ${money(upfrontA)} + 월 ${money(monthlyA)} × 60개월`,
      button: `초기 ${Math.round(upfrontA / 10000)}만원 조건 상담하기`
    },
    lowmonthly: {
      name: '월 부담을 줄이는 렌탈',
      detail: `초기 ${money(upfrontB)} + 월 ${money(monthlyB)} × 60개월`,
      button: `월 ${Math.round(monthlyB / 10000)}만${Math.round((monthlyB % 10000) / 1000)}천원 조건 상담하기`
    }
  };

  const defaultWindows = [
    {
      name: '입구 좌 분합창',
      type: '공틀창225',
      amount: 1401007,
      size: '2,800 × 2,400 mm',
      shape: '2W (1:2)',
      model: 'HW ONE(V)_BF225TM',
      glass: '내부 24T 투명 + 로이(V)',
      handle: 'L-PLUS_N 반자동 HANDLE (대)',
      mesh: '미포함',
      panes: 2
    },
    {
      name: '입구 우 분합창',
      type: '공틀창225',
      amount: 1296585,
      size: '2,550 × 2,400 mm',
      shape: '2W',
      model: 'HW ONE(V)_BF225TM',
      glass: '내부 24T 투명 + 로이(V)',
      handle: 'L-PLUS_N 반자동 HANDLE (대)',
      mesh: '미포함',
      panes: 2
    },
    {
      name: '안방 이중창',
      type: '일반이중창230',
      amount: 2274097,
      size: '3,400 × 1,800 mm',
      shape: '3W (1:2:1)',
      model: 'HW ONE(V)_BF230R',
      glass: '내부 24T 미스트 + 로이(V) / 외부 24T 투명 + 로이(V)',
      handle: 'L-PLUS_N HANDLE (대)',
      mesh: '미포함',
      panes: 3
    },
    {
      name: '주방 발코니 1',
      type: '발코니창141',
      amount: 2282156,
      size: '4,200 × 2,300 mm',
      shape: '3W (1:2:1)',
      model: 'HW ONE(V)_HBF141S',
      glass: '28T 더블로이 + 투명(V)',
      handle: 'L-PLUS_N HANDLE (대)',
      mesh: '블랙 STS 방충망',
      panes: 3,
      upgrade: true
    },
    {
      name: '주방 발코니 2',
      type: '발코니창141',
      amount: 2592379,
      size: '4,850 × 2,300 mm',
      shape: '3W (1:2:1)',
      model: 'HW ONE(V)_HBF141S',
      glass: '28T 더블로이 + 투명(V)',
      handle: 'L-PLUS_N HANDLE (대)',
      mesh: '블랙 STS 방충망',
      panes: 3,
      upgrade: true
    },
    {
      name: '주방B 고정창',
      type: '고정창',
      amount: 280450,
      size: '1,100 × 1,300 mm',
      shape: 'CB-90+FM / 100면 유리',
      model: 'HW ONE(V)_고정창',
      glass: '24T 더블로이 + 투명(V)',
      handle: '해당 없음',
      mesh: '미포함',
      panes: 1
    }
  ];

  const defaultEtc = [
    { name: '기존 창호 철거', amount: 440000 },
    { name: '사다리차', sub: '15층 이하', amount: 385000 },
    { name: '부분 보양비', amount: 385000 },
    { name: '몰딩 마감', amount: 220000 }
  ];

  // Parse items from data if available
  let windows = defaultWindows;
  let extraCosts = defaultEtc;

  if (Array.isArray(data.items) && data.items.length > 0) {
    const rawWindows = data.items.filter((i) => !i.isEtc && !String(i.loc || '').includes('기타'));
    const rawEtc = data.items.filter((i) => i.isEtc || String(i.loc || '').includes('기타'));

    if (rawWindows.length > 0) {
      windows = rawWindows.map((w) => {
        const shape = w.winType || w.shape || '2W';
        const panes = shape.includes('3W') || shape.includes('3짝') ? 3 : (shape.includes('고정') || shape.includes('FIX')) ? 1 : 2;
        const glass = w.glassIn ? `${w.glassIn}${w.glassOut ? ' / ' + w.glassOut : ''}` : w.glass || '24T 투명 + 로이(V)';
        const mesh = w.screen || w.mesh || '미포함';
        const upgrade = Boolean(glass.includes('더블로이') || mesh.includes('STS'));
        return {
          name: w.loc || w.name,
          type: w.prod || w.type || '창호',
          amount: w.price || w.amount || 0,
          size: w.size || '-',
          shape: shape,
          model: w.model || '-',
          glass: glass,
          handle: w.handle || '핸들 미포함',
          mesh: mesh,
          panes: panes,
          upgrade: upgrade
        };
      });
    }

    if (rawEtc.length > 0) {
      extraCosts = rawEtc.map((e) => ({
        name: e.loc || e.name || '기타 공사',
        sub: e.spec || '',
        amount: e.price || e.amount || 0
      }));
    }
  }

  // State
  const [selectedPlan, setSelectedPlan] = useState('cash');
  const [activeNav, setActiveNav] = useState('estimate');

  // Consultation Modal State
  const [isConsultOpen, setIsConsultOpen] = useState(false);
  const [dialogContext, setDialogContext] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [preferredTime, setPreferredTime] = useState('상관없음');
  const [memo, setMemo] = useState('');
  const [consultSubmitted, setConsultSubmitted] = useState(false);
  const [isSubmittingConsult, setIsSubmittingConsult] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const topics = [
    '총비용과 추가 비용',
    '결제 방식 비교',
    '제품이나 시공 범위 변경',
    '시공 일정과 소요 시간',
    '시공 후 A/S와 보증 범위'
  ];

  // Helper for Window SVG schematic
  const renderWindowIcon = (panes) => (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path className="glass-fill" d="M5 6h30v28H5z" />
      <path d={`M4 5h32v30H4zM6 7h28v26H6z${panes === 2 ? 'M20 5v30' : panes === 3 ? 'M13 5v30M27 5v30' : ''}`} />
      {panes > 1 && <path d="M10 18v5M30 18v5" />}
    </svg>
  );

  // Scrollspy effect
  useEffect(() => {
    const handleScroll = () => {
      const pos = window.scrollY + 160;
      const sections = ['estimate', 'payment', 'details', 'contact'];
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.offsetTop <= pos) {
          setActiveNav(sections[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showToastMsg = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const openConsult = (topic = '', context = '') => {
    setConsultSubmitted(false);
    setSelectedTopics(topic ? [topic] : ['총비용과 추가 비용']);
    setDialogContext(context || `견적 No. ${data._id ? data._id.slice(-4) : '0870'} · ${topic || '견적 상담'}`);
    setIsConsultOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeConsult = () => {
    setIsConsultOpen(false);
    document.body.style.overflow = '';
  };

  const handleConsultSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingConsult(true);

    const consultData = {
      quoteId: data._id,
      customerName: data.name,
      customerPhone: data.phone || '010-****-8355',
      paymentMethod: selectedPlan,
      topics: selectedTopics,
      preferredTime: preferredTime,
      memo: memo,
      createdAt: new Date().toISOString()
    };

    if (onSaveConsultation) {
      try {
        await onSaveConsultation(consultData);
        showToastMsg('상담 요청이 접수되었습니다.');
      } catch (err) {
        console.error('Consultation save error:', err);
      }
    }

    setIsSubmittingConsult(false);
    setConsultSubmitted(true);
  };

  const quoteNo = data._id ? data._id.slice(-4) : '0870';
  const customerName = data.name || '주원';
  const customerAddress = data.address || '용인시 수지구 51평';
  const quoteDate = data.date || '2026.07.08';
  const statusBadge = data.statusType || data.type || '가견적';

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="kcc-scope">
      {/* SVG Definitions */}
      <svg className="svg-defs" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" /></symbol>
          <symbol id="i-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></symbol>
          <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></symbol>
          <symbol id="i-phone" viewBox="0 0 24 24"><path d="M6 3H3c-1 9 9 19 18 18v-3l-5-3-2 2c-3-1-6-4-7-7l2-2-3-5Z" /></symbol>
          <symbol id="i-chat" viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z" /><path d="M7 10h8m-8 4h5" /></symbol>
          <symbol id="i-window" viewBox="0 0 24 24"><path d="M3 3h18v18H3zM12 3v18M3 14h18m-9-7v3m6-3v3" /></symbol>
          <symbol id="i-shield" viewBox="0 0 24 24"><path d="m12 2 8 3v6c0 5-8 10-8 10S4 16 4 11V5l8-3Z" /><path d="m8 11 3 3 5-5" /></symbol>
          <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
          <symbol id="i-close" viewBox="0 0 24 24"><path d="m6 6 12 12M6 18 18 6" /></symbol>
          <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v1" /></symbol>
          <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></symbol>
        </defs>
      </svg>

      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <a href="#estimate" aria-label="견적 첫 화면" className="brand">
            <img src={logoImg} alt="KCC 홈씨씨" width="130" height="38" />
          </a>
          <span className="header-label">나의 창호 견적</span>
          
          <button
            type="button"
            className="icon-btn"
            style={{ marginLeft: 'auto' }}
            onClick={() => openConsult('견적 상담')}
            aria-label="견적 상담 열기"
          >
            <svg><use href="#i-chat" /></svg>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="layout">
        <div className="main-column">
          {/* Hero Section */}
          <section className="hero" id="estimate">
            <img
              className="hero-image"
              src={windowImg}
              alt="햇살이 들어오는 거실 공간 연출 이미지"
              fetchPriority="high"
            />
            <div className="hero-shade"></div>
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="status-dot"></span> PERSONAL QUOTATION{' '}
                <span className="quote-badge">{statusBadge}</span>
              </div>
              <p className="greeting">{customerName} 고객님을 위한 제안</p>
              <h1>
                우리 집 창호 교체,<br />
                비용과 결제 방법을<br />
                <span>한눈에.</span>
              </h1>
              <p className="hero-sub">
                좋은 창을 고르는 일부터,<br />
                부담에 맞는 결제 방법까지.
              </p>
            </div>
            <span className="image-caption">공간 연출 이미지</span>
            <div className="customer-strip">
              <span>{customerAddress}</span>
              <span>No. {quoteNo}</span>
            </div>
          </section>

          {/* Quote Card */}
          <div className="quote-wrap">
            <section className="quote-card" aria-label="견적 금액 요약">
              <div className="quote-top">
                <span>일시불 할인 적용 예상금액</span>
                <span className="small muted">부가세 포함</span>
              </div>
              <div className="quote-price">
                {new Intl.NumberFormat('ko-KR').format(finalBenefit)}
                <span>원</span>
              </div>
              <div className="discount">
                <del>{money(totalSum)}</del>
                <span>
                  <svg><use href="#i-down" /></svg> {money(discountAmount)} 할인
                </span>
              </div>
              <div className="split-pay">
                <span>
                  <svg><use href="#i-check" /></svg> 선금 50% · 잔금 50%
                </span>
                <span>각 {money(halfAmount)}</span>
              </div>
              <button
                type="button"
                className="primary large full"
                onClick={() => openConsult('총비용과 추가 비용')}
              >
                내 견적 상담하기
                <svg><use href="#i-arrow" /></svg>
              </button>
              <p className="soft-help">궁금한 항목만 편하게 물어보세요.</p>
            </section>
            <div className="quote-meta">
              <span>견적일 {quoteDate}</span>
              <button
                type="button"
                className="text-button"
                onClick={() => scrollTo('faq')}
              >
                {statusBadge} 안내 <svg><use href="#i-info" /></svg>
              </button>
            </div>
            <p className="estimate-note">
              현장 확인 및 최종 시공 사양에 따라 금액이 달라질 수 있습니다.
            </p>
          </div>

          {/* Sticky Navigation */}
          <nav className="section-nav" aria-label="견적서 메뉴">
            <a
              className={activeNav === 'estimate' ? 'active' : ''}
              href="#estimate"
              onClick={(e) => { e.preventDefault(); scrollTo('estimate'); }}
            >
              견적 요약
            </a>
            <a
              className={activeNav === 'payment' ? 'active' : ''}
              href="#payment"
              onClick={(e) => { e.preventDefault(); scrollTo('payment'); }}
            >
              결제 방법
            </a>
            <a
              className={activeNav === 'details' ? 'active' : ''}
              href="#details"
              onClick={(e) => { e.preventDefault(); scrollTo('details'); }}
            >
              시공 내역
            </a>
            <a
              className={activeNav === 'contact' ? 'active' : ''}
              href="#contact"
              onClick={(e) => { e.preventDefault(); scrollTo('contact'); }}
            >
              상담하기
            </a>
          </nav>

          {/* Section 01: Payment Options */}
          <section className="section" id="payment">
            <div className="section-kicker">01 <span>PAYMENT OPTIONS</span></div>
            <h2>어떤 결제 방법이<br />편하신가요?</h2>
            <p className="section-description">먼저 낼 금액과 매월 낼 금액을 함께 비교해보세요.</p>

            <div className="payment-list" role="radiogroup" aria-label="결제 방법 선택">
              {/* Cash Card */}
              <button
                className={`pay-card ${selectedPlan === 'cash' ? 'selected' : ''}`}
                type="button"
                role="radio"
                aria-checked={selectedPlan === 'cash'}
                onClick={() => setSelectedPlan('cash')}
              >
                <div className="pay-heading">
                  <span className="radio-mark"></span>
                  <span>총 납부금액을 줄이고 싶다면</span>
                  <span className="pay-tag">일시불</span>
                </div>
                <div className="pay-main">
                  <span>할인 적용 금액</span>
                  <strong>
                    {new Intl.NumberFormat('ko-KR').format(finalBenefit)}
                    <small>원</small>
                  </strong>
                </div>
                <div className="pay-facts">
                  <span>선금 <b>{money(halfAmount)}</b></span>
                  <span>잔금 <b>{money(balanceAmount)}</b></span>
                </div>
                <div className="pay-footer">
                  <span>카드 또는 현금 결제</span>
                  <b>총 {money(finalBenefit)}</b>
                </div>
              </button>

              {/* Low Upfront Rental Card */}
              <button
                className={`pay-card ${selectedPlan === 'lowupfront' ? 'selected' : ''}`}
                type="button"
                role="radio"
                aria-checked={selectedPlan === 'lowupfront'}
                onClick={() => setSelectedPlan('lowupfront')}
              >
                <div className="pay-heading">
                  <span className="radio-mark"></span>
                  <span>처음 내는 금액을 줄이고 싶다면</span>
                  <span className="pay-tag">60개월 렌탈</span>
                </div>
                <div className="pay-main">
                  <span>월 납부금액</span>
                  <strong>
                    {new Intl.NumberFormat('ko-KR').format(monthlyA)}
                    <small>원</small>
                  </strong>
                </div>
                <div className="pay-facts">
                  <span>초기 납입액 <b>{money(upfrontA)}</b></span>
                  <span>납부기간 <b>60개월</b></span>
                </div>
                <div className="pay-footer">
                  <span>초기 납입액 + 월 납부액 합계</span>
                  <b>총 {money(totalA)}</b>
                </div>
              </button>

              {/* Low Monthly Rental Card */}
              <button
                className={`pay-card ${selectedPlan === 'lowmonthly' ? 'selected' : ''}`}
                type="button"
                role="radio"
                aria-checked={selectedPlan === 'lowmonthly'}
                onClick={() => setSelectedPlan('lowmonthly')}
              >
                <div className="pay-heading">
                  <span className="radio-mark"></span>
                  <span>매월 내는 금액을 줄이고 싶다면</span>
                  <span className="pay-tag">60개월 렌탈</span>
                </div>
                <div className="pay-main">
                  <span>월 납부금액</span>
                  <strong>
                    {new Intl.NumberFormat('ko-KR').format(monthlyB)}
                    <small>원</small>
                  </strong>
                </div>
                <div className="pay-facts">
                  <span>초기 납입액 <b>{money(upfrontB)}</b></span>
                  <span>납부기간 <b>60개월</b></span>
                </div>
                <div className="pay-footer">
                  <span>초기 납입액 + 월 납부액 합계</span>
                  <b>총 {money(totalB)}</b>
                </div>
              </button>
            </div>

            <button
              className="primary full"
              id="plan-cta"
              type="button"
              onClick={() => openConsult('결제 방식 비교', `${plans[selectedPlan].name} · ${plans[selectedPlan].detail}`)}
            >
              {plans[selectedPlan].button}
              <svg><use href="#i-arrow" /></svg>
            </button>
            <p className="fineprint">
              렌탈 총 납부액은 초기 납입액과 60개월 월 납부액의 합계입니다. 계약 조건은 상담 시 확인해주세요.
            </p>

            <button
              className="help-link"
              type="button"
              onClick={() => openConsult('결제 방식 비교')}
            >
              아직 고민되세요? <b>결제 방법 함께 비교하기</b>
              <svg><use href="#i-arrow" /></svg>
            </button>
          </section>

          {/* Section 02: Included & Upgrades */}
          <section className="section included" id="included">
            <div className="section-kicker">02 <span>WHAT’S INCLUDED</span></div>
            <h2>가격만큼 중요한,<br />견적에 담긴 내용.</h2>
            <p className="section-description">우리 집에 필요한 창호와 부대 작업을 확인하세요.</p>

            <div className="included-summary">
              <svg><use href="#i-window" /></svg>
              <div>
                <strong>창호 <b>{windows.length}</b>개 항목</strong>
                <p>분합창 · 이중창 · 발코니창 · 고정창</p>
              </div>
              <span>견적 반영</span>
            </div>

            <div className="work-grid">
              <div>
                <svg><use href="#i-check" /></svg>
                <strong>기존 창호 철거</strong>
              </div>
              <div>
                <svg><use href="#i-check" /></svg>
                <strong>사다리차</strong>
                <small>15층 이하 기준</small>
              </div>
              <div>
                <svg><use href="#i-check" /></svg>
                <strong>부분 보양</strong>
              </div>
              <div>
                <svg><use href="#i-check" /></svg>
                <strong>몰딩 마감</strong>
              </div>
            </div>

            <p className="fineprint">
              현장에 따라 달라질 수 있는 작업과 추가 비용은 상담에서 함께 확인해보세요.
            </p>
            <button
              className="text-link"
              type="button"
              onClick={() => openConsult('총비용과 추가 비용')}
            >
              포함 내역과 추가 비용 확인하기
              <svg><use href="#i-arrow" /></svg>
            </button>

            <div className="benefit-banner">
              <div className="benefit-art" aria-hidden="true">
                <div className="glass one"></div>
                <div className="glass two"></div>
                <div className="glass three"></div>
                <span>+</span>
              </div>
              <div>
                <span className="mini-label">WINDOW UPGRADE</span>
                <h3>작은 차이까지,<br />좋은 창의 기준으로.</h3>
                <p>더블로이 유리 · 블랙 STS 방충망</p>
                <button
                  className="text-link"
                  type="button"
                  onClick={() => scrollTo('details')}
                >
                  우리 집 적용 사양 보기
                  <svg><use href="#i-arrow" /></svg>
                </button>
              </div>
            </div>
            <p className="fineprint">
              업그레이드 적용 여부는 창호별로 다릅니다. 아래 상세 내역에서 적용 위치와 사양을 확인해주세요.
            </p>
          </section>

          {/* Section 03: Your Windows */}
          <section className="section" id="details">
            <div className="section-kicker">03 <span>YOUR WINDOWS</span></div>
            <div className="section-title-row">
              <h2>어느 공간을<br />어떻게 바꾸나요?</h2>
              <span className="count-badge">창호 {windows.length}</span>
            </div>
            <p className="section-description">항목을 누르면 크기와 세부 사양을 볼 수 있어요.</p>

            <div id="window-list" className="window-list">
              {windows.map((w, idx) => (
                <details className="window-item" key={idx}>
                  <summary>
                    <div className="window-thumb">
                      {renderWindowIcon(w.panes)}
                    </div>
                    <div className="window-name">
                      <strong>{w.name}</strong>
                      <small>{w.type}</small>
                    </div>
                    <strong className="window-amount">{money(w.amount)}</strong>
                    <svg><use href="#i-down" /></svg>
                  </summary>
                  <div className="window-detail">
                    <dl>
                      <div><dt>규격</dt><dd>{w.size}</dd></div>
                      <div><dt>창 형태</dt><dd>{w.shape}</dd></div>
                      <div><dt>모델명</dt><dd>{w.model}</dd></div>
                      <div><dt>유리 사양</dt><dd>{w.glass}</dd></div>
                      <div><dt>핸들</dt><dd>{w.handle}</dd></div>
                      <div><dt>방충망</dt><dd>{w.mesh}</dd></div>
                    </dl>
                    {w.upgrade && (
                      <span className="tag">더블로이 유리 · STS 방충망 적용</span>
                    )}
                    <button
                      className="text-link"
                      type="button"
                      onClick={() => openConsult(`${w.name} 사양 상담`)}
                    >
                      이 창호에 대해 문의하기
                      <svg><use href="#i-arrow" /></svg>
                    </button>
                  </div>
                </details>
              ))}
            </div>

            {/* Extra Costs */}
            <div className="extra-costs">
              <h3>부대 작업 <span>{extraCosts.length}개 항목</span></h3>
              <dl>
                {extraCosts.map((e, idx) => (
                  <div key={idx}>
                    <dt>{e.name} {e.sub && <small>{e.sub}</small>}</dt>
                    <dd>{money(e.amount)}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="item-total">
              <span>원본 견적 합계 <small>부가세 포함</small></span>
              <strong>{money(totalSum)}</strong>
            </div>
            <p className="fineprint">
              개별 항목 표시금액 합계와 원본 견적 총액 간 정산 기준은 최종 계약 시 확인합니다.
            </p>

            <button
              className="outline full"
              type="button"
              onClick={() => openConsult('제품이나 시공 범위 변경')}
            >
              제품 사양 상담하기
              <svg><use href="#i-arrow" /></svg>
            </button>
          </section>

          {/* Section 04: FAQ */}
          <section className="section faq-section" id="faq">
            <div className="section-kicker">04 <span>BEFORE YOU DECIDE</span></div>
            <h2>결정 전, 궁금하실 이야기.</h2>
            <div className="faq-list">
              <details>
                <summary>
                  이 금액으로 확정되는 건가요?
                  <svg><use href="#i-plus" /></svg>
                </summary>
                <p>
                  현재 견적은 {statusBadge}입니다. 현장 실측 확인, 최종 제품 사양, 작업 범위에 따라 금액이 달라질 수 있습니다. 변경되는 항목과 비용을 확인한 뒤 결정해주세요.
                </p>
              </details>
              <details>
                <summary>
                  일시불도 나누어 낼 수 있나요?
                  <svg><use href="#i-plus" /></svg>
                </summary>
                <p>
                  현재 견적은 선금 50%와 잔금 50%로 나누어 납부하는 방식입니다. 할인 적용금액 기준 각 {money(halfAmount)}원이며, 납부 시점은 상담에서 확인해주세요.
                </p>
              </details>
              <details>
                <summary>
                  시공과 A/S는 어떻게 진행되나요?
                  <svg><use href="#i-plus" /></svg>
                </summary>
                <p>
                  KCC홈씨씨 본사 정품 시공 안내와 함께, 고객님 견적에 적용되는 제품별 보증 대상·기간(최대 13년)·제외 조건을 상담에서 확인하실 수 있습니다.
                </p>
                <button
                  className="text-link"
                  type="button"
                  onClick={() => openConsult('시공 후 A/S와 보증 범위')}
                >
                  보증 범위 상담하기
                  <svg><use href="#i-arrow" /></svg>
                </button>
              </details>
            </div>
          </section>

          {/* Contact Section */}
          <section className="contact-section" id="contact">
            <div className="contact-icon">
              <svg><use href="#i-chat" /></svg>
            </div>
            <span className="mini-label">LET’S TALK ABOUT YOUR HOME</span>
            <h2>{customerName} 고객님,<br />어떤 부분을 도와드릴까요?</h2>
            <p>
              어려운 제품명도, 복잡한 결제 조건도.<br />
              고객님의 견적을 보며 함께 정리해드릴게요.
            </p>

            <div className="contact-chips">
              <button type="button" onClick={() => openConsult('총비용과 추가 비용')}>총비용 · 추가금</button>
              <button type="button" onClick={() => openConsult('결제 방식 비교')}>결제 방법</button>
              <button type="button" onClick={() => openConsult('시공 일정과 소요 시간')}>시공 일정</button>
              <button type="button" onClick={() => openConsult('시공 후 A/S와 보증 범위')}>제품 · 보증</button>
            </div>

            <button
              className="orange full"
              type="button"
              onClick={() => openConsult('견적 상담')}
            >
              이 견적으로 상담 요청하기
              <svg><use href="#i-arrow" /></svg>
            </button>
            <span className="contact-foot">궁금한 항목만 선택해서 남겨주세요.</span>
          </section>

          {/* Extras Section */}
          <section className="section extras">
            <div className="section-kicker">PLUS <span>FOR YOUR HOME</span></div>
            <h2>함께 알아보면 좋은 혜택.</h2>
            <p className="section-description">창호 교체와 함께, 우리 집을 위한 다른 선택.</p>

            <button
              className="lg-card"
              type="button"
              onClick={() => openConsult('LG 가전구독 할인 혜택')}
            >
              <div>
                <span className="mini-label">LG ELECTRONICS</span>
                <h3>가전도 바꿀 계획이라면?</h3>
                <p>가전구독료 10% 할인 프로모션</p>
                <small>적용 제품·기간·조건 상담 확인</small>
              </div>
              <span className="lg-rate">
                10<small>%</small>
                <svg><use href="#i-arrow" /></svg>
              </span>
            </button>

            <button
              className="kitchen-card"
              type="button"
              onClick={() => openConsult('KCC 맞춤 주방 상담')}
            >
              <img src={kitchenImg} alt="주방 공간 연출 이미지" loading="lazy" />
              <div>
                <span>PRESTIGE KITCHEN · 공간 연출 이미지</span>
                <h3>창 너머, 주방까지 새롭게.</h3>
                <p>
                  KCC 프리미엄 맞춤 주방 상담
                  <svg><use href="#i-arrow" /></svg>
                </p>
              </div>
            </button>
          </section>

          {/* Footer */}
          <footer>
            <div className="footer-brand">
              KCC글라스 홈씨씨 <span>×</span> 티유디지털
            </div>
            <p>
              (주)티유디지털 · 대표이사 김정열<br />
              서울시 가산디지털1로 83, 파트너스타워1, 802호<br />
              사업자등록번호 220-87-15092
            </p>
            <div className="demo-note">
              <span className="demo-dot"></span>
              안내 · 본 견적서는 KCC글라스 공식 파트너 (주)티유디지털에서 제공합니다.
            </div>
            <p className="copyright">A BETTER WINDOW, A BETTER HOME.</p>
          </footer>
        </div>

        {/* Desktop Aside (Sticky Summary) */}
        <aside className="desktop-aside">
          <div className="aside-inner">
            <span className="aside-eyebrow">KCC HOMECC</span>
            <h2>좋은 창을 고르는<br />가장 편안한 방법.</h2>
            <p>
              고객님의 공간을 위한 제안,<br />
              한 장의 견적서에 담았습니다.
            </p>
            <div className="aside-rule"></div>
            <div className="aside-customer">
              <span className="avatar">{customerName.slice(0, 1)}</span>
              <div>
                <strong>{customerName} 고객님</strong>
                <span>{statusBadge} No. {quoteNo}</span>
              </div>
              <span className="live-dot"></span>
            </div>
            <dl>
              <div>
                <dt>일시불 할인 적용</dt>
                <dd>{money(finalBenefit)}</dd>
              </div>
              <div>
                <dt>창호 교체</dt>
                <dd>{windows.length}개 항목</dd>
              </div>
              <div>
                <dt>결제 방법</dt>
                <dd>일시불 · 구독 · 렌탈</dd>
              </div>
            </dl>
            <button
              className="primary full"
              type="button"
              onClick={() => openConsult('견적 상담')}
            >
              내 견적 상담하기
              <svg><use href="#i-arrow" /></svg>
            </button>
            <div className="aside-assurance">
              <svg><use href="#i-shield" /></svg>
              <span>
                시공부터 보증 범위까지<br />
                고객님의 견적에 맞춰 확인하세요.
              </span>
            </div>
          </div>
        </aside>
      </main>

      {/* Mobile Fixed Bottom Bar */}
      <div className="bottom-bar">
        <div>
          <button
            className="bottom-secondary"
            type="button"
            onClick={() => {
              if (window.confirm('담당 상담원과 전화 연결하시겠습니까?')) {
                window.location.href = 'tel:1588-0000';
              }
            }}
          >
            <svg><use href="#i-phone" /></svg>
            전화 상담
          </button>
          <button
            className="primary"
            type="button"
            onClick={() => openConsult('견적 상담')}
          >
            내 견적 상담하기
            <svg><use href="#i-arrow" /></svg>
          </button>
        </div>
      </div>

      {/* Consultation Modal / Bottom Sheet */}
      {isConsultOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#12232e]/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeConsult}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-[24px] sm:rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[92dvh] overflow-y-auto relative animate-in slide-in-from-bottom-5 duration-300 text-[#192838]"
            onClick={(e) => e.stopPropagation()}
            style={{ overscrollBehavior: 'contain' }}
          >
            {/* Sheet grip for mobile */}
            <div className="sm:hidden w-8 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

            <button
              className="absolute right-4 top-4 w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
              type="button"
              onClick={closeConsult}
              aria-label="상담 화면 닫기"
            >
              <svg style={{ width: '16px', height: '16px' }}><use href="#i-close" /></svg>
            </button>

            {!consultSubmitted ? (
              <div id="consult-content">
                <span className="mini-label" style={{ fontSize: '9px', letterSpacing: '0.15em', color: '#86938e', fontWeight: 700 }}>
                  PERSONAL CONSULTATION
                </span>
                <h2 id="consult-title" style={{ fontSize: '24px', fontWeight: 800, marginTop: '8px', lineHeight: 1.3 }}>
                  궁금한 점을 남겨주세요.
                </h2>
                <p className="dialog-sub" style={{ fontSize: '12px', color: '#8a969f', marginTop: '6px' }}>
                  {customerName} 고객님의 견적을 기준으로 안내해드립니다.
                </p>

                <div
                  className="selected-plan"
                  style={{
                    margin: '18px 0',
                    background: '#fff5ed',
                    border: '1px solid #f3e1d3',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#986239',
                    fontWeight: 600,
                    lineHeight: 1.6
                  }}
                >
                  {dialogContext}
                </div>

                <form onSubmit={handleConsultSubmit}>
                  <fieldset style={{ border: 0, padding: 0, margin: '20px 0' }}>
                    <legend style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', display: 'block' }}>
                      어떤 부분이 궁금하신가요? <span style={{ fontSize: '11px', color: '#9da7af', fontWeight: 400, marginLeft: '4px' }}>복수 선택</span>
                    </legend>
                    <div className="topic-options" style={{ display: 'grid', gap: '8px' }}>
                      {topics.map((t, idx) => (
                        <label
                          key={idx}
                          style={{
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                            fontSize: '12px',
                            border: `1px solid ${selectedTopics.includes(t) ? '#84949f' : '#e4e8eb'}`,
                            background: selectedTopics.includes(t) ? '#f5f8fa' : '#fff',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 500
                          }}
                        >
                          <input
                            type="checkbox"
                            name="topic"
                            value={t}
                            checked={selectedTopics.includes(t)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTopics(prev => [...prev, t]);
                              } else {
                                setSelectedTopics(prev => prev.filter(x => x !== t));
                              }
                            }}
                            style={{ width: '16px', height: '16px', accentColor: '#192838' }}
                          />
                          <span>{t}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset style={{ border: 0, padding: 0, margin: '20px 0' }}>
                    <legend style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', display: 'block' }}>
                      연락받기 편한 시간 <span style={{ fontSize: '11px', color: '#9da7af', fontWeight: 400, marginLeft: '4px' }}>선택</span>
                    </legend>
                    <div className="time-options" style={{ display: 'flex', gap: '8px' }}>
                      {['오전', '오후', '상관없음'].map((t) => (
                        <label key={t} style={{ flex: 1, cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="time"
                            value={t}
                            checked={preferredTime === t}
                            onChange={() => setPreferredTime(t)}
                            style={{ position: 'absolute', opacity: 0 }}
                          />
                          <span
                            style={{
                              display: 'block',
                              textAlign: 'center',
                              padding: '11px',
                              border: `1px solid ${preferredTime === t ? '#192838' : '#e4e8eb'}`,
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: preferredTime === t ? 700 : 500,
                              background: preferredTime === t ? '#192838' : '#fff',
                              color: preferredTime === t ? '#fff' : '#192838',
                              transition: 'all 0.15s'
                            }}
                          >
                            {t}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div style={{ margin: '20px 0' }}>
                    <label
                      htmlFor="memo"
                      style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block' }}
                    >
                      추가로 궁금한 점 <span style={{ fontSize: '11px', color: '#9da7af', fontWeight: 400, marginLeft: '4px' }}>선택</span>
                    </label>
                    <textarea
                      id="memo"
                      rows={3}
                      maxLength={500}
                      placeholder="변경하고 싶은 창호나 궁금한 점을 남겨주세요."
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      style={{
                        border: '1px solid #e2e6e9',
                        borderRadius: '8px',
                        width: '100%',
                        padding: '12px 14px',
                        color: '#374e5e',
                        resize: 'vertical',
                        fontSize: '13px',
                        background: '#fbfcfc',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div
                    className="contact-confirm"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      background: '#f6f8f9',
                      padding: '13px 14px',
                      margin: '15px 0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#8b969f'
                    }}
                  >
                    <span>연락처 확인</span>
                    <strong style={{ color: '#192838', fontWeight: 700 }}>
                      {data.phone ? data.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1-****-$2') : '010-****-8355'}
                    </strong>
                    <small style={{ width: '100%', fontSize: '10px', color: '#9aa6ae', marginTop: '4px' }}>
                      이름과 연락처를 다시 입력할 필요가 없어요.
                    </small>
                  </div>

                  <div
                    className="preview-notice"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '11px',
                      color: '#8b969f',
                      lineHeight: 1.6,
                      margin: '16px 0'
                    }}
                  >
                    <svg style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }}><use href="#i-info" /></svg>
                    <span>상담 요청을 접수하시면 담당자가 확인 후 지정하신 시간에 맞춰 연락드립니다.</span>
                  </div>

                  <button
                    className="primary full large"
                    type="submit"
                    disabled={isSubmittingConsult}
                    style={{
                      width: '100%',
                      minHeight: '52px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '14px',
                      background: '#192838',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    {isSubmittingConsult ? '상담 요청 접수 중...' : '상담 요청 접수하기'}
                    <svg style={{ width: '18px', height: '18px' }}><use href="#i-arrow" /></svg>
                  </button>
                </form>
              </div>
            ) : (
              <div id="success-content" style={{ padding: '20px 0', textAlign: 'center' }}>
                <div
                  className="success-icon"
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#edf5ef',
                    color: '#678a77',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '10px auto 20px'
                  }}
                >
                  <svg style={{ width: '32px', height: '32px' }}><use href="#i-check" /></svg>
                </div>
                <span className="mini-label" style={{ fontSize: '9px', letterSpacing: '0.15em', color: '#86938e', fontWeight: 700 }}>
                  CONSULTATION RECEIVED
                </span>
                <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '8px', lineHeight: 1.3 }}>
                  상담 요청이<br />정상 접수되었습니다.
                </h2>
                <p style={{ fontSize: '13px', color: '#8b98a1', lineHeight: 1.8, marginTop: '12px' }}>
                  전문 상담사가 고객님의 견적과<br />
                  문의 내용을 확인한 뒤 안내해 드립니다.
                </p>
                <div
                  id="success-summary"
                  style={{
                    background: '#f5f7f8',
                    padding: '18px',
                    textAlign: 'left',
                    fontSize: '12px',
                    color: '#556976',
                    borderRadius: '10px',
                    margin: '22px 0',
                    lineHeight: 1.8
                  }}
                >
                  <p><b>{customerName} 고객님</b> · 견적 No. {quoteNo}</p>
                  <p>문의: {selectedTopics.join(', ') || '견적 전반 상담'}</p>
                  <p>희망 시간: {preferredTime}</p>
                  {memo && <p>메모: {memo}</p>}
                </div>
                <p className="fineprint" style={{ fontSize: '11px', color: '#9aa2a9' }}>
                  빠른 상담을 원하시면 하단의 [전화 상담]을 이용해 주세요.
                </p>
                <button
                  className="primary full"
                  type="button"
                  onClick={closeConsult}
                  style={{
                    width: '100%',
                    minHeight: '50px',
                    marginTop: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '14px',
                    background: '#192838',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  내 견적 다시 보기
                  <svg style={{ width: '18px', height: '18px' }}><use href="#i-arrow" /></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast */}
      <div id="toast" className={showToast ? 'show' : ''} role="status" aria-live="polite">
        {toastMessage}
      </div>
    </div>
  );
}
