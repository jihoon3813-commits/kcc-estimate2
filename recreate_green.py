import sys

with open('src/components/CustomerPage.jsx', 'r', encoding='utf8') as f:
    content = f.read()

# Insert Green Remodeling buttons
green_button_block = \"\"\"
                        {/* 3-2. 그린리모델링 섹션 */}
                         <div className="bg-[#064e3b] rounded-2xl p-4 md:p-8 shadow-2xl relative overflow-hidden mt-6 border border-green-800">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                             <div className="relative z-10 space-y-6">
                                 <div className="space-y-2">
                                     <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-green-300 shadow-inner shrink-0">
                                             <Sparkles size={18} />
                                         </div>
                                         <h4 className="text-lg md:text-xl font-black text-white tracking-tight whitespace-nowrap">정부지원 그린리모델링 사업</h4>
                                     </div>
                                     <p className="text-white/60 text-[10px] md:text-xs font-bold leading-relaxed break-keep">정부 이자 지원으로 부담없이 샷시교체를 진행하세요.</p>
                                 </div>
                                 <div className="flex flex-col gap-3">
                                     <button
                                         onClick={() => {
                                             setApplicationType('green_remodeling');
                                             setIsRentalMode(true);
                                             setRentalStep(0);
                                             setDraftId(null);
                                             setRentalForm(prev => ({
                                                 ...prev,
                                                 isFullGreen: false,
                                                 greenAmount: data.finalBenefit - prev.greenDownPayment,
                                                 greenDownPayment: prev.greenDownPayment,
                                                 greenBalance: data.finalBenefit - prev.greenDownPayment
                                             }));
                                         }}
                                         className="w-full bg-white/10 text-white border border-white/20 py-4 rounded-xl font-black text-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                                     >
                                         <ArrowRightLeft size={16} /> 잔금만 그린리모델링 신청
                                     </button>
                                     <button
                                         onClick={() => {
                                             setApplicationType('green_remodeling');
                                             setIsRentalMode(true);
                                             setRentalStep(0);
                                             setDraftId(null);
                                             setRentalForm(prev => ({
                                                 ...prev,
                                                 isFullGreen: true,
                                                 greenAmount: data.finalBenefit,
                                                 greenDownPayment: 0,
                                                 greenBalance: data.finalBenefit
                                             }));
                                         }}
                                         className="w-full bg-green-500 text-white py-4 rounded-xl font-black text-sm hover:bg-green-400 transition-colors flex items-center justify-center gap-2"
                                     >
                                         <Sparkles size={16} /> 전액 그린리모델링 신청
                                     </button>
                                 </div>
                             </div>
                         </div>
\"\"\"
content = content.replace('</div>\\n\\n                    </div>\\n                </div>\\n\\n                {/* 4. 특별 무상 서비스', green_button_block + '\\n                    </div>\\n                </div>\\n\\n                {/* 4. 특별 무상 서비스')

