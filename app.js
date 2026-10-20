(function(){
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DEF={weight:258.2,activity:1.2,goal:195};
const TIPS=[
 "Drink water through the fast. Thirst often feels like hunger, and plain water, black coffee or plain tea won't break it.",
 "Hunger usually comes in waves rather than climbing steadily. It often eases within 15–30 minutes if you wait it out.",
 "Ghrelin (the hunger hormone) follows your usual meal times, so the times you normally eat are often the hardest part.",
 "A pinch of salt in water can help with headaches or lightheadedness on longer fasts (electrolytes).",
 "Break the fast with protein and vegetables rather than a big carb-heavy meal. It tends to curb overeating.",
 "Sleep helps: poor sleep raises hunger hormones the next day. Many people put most fasting hours overnight.",
 "Studies comparing intermittent fasting with daily calorie restriction find similar weight loss. Pick whichever you can stick with.",
 "Keep protein up on eating days to help preserve muscle while losing weight.",
 "A short walk or other light activity can take your mind off food and dampen a hunger wave.",
 "Early weight drops on a fast are partly water and glycogen. Fat loss is slower and steadier."
];
const BURN_NET=0.7, HABIT_PER_WEEK=2, WEEKS={1:4.35,3:13,6:26};

function bmr(p){ if(!p)return null; const kg=p.weight*0.453592, cm=(p.ft*12+p.in)*2.54;
  return 10*kg+6.25*cm-5*p.age+(p.sex==="male"?5:-161); }
const tdee=p=>{const b=bmr(p);return b?b*(p.activity||1.2):2200};
const fmt=n=>Math.round(n).toLocaleString();
const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add("hidden"),2600)};

function show(v){$$(".view").forEach(e=>e.classList.add("hidden"));$("#view-"+v).classList.remove("hidden");$$("nav button").forEach(b=>b.classList.toggle("on",b.dataset.v===v));if(v==="weight")drawChart();}
$$("nav button").forEach(b=>b.onclick=()=>{if(!Store.state.profile)return show("onboard");show(b.dataset.v)});
$("#acctBtn").onclick=()=>show("auth");

// Profile
const pf=$("#profileForm");
function fillProfile(){const p=Store.state.profile||{};pf.ft.value=p.ft??"";pf.in.value=p.in??"";pf.weight.value=p.weight??DEF.weight;pf.sex.value=p.sex||"male";pf.age.value=p.age??"";pf.activity.value=String(p.activity??DEF.activity);pf.goal.value=p.goal??DEF.goal;preview();}
function readProfile(){return{ft:+pf.ft.value,in:+pf.in.value||0,weight:+pf.weight.value,sex:pf.sex.value,age:+pf.age.value,activity:+pf.activity.value,goal:+pf.goal.value}}
function preview(){const p=readProfile();$("#bmrPreview").textContent=(p.ft&&p.weight&&p.age)?`Resting calories burned per day: ${fmt(bmr(p))} · with activity: ${fmt(tdee(p))}`:"";}
pf.oninput=preview;
pf.onsubmit=e=>{e.preventDefault();const first=!Store.state.profile;const p=readProfile();Store.setProfile(p);
  const ws=Store.state.weights,last=ws[ws.length-1]; if(first&&!ws.length||(last&&last.lb!==p.weight))Store.addWeight(p.weight);
  render();toast("Profile saved");show("fast");};
$("#editProfile").onclick=()=>{$("#onboardTitle").textContent="Edit profile";fillProfile();show("onboard")};

