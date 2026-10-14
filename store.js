// Local-first store. localStorage always; mirrors to Supabase when signed in.
(function(){
  const KEY="fastapp.v1";
  const blank=()=>({profile:null,activeFast:null,fasts:[],weights:[]});
  let S; try{S=Object.assign(blank(),JSON.parse(localStorage.getItem(KEY)||"{}"))}catch(e){S=blank()}
  const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
  const uid=()=>(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g,()=>(Math.random()*16|0).toString(16)));
  let sb=null,user=null;
  try{ if(window.supabase&&FAST_CONFIG.supabaseUrl) sb=supabase.createClient(FAST_CONFIG.supabaseUrl,FAST_CONFIG.supabaseKey);}catch(e){console.warn("Supabase unavailable",e)}

  const remote={
    async profile(p){ if(!user)return; await sb.from("profiles").upsert({user_id:user.id,height_ft:p.ft,height_in:p.in,weight_lb:p.weight,sex:p.sex,age:p.age,activity:p.activity,goal_lb:p.goal,updated_at:new Date().toISOString()}); },
    async fast(f){ if(!user)return; await sb.from("fasts").upsert({id:f.id,user_id:user.id,start_at:new Date(f.start).toISOString(),target_hours:f.hours,end_at:f.end?new Date(f.end).toISOString():null,completed:!!f.completed}); },
    async weight(w){ if(!user)return; await sb.from("weights").upsert({id:w.id,user_id:user.id,at:new Date(w.at).toISOString(),lb:w.lb,source:w.source}); },
    async delWeight(id){ if(!user)return; await sb.from("weights").delete().eq("id",id); }
  };
  const bg=p=>p&&p.catch&&p.catch(e=>console.warn("sync",e));

  async function pull(){
    const [p,f,w]=await Promise.all([sb.from("profiles").select("*").maybeSingle(),sb.from("fasts").select("*"),sb.from("weights").select("*")]);
    if(p.data) S.profile={ft:p.data.height_ft,in:+p.data.height_in,weight:+p.data.weight_lb,sex:p.data.sex,age:p.data.age,activity:+p.data.activity,goal:+p.data.goal_lb};
    else if(S.profile) await remote.profile(S.profile);
    const merge=(local,rows,map,push)=>{const ids=new Set(local.map(x=>x.id));(rows||[]).forEach(r=>{if(!ids.has(r.id))local.push(map(r))});const rids=new Set((rows||[]).map(r=>r.id));local.filter(x=>!rids.has(x.id)).forEach(x=>bg(push(x)));};
    const mapF=r=>({id:r.id,start:Date.parse(r.start_at),hours:+r.target_hours,end:r.end_at?Date.parse(r.end_at):null,completed:r.completed});
    merge(S.fasts,(f.data||[]).filter(r=>r.end_at),mapF,remote.fast);
    const open=(f.data||[]).find(r=>!r.end_at); if(open&&!S.activeFast) S.activeFast=mapF(open); else if(S.activeFast) bg(remote.fast(S.activeFast));
    merge(S.weights,w.data,r=>({id:r.id,at:Date.parse(r.at),lb:+r.lb,source:r.source}),remote.weight);
    save(); Store.onChange&&Store.onChange();
  }

  window.Store={
    get state(){return S}, get user(){return user}, get cloud(){return !!sb},
    setProfile(p){S.profile=p;save();bg(remote.profile(p));},
    startFast(hours){S.activeFast={id:uid(),start:Date.now(),hours,end:null,completed:false};save();bg(remote.fast(S.activeFast));},
    endFast(){const f=S.activeFast;if(!f)return null;f.end=Date.now();f.completed=(f.end-f.start)>=f.hours*3600e3;S.fasts.push(f);S.activeFast=null;save();bg(remote.fast(f));return f;},
    addWeight(lb,source="manual",at=Date.now()){const w={id:uid(),at,lb,source};S.weights.push(w);S.weights.sort((a,b)=>a.at-b.at);
      const latest=S.weights[S.weights.length-1]; if(S.profile){S.profile.weight=latest.lb;bg(remote.profile(S.profile));} save();bg(remote.weight(w));},
    delWeight(id){S.weights=S.weights.filter(w=>w.id!==id);const l=S.weights[S.weights.length-1];if(l&&S.profile){S.profile.weight=l.lb;bg(remote.profile(S.profile));}save();bg(remote.delWeight(id));},
    async signIn(email,password){const r=await sb.auth.signInWithPassword({email,password});if(r.error)throw r.error;},
    async signUp(email,password){const r=await sb.auth.signUp({email,password});if(r.error)throw r.error;return r.data.session?"Signed up and signed in.":"Check your email to confirm, then sign in.";},
    async signOut(){await sb.auth.signOut();},
    onChange:null, onAuth:null
  };
  if(sb){ sb.auth.onAuthStateChange((_e,session)=>{const nu=session?.user||null;const changed=(nu?.id)!==(user?.id);user=nu;Store.onAuth&&Store.onAuth(user);if(user&&changed)setTimeout(()=>pull().catch(e=>console.warn("pull",e)),0);}); }
})();