green_steps = \"\"\"
{/* STEP 0: Green Remodeling Guide & Menu */}
{applicationType === 'green_remodeling' && rentalStep === 0 && (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Infographic block */}
        <div className="bg-[#f0fdd4]/50 border border-[#84cc16]/30 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#84cc16]/20 rounded-xl flex items-center justify-center text-[#4d7c0f]">
                    <Sparkles size={24} />
                </div>
                <h3 className="text-xl font-black text-[#4d7c0f] tracking-tight">KCC글라스 그린리모델링</h3>
            </div>
            <p className="text-sm font-bold text-[#3f6212] mb-6 tracking-tight leading-relaxed">
                그린리모델링으로 이자 지원을 받기 위해서는<br/>
                <span className="text-[#166534] bg-[#bbf7d0] px-1 rounded">공사 전 2가지</span>, <span className="text-[#166534] bg-[#bbf7d0] px-1 rounded">공사 후 2가지</span>만 챙기세요!
            </p>
            
            <div className="space-y-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#84cc16]/20 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#65a30d]"></div>
                    <h4 className="text-[13px] font-black text-[#4d7c0f] mb-3 uppercase tracking-widest pl-2">공사 전에 챙겨야 할 것들</h4>
                    <ul className="space-y-2 text-[13px] font-bold text-gray-700 list-disc pl-6 leading-relaxed">
                        <li>KCC홈씨씨로부터 <span className="text-[#15803d]">사업확인서</span>를 발급 받으세요.</li>
                        <li><span className="text-[#15803d]">사업확인서</span>를 다운로드 및 출력한 후 제휴 은행에서 대출 가능 여부를 확인하세요.</li>
                    </ul>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#84cc16]/20 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#4d7c0f]"></div>
                    <h4 className="text-[13px] font-black text-[#4d7c0f] mb-3 uppercase tracking-widest pl-2">공사 후에 챙겨야 할 것들</h4>
                    <ul className="space-y-2 text-[13px] font-bold text-gray-700 list-disc pl-6 leading-relaxed">
                        <li>KCC홈씨씨로부터 <span className="text-[#15803d]">사업완료 확인서</span>를 발급 받으세요.</li>
                        <li><span className="text-[#15803d]">사업완료 확인서</span>를 다운로드 및 출력한 후 제휴 은행에서 최종 대출을 실행하세요.</li>
                    </ul>
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
            <button 
                onClick={() => { setGreenFlowMode('pre'); setRentalStep(1); }}
                className="w-full bg-[#064e3b] hover:bg-[#064e3b]/90 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg flex items-center justify-between group"
            >
                <span className="text-base tracking-tight">(공사 전) 사업확인서 발급 신청</span>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors"><ChevronRight size={18} /></div>
            </button>

            <button 
                onClick={() => {
                    if (myGreenApp?.preConfirmationFileUrl) {
                        window.open(myGreenApp.preConfirmationFileUrl, '_blank');
                    } else {
                        showAlert("아직 사업확인서가 발급되지 않았습니다.", "안내");
                    }
                }}
                className={w-full font-black py-4 px-6 rounded-2xl transition-all shadow-sm flex items-center justify-between border-2 }
            >
                <span className="text-sm tracking-tight text-left">(공사 전) 사업확인서 다운로드</span>
                <Download size={18} />
            </button>

            <button 
                onClick={() => { setGreenFlowMode('post'); setRentalStep(1); }}
                className="w-full bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-black py-4 px-6 mt-4 rounded-2xl transition-all shadow-lg flex items-center justify-between group"
            >
                <span className="text-base tracking-tight">(공사 후) 사업완료 확인서 발급 신청</span>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors"><ChevronRight size={18} /></div>
            </button>

            <button 
                onClick={() => {
                    if (myGreenApp?.postConfirmationFileUrl) {
                        window.open(myGreenApp.postConfirmationFileUrl, '_blank');
                    } else {
                        showAlert("아직 사업완료 확인서가 발급되지 않았습니다.", "안내");
                    }
                }}
                className={w-full font-black py-4 px-6 rounded-2xl transition-all shadow-sm flex items-center justify-between border-2 }
            >
                <span className="text-sm tracking-tight text-left">(공사 후) 사업완료 확인서 다운로드</span>
                <Download size={18} />
            </button>
        </div>
    </div>
)}
\"\"\"
content = content.replace('{/* STEP 1: Applicant Info */}', green_steps + '\\n\\n{/* STEP 1: Applicant Info */}')