// Fast
[12,16,18,20,24,36].forEach(h=>{const b=document.createElement("button");b.textContent=h+"h";b.onclick=()=>start(h);$("#presets").append(b)});
$("#startCustom").onclick=()=>{const h=+$("#customHours").value;if(h>0&&h<=96)start(h);else toast("Enter 1–96 hours")};
$("#startOpen").onclick=()=>start(null);
function start(h){Store.startFast(h);$("#hungryPanel").classList.add("hidden");render();}
$("#endBtn").onclick=()=>{const f0=Store.state.activeFast;if(!f0)return;const open=!f0.hours,done=!open&&Date.now()-f0.start>=f0.hours*3600e3;if(!confirm(open||done?"End this fast?":"End this fast early?"))return;const f=Store.endFast();render();if(f)toast(`Fast logged: ${((f.end-f.start)/36e5).toFixed(1)}h`)};
const R=2*Math.PI*88; $("#ringProg").style.strokeDasharray=R;
function clock(ms){const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4),s=Math.floor(ms%6e4/1e3);return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;}
function tick(){const f=Store.state.activeFast;if(!f)return;const el=Date.now()-f.start;
  if(!f.hours){$("#remain").textContent=clock(el);$("#ringSub").textContent=`${(el/36e5).toFixed(1)}h elapsed · open-ended`;$("#ringProg").style.strokeDashoffset=0;$("#endBtn").textContent="End fast";return;}
  const total=f.hours*3600e3,rem=Math.max(0,total-el);
  $("#remain").textContent=rem?clock(rem):"Done! 🎉";
  $("#ringSub").textContent=rem?`${(el/36e5).toFixed(1)}h of ${f.hours}h`:`${f.hours}h fast complete. Tap End to log it.`;
  $("#ringProg").style.strokeDashoffset=R*(1-Math.min(1,el/total));
  $("#endBtn").textContent=rem?"End fast early":"Finish & log fast";}
setInterval(tick,1000);

function lbs(hours){return tdee(Store.state.profile)*(hours/24)*BURN_NET/3500;}
function showHungry(){const f=Store.state.activeFast,p=Store.state.profile;const elapsed=(Date.now()-f.start)/36e5;
  const rows=f.hours?[[`Finish this ${f.hours}h fast`,lbs(f.hours)],...[1,3,6].map(mo=>[`Keep it up ${HABIT_PER_WEEK}×/week for ${mo} month${mo>1?"s":""}`,lbs(f.hours)*HABIT_PER_WEEK*WEEKS[mo]])]:[[`So far (${elapsed.toFixed(1)}h)`,lbs(elapsed)],["If you reach 24h",lbs(24)],["If you reach 48h",lbs(48)]];
  $("#estList").innerHTML=rows.map(([l,v])=>`<li><span>${l}</span><b>~${v.toFixed(v<1?2:1)} lb fat</b></li>`).join("");
  const toGoal=p?Math.max(0,p.weight-p.goal):0;
  $("#estNote").textContent=`Conservative estimate: ${fmt(tdee(p))} kcal/day (${bmr(p)?"your resting calories × activity":"default 2200"}) × hours fasted, counting only 70% as a net deficit since people often eat a bit more afterwards, at 3,500 kcal per lb. Water weight isn't counted, so the scale may move faster at first. Real results vary.${toGoal?` You're ${toGoal.toFixed(1)} lb from your goal of ${p.goal} lb.`:""}`;
  nextTip();$("#hungryPanel").classList.remove("hidden");$("#hungryPanel").scrollIntoView({behavior:"smooth"});}
$("#hungryBtn").onclick=showHungry;
let tipI=-1;function nextTip(){let i;do{i=Math.floor(Math.random()*TIPS.length)}while(i===tipI&&TIPS.length>1);tipI=i;$("#tipText").textContent=TIPS[i];}
$("#nextTip").onclick=nextTip;

