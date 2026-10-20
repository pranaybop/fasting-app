// Local-first store. localStorage always; mirrors to Firestore when signed in.
(function(){
  const KEY="fastapp.v1";
  const blank=()=>({profile:null,activeFast:null,fasts:[],weights:[]});
  let S; try{S=Object.assign(blank(),JSON.parse(localStorage.getItem(KEY)||"{}"))}catch(e){S=blank()}
  const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
  const uid=()=>(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g,()=>(Math.random()*16|0).toString(16)));
  let auth=null, db=null, user=null;
  try{
    const cfg=window.FAST_CONFIG&&FAST_CONFIG.firebase;
    if(window.firebase&&cfg&&cfg.apiKey){
      if(!firebase.apps.length) firebase.initializeApp(cfg);
      auth=firebase.auth();
      db=firebase.firestore();
    }
  }catch(e){console.warn("Firebase unavailable",e)}

  const userDoc=()=>db.collection("users").doc(user.uid);
  const remote={
    async profile(p){ if(!user)return; await userDoc().set({profile:p},{merge:true}); },
    async fast(f){ if(!user)return; await userDoc().collection("fasts").doc(f.id).set(f); },
    async weight(w){ if(!user)return; await userDoc().collection("weights").doc(w.id).set(w); },
    async delWeight(id){ if(!user)return; await userDoc().collection("weights").doc(id).delete(); },
    async active(f){ if(!user)return; await userDoc().set({activeFast:f||null},{merge:true}); }
  };
  const bg=p=>p&&p.catch&&p.catch(e=>console.warn("sync",e));

  async function pull(){
    const [doc, fasts, weights]=await Promise.all([
      userDoc().get(),
      userDoc().collection("fasts").get(),
      userDoc().collection("weights").get()
    ]);
    const data=doc.exists?doc.data():{};
    if(data.profile) S.profile=data.profile;
    else if(S.profile) await remote.profile(S.profile);
    const merge=(local,rows,push)=>{
      const ids=new Set(local.map(x=>x.id));
      rows.forEach(r=>{if(!ids.has(r.id))local.push(r)});
      const rids=new Set(rows.map(r=>r.id));
      local.filter(x=>!rids.has(x.id)).forEach(x=>bg(push(x)));
    };
    merge(S.fasts,fasts.docs.map(d=>d.data()),remote.fast);
    if(data.activeFast&&!S.activeFast) S.activeFast=data.activeFast;
    else if(S.activeFast) bg(remote.active(S.activeFast));
    merge(S.weights,weights.docs.map(d=>d.data()),remote.weight);
    S.weights.sort((a,b)=>a.at-b.at);
    save(); Store.onChange&&Store.onChange();
  }

  window.Store={
    get state(){return S}, get user(){return user}, get cloud(){return !!auth},
    setProfile(p){S.profile=p;save();bg(remote.profile(p));},
    startFast(hours){S.activeFast={id:uid(),start:Date.now(),hours:hours||null,end:null,completed:false};save();bg(remote.active(S.activeFast));},
    endFast(){const f=S.activeFast;if(!f)return null;f.end=Date.now();f.completed=f.hours?(f.end-f.start)>=f.hours*3600e3:true;S.fasts.push(f);S.activeFast=null;save();bg(remote.fast(f));bg(remote.active(null));return f;},
    addWeight(lb,source="manual",at=Date.now()){const w={id:uid(),at,lb,source};S.weights.push(w);S.weights.sort((a,b)=>a.at-b.at);
      const latest=S.weights[S.weights.length-1]; if(S.profile){S.profile.weight=latest.lb;bg(remote.profile(S.profile));} save();bg(remote.weight(w));},
    delWeight(id){S.weights=S.weights.filter(w=>w.id!==id);const l=S.weights[S.weights.length-1];if(l&&S.profile){S.profile.weight=l.lb;bg(remote.profile(S.profile));}save();bg(remote.delWeight(id));},
    async signIn(email,password){await auth.signInWithEmailAndPassword(email,password);},
    async signUp(email,password){await auth.createUserWithEmailAndPassword(email,password);return "Signed up and signed in.";},
    async signOut(){await auth.signOut();},
    onChange:null, onAuth:null
  };
  if(auth){ auth.onAuthStateChanged(u=>{const nu=u||null;const changed=(nu&&nu.uid)!==(user&&user.uid);user=nu;Store.onAuth&&Store.onAuth(user);if(user&&changed)setTimeout(()=>pull().catch(e=>console.warn("pull",e)),0);}); }
})();
