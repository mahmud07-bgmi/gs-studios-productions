(function () {

const CURRENT_SCRIPT_SRC = document.currentScript && document.currentScript.src;

const PAGE = (location.pathname.split('/').pop() || 'index.html').replace('.html','');

const MAP = {
AliveStatus:'AliveStatus',
ElimBroadcast:'ElimBroadcast',
TopAliveStatus:'TopAliveStatus',
TeamPreview:'TeamPreview',
ZoneTimer:'ZoneTimer',
FirstPick:'FirstPick',
MatchResult:'MatchResult',
OverallResult:'OverallResult',
WWCD:'WWCD',
PrizePool:'PrizePool',
MVP:'MVP',
Domination:'Domination'
};

const overlay = MAP[PAGE];
if(!overlay) return;

function apply(data){
    if(!data) return;

    Object.entries(data).forEach(([k,v])=>{
        document.documentElement.style.setProperty(k,v);
    });
}

try{
    const local = JSON.parse(localStorage.getItem("gs-overlay-"+overlay)||"{}");
    apply(local);
}catch(e){}

function startCloudSync(){
    if(!window.GSFirebase){
        console.warn("GSFirebase module missing");
        return;
    }

    const cfg = window.GSFirebase.getConfig();
    if(!cfg || !cfg.databaseURL){
        console.warn("Firebase config missing");
        return;
    }

    window.GSFirebase.listenOverlay(overlay,{
        onData:(data)=>{
            apply(data);
            console.log("Cloud Sync:",overlay);
        },
        onStatus:(status)=>{
            console.log("Cloud connection:",status,"room="+window.GSFirebase.getRoom());
        },
        onError:(err)=>{
            console.error(err);
        }
    });
}

if(window.GSFirebase){
    startCloudSync();
}else{
    // Resolve gs-firebase.js next to this script (control/), regardless of
    // the page's own location/base, so GitHub Pages subpath hosting works.
    const base = CURRENT_SCRIPT_SRC ? CURRENT_SCRIPT_SRC.replace(/theme-runtime\.js.*$/, '') : 'control/';
    const s = document.createElement("script");
    s.src = base + "gs-firebase.js";
    s.onload = startCloudSync;
    s.onerror = ()=>console.error("gs-firebase.js failed to load");
    document.head.appendChild(s);
}

})();