// Weight
$("#weightForm").onsubmit=e=>{e.preventDefault();const v=+$("#weightIn").value;if(!v)return;Store.addWeight(v);$("#weightIn").value="";render();drawChart();toast("Weight logged. Resting calories updated.")};
$("#importBtn").onclick=async()=>{try{await WeightSources.appleHealth.importWeights()}catch(e){toast(e.message)}};
function drawChart(){const c=$("#chart"),ctx=c.getContext("2d"),dpr=devicePixelRatio||1,W=c.clientWidth||320,H=200;c.width=W*dpr;c.height=H*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);
  const ws=Store.state.weights,p=Store.state.profile;$("#goalLine").textContent=p?`Goal: ${p.goal} lb${ws.length?` · ${(ws[ws.length-1].lb-p.goal).toFixed(1)} lb to go`:""}`:"";
  if(!ws.length){ctx.fillStyle="#a8998e";ctx.font="14px system-ui";ctx.fillText("Log a weight to see your trend",20,H/2);return;}
  const vals=ws.map(w=>w.lb).concat(p?[p.goal]:[]),lo=Math.min(...vals)-2,hi=Math.max(...vals)+2,t0=ws[0].at,t1=Math.max(ws[ws.length-1].at,t0+1);
  const X=t=>30+(W-40)*(ws.length===1?0.5:(t-t0)/(t1-t0)),Y=v=>10+(H-30)*(1-(v-lo)/(hi-lo));
  ctx.fillStyle="#a8998e";ctx.font="11px system-ui";ctx.fillText(Math.round(hi),0,14);ctx.fillText(Math.round(lo),0,H-20);
  if(p){ctx.strokeStyle="#7bd38988";ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(30,Y(p.goal));ctx.lineTo(W-10,Y(p.goal));ctx.stroke();ctx.setLineDash([]);}
  ctx.strokeStyle="#ff9f43";ctx.lineWidth=2.5;ctx.beginPath();ws.forEach((w,i)=>i?ctx.lineTo(X(w.at),Y(w.lb)):ctx.moveTo(X(w.at),Y(w.lb)));ctx.stroke();
  ctx.fillStyle="#ff9f43";ws.forEach(w=>{ctx.beginPath();ctx.arc(X(w.at),Y(w.lb),3.5,0,7);ctx.fill()});}
addEventListener("resize",()=>{if(!$("#view-weight").classList.contains("hidden"))drawChart()});

// Auth
$("#authForm").onsubmit=e=>e.preventDefault();
$$("#authForm button").forEach(b=>b.onclick=async e=>{e.preventDefault();const em=$("#email").value,pw=$("#password").value;if(!em||pw.length<6)return toast("Enter email and a 6+ character password");
  try{if(b.dataset.act==="in"){await Store.signIn(em,pw);toast("Signed in. Syncing…")}else $("#authMsg").textContent=await Store.signUp(em,pw);}catch(err){$("#authMsg").textContent=err.message}});
$("#signOut").onclick=async()=>{await Store.signOut();toast("Signed out. Using this device's data.")};
Store.onAuth=u=>{$("#acctBtn").textContent=u?"Synced ✓":"Sign in";$("#authStatus").textContent=u?`Signed in as ${u.email}. Data syncs to the cloud.`:"Signed out. Data is stored on this device only.";$("#authForm").classList.toggle("hidden",!!u);$("#signOut").classList.toggle("hidden",!u)};
if(!Store.cloud)$("#authStatus").textContent="Cloud sync unavailable offline. Data stays on this device.";
Store.onChange=()=>render();

function render(){const S=Store.state,p=S.profile;
  $("#bmrVal").textContent=p?fmt(bmr(p)):"–";$("#tdeeVal").textContent=fmt(tdee(p));
  $("#startPanel").classList.toggle("hidden",!!S.activeFast);$("#timerPanel").classList.toggle("hidden",!S.activeFast);if(S.activeFast)tick();else $("#hungryPanel").classList.add("hidden");
  $("#weightList").innerHTML=[...S.weights].reverse().map(w=>`<li><span>${new Date(w.at).toLocaleDateString()} <span class="muted">${w.source}</span></span><span><b>${w.lb} lb</b> <button class="x" data-id="${w.id}">✕</button></span></li>`).join("")||'<li class="muted">No entries yet</li>';
  $$("#weightList .x").forEach(b=>b.onclick=()=>{Store.delWeight(b.dataset.id);render();drawChart()});
  $("#historyList").innerHTML=[...S.fasts].sort((a,b)=>b.start-a.start).map(f=>{const h=(f.end-f.start)/36e5;const detail=f.hours?`${h.toFixed(1)}h of ${f.hours}h goal`:`${h.toFixed(1)}h open-ended`;return `<li><span>${new Date(f.start).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}<br><span class="muted">${detail}</span></span><b style="color:${f.completed?"var(--ok)":"var(--mu)"}">${f.completed?"✓ Completed":"Ended early"}</b></li>`}).join("")||'<li class="muted">No fasts yet</li>';}

render();
if(!Store.state.profile){fillProfile();show("onboard");}else show("fast");
})();
