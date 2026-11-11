const money = value => new Intl.NumberFormat('ko-KR').format(value) + '원';
const plans = {
 cash: {name:'일시불 할인 결제',detail:'총 10,500,000원 · 선금 50% / 잔금 50%',button:'일시불 결제 상담하기'},
 lowupfront:{name:'초기 부담을 줄이는 렌탈',detail:'초기 500,000원 + 월 222,000원 × 60개월',button:'초기 50만원 조건 상담하기'},
 lowmonthly:{name:'월 부담을 줄이는 렌탈',detail:'초기 5,500,000원 + 월 111,000원 × 60개월',button:'월 11만1천원 조건 상담하기'}
};
const topics=['총비용과 추가 비용','결제 방식 비교','제품이나 시공 범위 변경','시공 일정과 소요 시간','시공 후 A/S와 보증 범위'];
const windows=[
 {name:'입구 좌 분합창',type:'공틀창225',amount:1401007,size:'2,800 × 2,400 mm',shape:'2W (1:2)',model:'HW ONE(V)_BF225TM',glass:'내부 24T 투명 + 로이(V)',handle:'L-PLUS_N 반자동 HANDLE (대)',mesh:'미포함',panes:2},
 {name:'입구 우 분합창',type:'공틀창225',amount:1296585,size:'2,550 × 2,400 mm',shape:'2W',model:'HW ONE(V)_BF225TM',glass:'내부 24T 투명 + 로이(V)',handle:'L-PLUS_N 반자동 HANDLE (대)',mesh:'미포함',panes:2},
 {name:'안방 이중창',type:'일반이중창230',amount:2274097,size:'3,400 × 1,800 mm',shape:'3W (1:2:1)',model:'HW ONE(V)_BF230R',glass:'내부 24T 미스트 + 로이(V) / 외부 24T 투명 + 로이(V)',handle:'L-PLUS_N HANDLE (대)',mesh:'미포함',panes:3},
 {name:'주방 발코니 1',type:'발코니창141',amount:2282156,size:'4,200 × 2,300 mm',shape:'3W (1:2:1)',model:'HW ONE(V)_HBF141S',glass:'28T 더블로이 + 투명(V)',handle:'L-PLUS_N HANDLE (대)',mesh:'블랙 STS 방충망',panes:3,upgrade:true},
 {name:'주방 발코니 2',type:'발코니창141',amount:2592379,size:'4,850 × 2,300 mm',shape:'3W (1:2:1)',model:'HW ONE(V)_HBF141S',glass:'28T 더블로이 + 투명(V)',handle:'L-PLUS_N HANDLE (대)',mesh:'블랙 STS 방충망',panes:3,upgrade:true},
 {name:'주방B 고정창',type:'고정창',amount:280450,size:'1,100 × 1,300 mm',shape:'CB-90+FM / 100면 유리',model:'HW ONE(V)_고정창',glass:'24T 더블로이 + 투명(V)',handle:'해당 없음',mesh:'미포함',panes:1}
];
function windowIcon(panes){return `<svg viewBox="0 0 40 40" aria-hidden="true"><path class="glass-fill" d="M5 6h30v28H5z"/><path d="M4 5h32v30H4zM6 7h28v26H6z${panes===2?'M20 5v30':panes===3?'M13 5v30M27 5v30':''}"/>${panes>1?'<path d="M10 18v5M30 18v5"/>':''}</svg>`;}
document.getElementById('window-list').innerHTML=windows.map((w,i)=>`<details class="window-item"><summary><div class="window-thumb">${windowIcon(w.panes)}</div><div class="window-name"><strong>${w.name}</strong><small>${w.type}</small></div><strong class="window-amount">${money(w.amount)}</strong><svg><use href="#i-down"/></svg></summary><div class="window-detail"><dl>${[['규격',w.size],['창 형태',w.shape],['모델명',w.model],['유리 사양',w.glass],['핸들',w.handle],['방충망',w.mesh]].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>${w.upgrade?'<span class="tag">더블로이 유리 · STS 방충망 적용</span>':''}<button class="text-link" data-consult="${w.name} 사양 상담">이 창호에 대해 문의하기<svg><use href="#i-arrow"/></svg></button></div></details>`).join('');
document.getElementById('topic-options').innerHTML=topics.map((t,i)=>`<label><input type="checkbox" name="topic" value="${t}"><span>${t}</span></label>`).join('');
let selectedPlan='cash';
let activeContext='';
let focusBeforeDialog=null;
const dialog=document.getElementById('consult-dialog');
function choosePlan(key){selectedPlan=key;document.querySelectorAll('[data-plan]').forEach(card=>{const selected=card.dataset.plan===key;card.classList.toggle('selected',selected);card.setAttribute('aria-checked',String(selected));card.tabIndex=selected?0:-1;});document.getElementById('plan-cta').innerHTML=plans[key].button+'<svg><use href="#i-arrow"/></svg>';}
document.querySelectorAll('[data-plan]').forEach((card,index)=>{card.addEventListener('click',()=>choosePlan(card.dataset.plan));card.addEventListener('keydown',e=>{if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(e.key)){e.preventDefault();const cards=[...document.querySelectorAll('[data-plan]')];const next=(index+(['ArrowDown','ArrowRight'].includes(e.key)?1:-1)+cards.length)%cards.length;choosePlan(cards[next].dataset.plan);cards[next].focus();}});});
choosePlan('cash');
function openConsult(topic,context=''){
 focusBeforeDialog=document.activeElement;activeContext=context;
 document.getElementById('success-content').hidden=true;document.getElementById('consult-content').hidden=false;
 document.getElementById('consult-form').reset();
 document.querySelectorAll('[name=topic]').forEach(input=>{input.checked=input.value===topic||(topic.includes('사양')&&input.value===topics[2]);});
 const selected=document.getElementById('selected-plan');selected.textContent=context|| (topics.includes(topic)||topic==='견적 상담'?'견적 No. 0870 · '+topic:topic);
 dialog.showModal();document.body.style.overflow='hidden';dialog.scrollTop=0;
}
function closeDialog(){dialog.close();}
dialog.addEventListener('close',()=>{document.body.style.overflow='';if(focusBeforeDialog)focusBeforeDialog.focus({preventScroll:true});});
document.querySelectorAll('[data-consult]').forEach(button=>button.addEventListener('click',()=>openConsult(button.dataset.consult)));
document.querySelectorAll('.close-dialog,.close-success').forEach(button=>button.addEventListener('click',closeDialog));
dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeDialog();}});
document.getElementById('plan-cta').addEventListener('click',()=>openConsult('결제 방식 비교',plans[selectedPlan].name+' · '+plans[selectedPlan].detail));
document.querySelectorAll('[data-scroll]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.scroll).scrollIntoView({behavior:'smooth'})));
const deposit=document.getElementById('deposit');
function validateDeposit(){const value=Number(deposit.value);const valid=deposit.value.trim()!==''&&Number.isFinite(value)&&value>=0&&value<=10500000;document.getElementById('deposit-error').hidden=valid;document.getElementById('balance').textContent=valid?money(10500000-value):'금액을 확인해주세요';deposit.setAttribute('aria-invalid',String(!valid));return valid;}
deposit.addEventListener('input',validateDeposit);
document.getElementById('subscription-cta').addEventListener('click',()=>{if(!validateDeposit()){deposit.focus();return;}openConsult('결제 방식 비교','스마트 구독 · 선납금 '+money(Number(deposit.value))+' / 구독 전환 '+money(10500000-Number(deposit.value)));});
document.getElementById('phone-btn').addEventListener('click',()=>{openConsult('견적 상담','전화 상담 · 실제 서비스에서는 담당자 전화 연결을 제공합니다.');});
document.getElementById('consult-form').addEventListener('submit',event=>{
 event.preventDefault();const selectedTopics=[...document.querySelectorAll('[name=topic]:checked')].map(el=>el.value);const time=document.querySelector('[name=time]:checked').value;
 const summary=document.getElementById('success-summary');summary.replaceChildren();
 for(const line of [activeContext||'주원 고객님 · 견적 No. 0870','문의: '+(selectedTopics.join(', ')||'견적 전반 상담'),'희망 시간: '+time]){const p=document.createElement('p');p.textContent=line;summary.appendChild(p);}
 document.getElementById('consult-content').hidden=true;document.getElementById('success-content').hidden=false;dialog.scrollTop=0;document.querySelector('.close-success').focus({preventScroll:true});
});
const navLinks=[...document.querySelectorAll('.section-nav a')];
const observedSections=navLinks.map(link=>document.querySelector(link.getAttribute('href')));
let scrolling=false;
function updateNav(){const pos=window.scrollY+150;let active=0;observedSections.forEach((section,i)=>{if(section.offsetTop<=pos)active=i;});navLinks.forEach((link,i)=>{link.classList.toggle('active',i===active);if(i===active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});scrolling=false;}
window.addEventListener('scroll',()=>{if(!scrolling){requestAnimationFrame(updateNav);scrolling=true;}},{passive:true});updateNav();