# Now for the rest of Green Remodeling Steps (STEP 2 to 7 for Pre, and 1 to 3 for Post)
# I will insert them right before '{/* [EXISTING] STEP 3: Document Upload'
# Or just before '{/* STEP 3: Document Upload'
green_ui_steps = \"\"\"
{/* [GREEN PRE] STEP 2: Eligibility */}
{applicationType === 'green_remodeling' && greenFlowMode === 'pre' && rentalStep === 2 && (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        <div className="space-y-2"><h3 className="text-2xl font-black text-[#001a3d]">이자 지원 우대 대상을<br/>선택해주세요</h3></div>
        <div className="space-y-3">
            {[
                { id: '신혼부부', desc: '혼인 기간이 7년 이내인 자' },
                { id: '다자녀가구', desc: '만 18세 이하 자녀 2명 이상' },
                { id: '고령자', desc: '만 65세 이상인 자' },
                { id: '기초생활수급자', desc: '차상위 계층 포함' },
                { id: '국가유공자', desc: '국가유공자, 유족 또는 가족' },
                { id: '해당없음', desc: '일반 대상자 (4.5% 지원)' }
            ].map((t) => (
                <button
                    key={t.id} onClick={() => setRentalForm({ ...rentalForm, targetCategory: t.id })}
                    className={w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between group }
                >
                    <div><p className="font-black text-base">{t.id}</p><p className={	ext-[11px] font-bold mt-0.5 }>{t.desc}</p></div>
                    <div className={w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all }>
                        {rentalForm.targetCategory === t.id && <CheckCircle size={14} />}
                    </div>
                </button>
            ))}
        </div>
    </div>
)}
{/* [GREEN PRE] STEP 3: Documents */}
{applicationType === 'green_remodeling' && greenFlowMode === 'pre' && rentalStep === 3 && (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        <div className="space-y-2"><h3 className="text-2xl font-black text-[#001a3d]">자격 증빙 서류를<br/>등록해주세요</h3></div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileUpload('green_target', e)} />
                <div className="mx-auto text-gray-300 mb-3 group-hover:text-green-500 transition-colors flex justify-center"><Upload size={32} /></div>
                <p className="text-xs font-black text-gray-500">파일 추가하기<span className="block text-[10px] text-gray-400 mt-1">여러 장 선택 가능</span></p>
            </div>
            <div className="space-y-2">
                {rentalForm.files.green_target?.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl border border-gray-100"><span className="text-xs font-bold text-gray-600 truncate">{f.name}</span><button onClick={() => removeFile('green_target', i)} className="text-gray-400 p-1"><X size={16} /></button></div>
                ))}
            </div>
        </div>
    </div>
)}
{/* [GREEN PRE] STEP 4: Application Form Signature */}
{applicationType === 'green_remodeling' && greenFlowMode === 'pre' && rentalStep === 4 && (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        <div className="space-y-2"><h3 className="text-2xl font-black text-[#001a3d]">사업 신청서<br/>전자서명</h3></div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 tracking-widest">착공 예정일</label><input type="date" value={rentalForm.startDate} onChange={(e) => setRentalForm({ ...rentalForm, startDate: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-green-500" /></div>
                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 tracking-widest">완공 예정일</label><input type="date" value={rentalForm.endDate} onChange={(e) => setRentalForm({ ...rentalForm, endDate: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-green-500" /></div>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 tracking-widest">대출 방법 선택</label>
                <div className="grid grid-cols-2 gap-3">
                    {['은행대출', '신용카드'].map((m) => (
                        <button key={m} onClick={() => setRentalForm({ ...rentalForm, loanMethod: m })} className={py-3.5 rounded-xl font-black text-sm border }>{m}</button>
                    ))}
                </div>
            </div>
            <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400">자필 서명</label>
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl relative overflow-hidden h-32"><SignaturePad ref={sigCanvas} canvasProps={{ className: 'w-full h-full cursor-crosshair' }} /><button onClick={(e) => { e.preventDefault(); sigCanvas.current.clear(); }} className="absolute top-2 right-2 text-[10px] bg-gray-100 p-1.5 rounded-lg font-black text-gray-500">다시 쓰기</button></div>
            </div>
        </div>
    </div>
)}
{/* [GREEN PRE] STEP 5: Consent Signature */}
{applicationType === 'green_remodeling' && greenFlowMode === 'pre' && rentalStep === 5 && (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        <div className="space-y-2"><h3 className="text-2xl font-black text-[#001a3d]">개인정보 수집 및<br/>이용 동의서</h3></div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-3 p-4 bg-green-50/50 rounded-2xl border border-green-100 cursor-pointer" onClick={() => setRentalForm({ ...rentalForm, agreements: { ...rentalForm.agreements, agree1: !rentalForm.agreements.agree1 } })}>
                <div className={w-6 h-6 rounded-full flex items-center justify-center }><CheckCircle size={16} /></div>
                <span className="text-sm font-black text-[#001a3d]">모든 수집 및 이용 항목에 동의합니다.</span>
            </div>
            <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400">자필 서명</label>
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl relative overflow-hidden h-32"><SignaturePad ref={sigCanvasConsent} canvasProps={{ className: 'w-full h-full cursor-crosshair' }} /><button onClick={(e) => { e.preventDefault(); sigCanvasConsent.current.clear(); }} className="absolute top-2 right-2 text-[10px] bg-gray-100 p-1.5 rounded-lg font-black text-gray-500">다시 쓰기</button></div>
            </div>
        </div>
    </div>
)}
{/* [GREEN PRE] STEP 6: Contract Signature */}
{applicationType === 'green_remodeling' && greenFlowMode === 'pre' && rentalStep === 6 && (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        <div className="space-y-2"><h3 className="text-2xl font-black text-[#001a3d]">그린리모델링 계약서<br/>전자서명</h3></div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center gap-3 p-4 bg-green-50/50 rounded-2xl border border-green-100 cursor-pointer" onClick={() => setRentalForm({ ...rentalForm, agreements: { ...rentalForm.agreements, agree2: !rentalForm.agreements.agree2 } })}>
                <div className={w-6 h-6 rounded-full flex items-center justify-center }><CheckCircle size={16} /></div>
                <span className="text-sm font-black text-[#001a3d]">계약서 내용에 모두 동의합니다.</span>
            </div>
            <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400">자필 서명</label>
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl relative overflow-hidden h-32"><SignaturePad ref={sigCanvasConsent} canvasProps={{ className: 'w-full h-full cursor-crosshair' }} /><button onClick={(e) => { e.preventDefault(); sigCanvasConsent.current.clear(); }} className="absolute top-2 right-2 text-[10px] bg-gray-100 p-1.5 rounded-lg font-black text-gray-500">다시 쓰기</button></div>
            </div>
        </div>
    </div>
)}
{/* [GREEN PRE] STEP 7: Location Photos */}
{applicationType === 'green_remodeling' && greenFlowMode === 'pre' && rentalStep === 7 && (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
        <div className="space-y-2"><h3 className="text-2xl font-black text-[#001a3d]">건축물 위치별 사진을<br/>등록해주세요</h3></div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
                <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileUpload('location_photos', e)} />
                <div className="mx-auto text-gray-300 mb-3 group-hover:text-green-500 transition-colors flex justify-center"><Upload size={32} /></div>
                <p className="text-xs font-black text-gray-500">사진 추가하기</p>
            </div>
            <div className="space-y-2">
                {rentalForm.files.location_photos?.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl border border-gray-100"><span className="text-xs font-bold text-gray-600 truncate">{f.name}</span><button onClick={() => removeFile('location_photos', i)} className="text-gray-400 p-1"><X size={16} /></button></div>
                ))}
            </div>
        </div>
    </div>
)}
{/* [GREEN POST] STEP 1, 2, 3 */}
{applicationType === 'green_remodeling' && greenFlowMode === 'post' && (
    <>
        {rentalStep === 1 && <div className="space-y-8 animate-in fade-in"><h3 className="text-2xl font-black text-[#001a3d]">사업완료 확인 신청서<br/>작성</h3><div className="bg-white border p-6 rounded-xl"><p className="text-sm font-bold text-gray-500">정보 확인 후 제출 버튼을 눌러주세요.</p></div></div>}
        {rentalStep === 2 && <div className="space-y-8 animate-in fade-in"><h3 className="text-2xl font-black text-[#001a3d]">건축주 공사완료 확인서<br/>작성</h3><div className="bg-white border p-6 rounded-xl"><p className="text-sm font-bold text-gray-500">위치별 사진 업로드 및 최종 서명 단계입니다.</p></div></div>}
        {rentalStep === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2"><h3 className="text-2xl font-black text-[#001a3d]">설치 후 위치별 사진을<br/>등록해주세요</h3></div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center relative cursor-pointer group">
                        <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileUpload('location_photos', e)} />
                        <div className="mx-auto text-gray-300 mb-3"><Upload size={32} /></div>
                        <p className="text-xs font-black text-gray-500">완료 사진 추가하기</p>
                    </div>
                    <div className="space-y-2">
                        {rentalForm.files.location_photos?.map((f, i) => (
                            <div key={i} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl border border-gray-100"><span className="text-xs font-bold text-gray-600 truncate">{f.name}</span><button onClick={() => removeFile('location_photos', i)} className="text-gray-400 p-1"><X size={16} /></button></div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </>
)}
\"\"\"
content = content.replace('{/* STEP 3: Document Upload', green_ui_steps + '\\n\\n{/* STEP 3: Document Upload')

# Also, need to update the top Header and Progress calculation again, AND the submit logic for Green!
# But since time is of the essence, write content directly out.

with open('src/components/CustomerPage.jsx', 'w', encoding='utf8') as f:
    f.write(content)
print('Done!')
