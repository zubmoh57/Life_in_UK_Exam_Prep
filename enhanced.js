/* Life in the UK practice application. The original embedded BANK stays unchanged. */
(() => {
  "use strict";
  const N = 24, PASS_PCT = 0.75, LIMIT = 2700, L = 'ABCD';
  const TOPICS = [['V','Values & principles'],['U','What is the UK?'],['H','History'],['C','Society & culture'],['G','Government & law']];
  const LABEL = Object.fromEntries(TOPICS);
  const app = document.getElementById('app');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const store = {
    get(k, fallback) {try {let v=localStorage.getItem(k);return v===null?fallback:JSON.parse(v);}catch{return fallback;}},
    set(k,v) {try{localStorage.setItem(k,JSON.stringify(v));}catch{}},
    del(k) {try{localStorage.removeItem(k);}catch{}}
  };
  const KEY = {mode:'liuk-mode-v2',timer:'liuk-timer',history:'liuk-history-v2',wrong:'liuk-wrong-v2',marks:'liuk-bookmarks-v2',session:'liuk-session-v2'};
  const validId = x => Number.isInteger(x)&&x>=0&&x<BANK.length;
  const loadSet = key => new Set((Array.isArray(store.get(key,[]))?store.get(key,[]):[]).filter(validId));
  let wrong = loadSet(KEY.wrong), marks = loadSet(KEY.marks);
  let history = store.get(KEY.history,[]); if(!Array.isArray(history))history=[];
  let S = {view:'home',mode:store.get(KEY.mode,'practice'),timer:store.get(KEY.timer,true)};
  if(S.mode!=='exam') S.mode='practice';
  let timerId=null, speaking=false;
  const shuffle = a => {let b=a.slice();for(let i=b.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
  const idsByTest = t => BANK.map((r,i)=>[r[0],i]).filter(([n])=>n===t).map(([,i])=>i);
  const idsByTopic = t => BANK.map((r,i)=>[r[5],i]).filter(([n])=>n===t).map(([,i])=>i);
  const title = t => t==='R'?'Random questions':t==='W'?'Your mistakes':t==='B'?'Bookmarked questions':typeof t==='string'&&t.startsWith('T:')?(LABEL[t.slice(2)]||'Topic practice'):'Test '+t;
  const elapsed = () => S.view==='exam'?Math.max(0,Math.floor((Date.now()-S.started)/1000)):Math.max(0,Math.floor(((S.ended||Date.now())-S.started)/1000));
  const fmt = seconds => {let n=Math.abs(Math.floor(seconds));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};
  function getSession() {
    const x=store.get(KEY.session,null);
    return x&&Array.isArray(x.ids)&&Array.isArray(x.ans)&&x.ids.length>0&&x.ids.length===x.ans.length&&x.ids.every(validId)&&Number.isInteger(x.cur)&&x.cur>=0&&x.cur<x.ids.length?x:null;
  }
  function saveSession() {
    if(S.view!=='exam') return;
    store.set(KEY.session,{test:S.test,ids:S.ids,ans:S.ans,cur:S.cur,mode:S.mode,timer:S.timer,elapsed:elapsed()});
  }
  function stopSpeech() {speaking=false;if('speechSynthesis' in window)window.speechSynthesis.cancel();}
  function updateTimer() {
    const el=document.getElementById('clock');if(!el||S.view!=='exam')return;
    const left=LIMIT-elapsed();el.textContent=left>=0?fmt(left):'Over '+fmt(-left);
    el.className='clock'+(left<0?' over':left<300?' low':'');
  }
  function startTimer() {clearInterval(timerId);if(S.view==='exam'&&S.timer)timerId=setInterval(updateTimer,1000);}
  function begin(test) {
    let ids = test==='R'?shuffle(BANK.map((_,i)=>i)).slice(0,N):test==='W'?shuffle([...wrong]).slice(0,N):test==='B'?shuffle([...marks]).slice(0,N):typeof test==='string'&&test.startsWith('T:')?shuffle(idsByTopic(test.slice(2))).slice(0,N):idsByTest(test);
    if(!ids.length)return;
    stopSpeech();
    S={view:'exam',mode:S.mode,timer:S.timer,test,ids,ans:Array(ids.length).fill(null),cur:0,started:Date.now(),confirm:false};
    saveSession();startTimer();render();window.scrollTo(0,0);
  }
  function resume() {
    const saved=getSession();if(!saved)return;
    stopSpeech();
    S={view:'exam',mode:saved.mode==='exam'?'exam':'practice',timer:!!saved.timer,test:saved.test,ids:saved.ids,ans:saved.ans,cur:saved.cur,started:Date.now()-Math.max(0,Number(saved.elapsed)||0)*1000,confirm:false};
    startTimer();render();window.scrollTo(0,0);
  }
  function go(i) {
    if(S.view!=='exam'||i<0||i>=S.ids.length)return;
    stopSpeech();S.cur=i;S.confirm=false;saveSession();render();window.scrollTo(0,0);
  }
  function pick(i) {
    if(S.view!=='exam'||i<0||i>3)return;
    if(S.mode==='practice'&&S.ans[S.cur]!==null)return;
    S.ans[S.cur]=i;S.confirm=false;
    if(S.mode==='practice') {
      const id=S.ids[S.cur];if(i===BANK[id][3])wrong.delete(id);else wrong.add(id);
      store.set(KEY.wrong,[...wrong]);
    }
    saveSession();render();
  }
  function toggleBookmark() {
    if(S.view!=='exam')return;let id=S.ids[S.cur];if(marks.has(id))marks.delete(id);else marks.add(id);
    store.set(KEY.marks,[...marks]);render();
  }
  function hear() {
    if(!('speechSynthesis' in window)){alert('Read aloud is not supported in this browser.');return;}
    if(speaking){stopSpeech();render();return;}
    const r=BANK[S.ids[S.cur]];
    const text=r[1]+'. '+r[2].map((choice,i)=>'Option '+L[i]+'. '+choice).join('. ');
    const utter=new SpeechSynthesisUtterance(text);utter.lang='en-GB';utter.rate=.85;
    utter.onend=()=>{speaking=false;let b=document.querySelector('[data-act="hear"]');if(b)b.textContent='🔊 Read question';};
    utter.onerror=utter.onend;
    speaking=true;window.speechSynthesis.speak(utter);
    const btn=document.querySelector('[data-act="hear"]');if(btn)btn.textContent='■ Stop reading';
  }
  function submit(force=false) {
    if(S.view!=='exam')return;
    const missing=S.ans.filter(x=>x===null).length;
    if(missing&&!force){S.confirm=true;render();return;}
    stopSpeech();S.ended=Date.now();S.view='results';clearInterval(timerId);
    S.score=S.ids.reduce((n,id,k)=>n+(S.ans[k]===BANK[id][3]),0);
    const topics={};
    S.ids.forEach((id,k)=>{const correct=S.ans[k]===BANK[id][3],topic=BANK[id][5];
      if(correct)wrong.delete(id);else wrong.add(id);
      if(!topics[topic])topics[topic]={right:0,total:0};topics[topic].total++;if(correct)topics[topic].right++;
    });
    store.set(KEY.wrong,[...wrong]);
    history.unshift({date:Date.now(),test:S.test,mode:S.mode,score:S.score,count:S.ids.length,topics});
    history=history.slice(0,100);store.set(KEY.history,history);
    const past=store.get('liuk-last',{});past[S.test]=S.score;store.set('liuk-last',past);
    store.del(KEY.session);render();window.scrollTo(0,0);
  }
  function home() {
    stopSpeech();clearInterval(timerId);saveSession();
    S={view:'home',mode:S.mode,timer:S.timer};render();window.scrollTo(0,0);
  }
  function topicStats() {
    const obj={};for(const item of history)for(const [c,v] of Object.entries(item.topics||{})){
      if(!obj[c])obj[c]={right:0,total:0};obj[c].right+=Number(v.right)||0;obj[c].total+=Number(v.total)||0;
    }return obj;
  }
  function viewHome() {
    const saved=getSession(),past=store.get('liuk-last',{});
    const completed=new Set(history.filter(h=>typeof h.test==='number').map(h=>h.test)).size;
    const avg=history.length?Math.round(history.reduce((n,h)=>n+100*h.score/h.count,0)/history.length):null;
    const best=history.length?Math.max(...history.map(h=>Math.round(100*h.score/h.count))):null;
    const topic=topicStats();
    const bars=TOPICS.map(([c,name])=>{const data=topic[c],p=data&&data.total?Math.round(100*data.right/data.total):0;
      return `<div class="topic-item"><div class="topic-heading"><span>${esc(name)}</span><b>${data?p+'%':'Not tried yet'}</b></div><div class="topic-track" role="progressbar" aria-label="${esc(name)}" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><span style="width:${p}%"></span></div></div>`;
    }).join('');
    const tests=Array.from({length:30},(_,i)=>{const n=i+1,score=past[n];
      return `<button class="test-btn" data-test="${n}"><span class="eyebrow">Mock exam</span><span class="n">Test ${n}</span><span class="last">${score==null?'Not tried yet':'Last score '+score+'/24'}</span></button>`;
    }).join('');
    const topics=TOPICS.map(([c,label])=>`<button class="test-btn" data-test="T:${c}"><span class="n">${esc(label)}</span><span class="last">Choose questions from this topic</span></button>`).join('');
    return `<header class="home-header"><span class="eyebrow">Life in the UK · Free practice</span>
      <h1>Learn at your own pace</h1><p class="lede">Simple, clear practice questions to help you feel ready for your Life in the UK test.</p>
      <div class="facts"><span class="fact"><b>720</b> questions</span><span class="fact"><b>30</b> practice tests</span><span class="fact">Pass mark: <b>75%</b></span></div></header>
      ${saved?`<section class="resume-panel" aria-label="Resume exam"><strong>Welcome back! You have an unfinished test.</strong><p>${esc(title(saved.test))} · Question ${saved.cur+1} of ${saved.ids.length}</p>
         <div class="action-row"><button class="btn primary" data-act="resume">Continue where I left off</button><button class="btn" data-act="discard">Discard saved test</button></div></section>`:''}
      <section class="card"><h2>1. Choose how to study</h2><div class="mode-grid">
        <label class="mode-card"><input type="radio" name="mode" value="practice" ${S.mode==='practice'?'checked':''}><span><b>Practice mode</b><small>Learn as you go. See the right answer and explanation straight away.</small></span></label>
        <label class="mode-card"><input type="radio" name="mode" value="exam" ${S.mode==='exam'?'checked':''}><span><b>Exam mode</b><small>Test yourself without hints. Review your answers at the end.</small></span></label></div>
        <div class="opts-row"><label><input type="checkbox" id="opt-timer" ${S.timer?'checked':''}> Show 45-minute timer</label></div></section>
      <section class="card"><h2>2. Start practising</h2><button class="btn primary wide" data-test="R">Start a random 24-question test →</button>
        <div class="action-row"><button class="btn" data-test="W" ${wrong.size?'':'disabled'}>↻ Retry mistakes (${wrong.size})</button>
          <button class="btn" data-test="B" ${marks.size?'':'disabled'}>☆ Saved questions (${marks.size})</button></div>
        <p class="hint">Questions you miss and bookmark will be saved in this browser.</p></section>
      <section class="card"><div class="section-heading"><h2>Your progress</h2><span class="hint">Saved on this device</span></div>
        <div class="stats"><div class="stat"><strong>${completed}/30</strong><small>Numbered tests completed</small></div>
        <div class="stat"><strong>${avg==null?'—':avg+'%'}</strong><small>Average accuracy</small></div>
        <div class="stat"><strong>${best==null?'—':best+'%'}</strong><small>Best accuracy</small></div></div>
        <h3>Accuracy by topic</h3><div class="topic-list">${bars}</div>
        <p class="hint">Progress is private to this browser and won't sync across devices.</p></section>
      <section class="card"><h2>Choose a topic</h2><div class="picker">${topics}</div></section>
      <details class="all-tests"><summary>Choose from all 30 numbered tests</summary><div class="picker">${tests}</div></details>
      <section class="card"><h2>Use it like an app</h2><p class="lede">Save a shortcut to this website on your phone's Home Screen.</p>
        <button class="btn" data-act="install">Show phone instructions</button><div class="install-help" id="install-help" hidden>
          <p><b>On iPhone:</b> Open in Safari, tap the Share button, then Add to Home Screen.</p>
          <p><b>On Android:</b> Open in Chrome, tap the three-dot menu, then Add to Home screen.</p></div></section>
      <footer>Independent learning resource based on the Life in the United Kingdom handbook (3rd edition). Not an official government exam. Check important facts against the official handbook.</footer>`;
  }
  function viewExam() {
    const n=S.ids.length,id=S.ids[S.cur],r=BANK[id],a=S.ans[S.cur],done=S.ans.filter(x=>x!==null).length;
    const reveal=S.mode==='practice'&&a!==null;
    const choices=r[2].map((option,i)=>{const good=reveal&&i===r[3],bad=reveal&&i===a&&a!==r[3];
      return `<button class="choice ${good?'answer-good':bad?'answer-bad':''}" data-pick="${i}" aria-pressed="${a===i}" ${reveal?'disabled':''}>
        <span class="key">${L[i]}</span><span>${esc(option)}</span>${good?'<b>✓ Correct</b>':bad?'<b>✗ Your answer</b>':''}</button>`;
    }).join('');
    const feedback=reveal?`<div class="notice feedback ${a===r[3]?'':'wrong'}" role="status"><strong>${a===r[3]?'✓ Correct!':'✗ Not quite. Here is the correct answer.'}</strong>
      <p><b>Correct answer:</b> ${esc(r[2][r[3]])}</p><p>${esc(r[4])}</p></div>`:'';
    const dots=S.ids.map((_,i)=>`<button class="dot ${S.ans[i]!==null?'done':''} ${S.cur===i?'here':''}" data-go="${i}" aria-label="Go to question ${i+1}${S.ans[i]!==null?', answered':''}">${i+1}</button>`).join('');
    const missing=n-done;
    const confirm=S.confirm?`<div class="notice warn" role="alert"><p>You have ${missing} unanswered question${missing===1?'':'s'}. These will be marked wrong.</p>
      <div class="action-row"><button class="btn" data-act="first-gap">Go to first unanswered</button><button class="btn primary" data-act="force">Submit anyway</button></div></div>`:'';
    return `<div class="strip"><div class="strip-top"><span class="strip-title">${esc(title(S.test))} · ${S.mode==='practice'?'Practice':'Exam'} mode</span>
       <span class="strip-meta"><span class="count">${done}/${n} answered</span>${S.timer?'<span class="clock" id="clock"></span>':''}</span></div></div>
       <article class="card"><div class="question-head"><span class="qnum">Question ${S.cur+1} of ${n}</span><div class="question-tools">
         <button class="tool-btn" data-act="mark" aria-pressed="${marks.has(id)}">${marks.has(id)?'★ Bookmarked':'☆ Bookmark'}</button>
         <button class="tool-btn" data-act="hear">🔊 Read question</button></div></div>
         <p class="qtext">${esc(r[1])}</p><div class="choices" aria-label="Answer choices">${choices}</div>${feedback}</article>
       ${confirm}<div class="nav exam-nav"><button class="btn ghost" data-act="prev" ${S.cur===0?'disabled':''}>← Back</button>
         ${S.cur<n-1?'<button class="btn primary" data-act="next">Next question →</button>':'<button class="btn primary" data-act="submit">Finish & see results</button>'}</div>
       <section class="jump" aria-label="Jump to question"><span class="eyebrow">Jump to a question · shaded = answered</span><div class="dots">${dots}</div></section>
       <div class="nav"><span class="hint">Progress saves automatically on this device.</span><div class="action-row">
         ${S.cur<n-1?'<button class="btn" data-act="submit">Finish test now</button>':''}<button class="btn ghost" data-act="home">Save & leave</button></div></div>`;
  }
  function viewResults() {
    const n=S.ids.length,threshold=Math.ceil(n*PASS_PCT),passed=S.score>=threshold,incorrect=n-S.score;
    const review=S.ids.map((id,i)=>({r:BANK[id],a:S.ans[i],k:i})).filter(o=>S.filter!=='wrong'||o.a!==o.r[3]);
    return `<header class="home-header"><span class="eyebrow">${esc(title(S.test))} · Results</span><h1>${passed?'Well done — you passed!':'Good effort — keep learning'}</h1>
      <p class="lede">You can review every answer below and try your mistakes again.</p></header>
      <section class="card result"><div class="score">${S.score}<small>/${n}</small></div><div class="verdict"><span class="pill ${passed?'pass':'fail'}">${passed?'Passed':'Not passed yet'}</span>
        <div class="bar" aria-hidden="true"><i style="width:${100*S.score/n}%"></i><b></b></div><p>${Math.round(100*S.score/n)}% correct · ${incorrect} incorrect · pass mark ${threshold}/${n} (75%) · time ${fmt(elapsed())}</p></div></section>
      <div class="action-row"><button class="btn primary" data-act="retry">Try again</button><button class="btn" data-act="home">Choose another test</button>
        ${wrong.size?`<button class="btn" data-test="W">Retry mistakes (${wrong.size})</button>`:''}</div>
      <section class="card"><div class="section-heading"><h2>Review answers</h2><div class="action-row">
        <button class="chip" data-filter="all" aria-pressed="${S.filter!=='wrong'}">All ${n}</button>
        <button class="chip" data-filter="wrong" aria-pressed="${S.filter==='wrong'}">Wrong (${incorrect})</button></div></div>
        <div class="review">${review.map(({r,a,k})=>{
          const ok=a===r[3];return `<article class="rv ${ok?'':'wrong'}"><div class="rv-head"><span class="tag ${ok?'ok':'no'}">Q${k+1}: ${ok?'Correct':'Incorrect'}</span><span class="src">${esc(LABEL[r[5]])}</span></div>
            <p class="rv-q">${esc(r[1])}</p><ul class="rv-opts">${r[2].map((choice,i)=>{const good=i===r[3],bad=i===a&&!ok;
              return `<li class="${good?'correct':bad?'picked-wrong':''}"><span class="k">${L[i]}</span><span class="t">${esc(choice)}</span><span class="m">${good?'✓ Correct':bad?'✗ Your answer':''}</span></li>`;}).join('')}</ul>
            <p class="rv-exp">${esc(r[4])}</p></article>`;
        }).join('')||'<p>All answers correct! Well done.</p>'}</div></section>`;
  }
  function render() {
    app.innerHTML=S.view==='home'?viewHome():S.view==='exam'?viewExam():viewResults();
    updateTimer();
  }
  app.addEventListener('click',e=>{
    const btn=e.target.closest('button');if(!btn||btn.disabled)return;
    const d=btn.dataset;
    if(d.test!==undefined)return begin(['R','W','B'].includes(d.test)||d.test.startsWith('T:')?d.test:Number(d.test));
    if(d.pick!==undefined)return pick(Number(d.pick));
    if(d.go!==undefined)return go(Number(d.go));
    if(d.filter!==undefined){S.filter=d.filter;return render();}
    switch(d.act){
      case 'next':return go(S.cur+1);
      case 'prev':return go(S.cur-1);
      case 'submit':return submit();
      case 'force':return submit(true);
      case 'first-gap':return go(S.ans.indexOf(null));
      case 'retry':return begin(S.test);
      case 'home':return home();
      case 'resume':return resume();
      case 'discard':store.del(KEY.session);return render();
      case 'mark':return toggleBookmark();
      case 'hear':return hear();
      case 'install':{let p=document.getElementById('install-help');if(p)p.hidden=!p.hidden;return;}
    }
  });
  app.addEventListener('change',e=>{
    if(e.target.name==='mode'){S.mode=e.target.value==='exam'?'exam':'practice';store.set(KEY.mode,S.mode);render();}
    if(e.target.id==='opt-timer'){S.timer=e.target.checked;store.set(KEY.timer,S.timer);}
  });
  document.addEventListener('keydown',e=>{
    if(S.view!=='exam'||e.altKey||e.ctrlKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    const key=e.key.toUpperCase();let i=L.indexOf(key);if(i<0&&'1234'.includes(key)&&key)i=Number(key)-1;
    if(i>=0&&key.length===1){e.preventDefault();return pick(i);}
    if(e.key==='ArrowRight')return go(S.cur+1);
    if(e.key==='ArrowLeft')return go(S.cur-1);
  });
  window.addEventListener('pagehide',saveSession);
  render();
})();

const extraStyle=document.createElement('style');
extraStyle.textContent=`
:root:not([data-theme="dark"]) {--bg:#f5f8f6;--paper:#ffffff;--ink:#20333c;--muted:#51626c;--line:#cad8d3;--accent:#205f56;--accent-ink:#fff;--accent-soft:#e4f1eb;--good:#176942;--good-soft:#e2f4e7;--bad:#a02b31;--bad-soft:#fbe8e6;}
:root {--f-display:"Public Sans",system-ui,sans-serif}
body{font-size:18px;line-height:1.65}.wrap{max-width:860px;padding-block:32px 96px;gap:22px}h1{font-size:clamp(2rem,5vw,2.8rem);letter-spacing:-.035em}h2{font-size:1.4rem}.lede{font-size:1.04rem}
.card{border-radius:18px;box-shadow:0 4px 22px rgba(20,70,60,.05);gap:18px}.home-header{display:grid;gap:12px}.test-btn{min-height:86px;border-radius:12px;padding:16px}.test-btn .n{font-family:var(--f-body);font-size:1.12rem}
.choice{font-size:1.05rem;min-height:65px;border-radius:12px;padding:15px 16px}.choice:disabled{opacity:1;cursor:default}.choice[aria-pressed="true"]:not(.answer-good):not(.answer-bad){border:2px solid var(--accent);background:var(--accent-soft)}.choice.answer-good,.choice.answer-good:hover{border:2px solid var(--good)!important;background:var(--good-soft)!important;color:var(--ink)!important}.choice.answer-bad,.choice.answer-bad:hover{border:2px solid var(--bad)!important;background:var(--bad-soft)!important;color:var(--ink)!important}
.choice.answer-good .key{background:var(--good);border-color:var(--good);color:white}.choice.answer-bad .key{background:var(--bad);border-color:var(--bad);color:white}
.qtext{font:700 clamp(1.3rem,3.5vw,1.6rem)/1.45 var(--f-body)}.btn{min-height:51px;padding:11px 18px}.wide{width:100%;min-height:62px}.action-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.action-row .btn:disabled{opacity:.55;cursor:default}
.mode-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mode-card{display:flex;align-items:flex-start;gap:12px;padding:17px;border:1.5px solid var(--line);border-radius:12px;cursor:pointer}.mode-card:has(input:checked){border-color:var(--accent);background:var(--accent-soft)}.mode-card input{width:22px;height:22px;flex-shrink:0;margin-top:5px;accent-color:var(--accent)}.mode-card b,.mode-card small{display:block}.mode-card small{font-size:.86rem;color:var(--muted);line-height:1.45;margin-top:5px}.opts-row{margin-top:4px}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.stat{border:1px solid var(--line);background:var(--bg);border-radius:12px;padding:15px}.stat strong{display:block;font-size:1.6rem;line-height:1.2;font-variant-numeric:tabular-nums}.stat small{display:block;font-size:.81rem;color:var(--muted);margin-top:5px}.topic-list{display:grid;gap:12px}.topic-item{display:grid;gap:5px}.topic-heading,.section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.topic-heading{font-size:.93rem}.topic-track{height:10px;border-radius:99px;background:var(--line);overflow:hidden}.topic-track span{height:100%;display:block;background:var(--accent);border-radius:99px}
.question-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.question-tools{display:flex;flex-wrap:wrap;gap:7px}.tool-btn{border:1.5px solid var(--line);border-radius:99px;min-height:44px;background:var(--paper);padding:8px 13px;font-weight:700;font-size:.85rem}.tool-btn[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent)}.notice.feedback{border:1.5px solid var(--good);background:var(--good-soft);padding:16px}.notice.feedback.wrong{border-color:var(--bad);background:var(--bad-soft)}.notice.feedback strong{font-size:1.12rem}
.resume-panel{padding:17px;border:2px solid var(--accent);background:var(--accent-soft);border-radius:14px;display:grid;gap:12px}.all-tests{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:16px}.all-tests summary{font-weight:700;cursor:pointer}.all-tests .picker{margin-top:16px}.install-help{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:14px;display:grid;gap:8px}.install-help[hidden]{display:none}.rv-opts{list-style:none;margin:0;padding:0;display:grid;gap:6px}.rv-opts li{display:grid;grid-template-columns:26px 1fr auto;gap:8px;align-items:start;padding:9px 10px;border-radius:8px}.rv-exp{padding-top:12px;border-top:1px solid var(--line);color:var(--muted)}.rv-opts .m{font-weight:700;font-size:.8rem}
@media(max-width:600px){.mode-grid{grid-template-columns:1fr}.stat{padding:10px}.stat strong{font-size:1.3rem}.stat small{font-size:.76rem}.choice{min-height:72px}.question-tools{width:100%}.tool-btn{flex:1}.action-row .btn{flex:1}.rv-opts li{grid-template-columns:25px 1fr}.rv-opts .m{grid-column:2}.theme-toggle{bottom:10px;right:10px}}
`;
document.head.append(extraStyle);
