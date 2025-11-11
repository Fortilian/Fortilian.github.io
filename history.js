// ===== IndexedDB setup
const DB_NAME = 'poker_split_history_v1';
const DB_VERSION = 1;
const STORE = 'sessions';
let _db = null;

(function openDB(){
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = (e)=>{
    const db = e.target.result;
    if(!db.objectStoreNames.contains(STORE)){
      db.createObjectStore(STORE, { keyPath: 'sessionId' });
    }
  };
  req.onsuccess = (e)=>{ _db = e.target.result; };
  req.onerror = (e)=>{ console.error('IndexedDB fout:', e.target.error); };
})();

// ===== Helpers
function sha1Hex(str){
  // mini SHA-1 polyfill via SubtleCrypto (if available), else fallback simple hash
  if (crypto?.subtle?.digest){
    const enc = new TextEncoder().encode(str);
    return crypto.subtle.digest('SHA-1', enc).then(buf=>{
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    });
  } else {
    // Fallback poor-man hash (non-crypto); acceptable for dedupe id
    let h = 0;
    for (let i=0;i<str.length;i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Promise.resolve((h>>>0).toString(16));
  }
}

function formatTS(d=new Date()){
  const pad = (n)=>String(n).padStart(2,'0');
  const y = d.getFullYear();
  const m = pad(d.getMonth()+1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}${m}${day}_${hh}${mm}`;
}

function euroNum(s){ return parseNum(String(s).replace(/[€\s]/g,'').replace(',','.')); }

// ===== Build current session object from DOM
async function buildSessionFromDOM(){
  const desc = document.getElementById('desc')?.value || 'Pokeravond';
  const players = Array.from(document.querySelectorAll('#grid tbody tr')).map((tr,i)=>{
    const name = tr.querySelector('.name')?.value?.trim() || `Speler ${i+1}`;
    const buyin = euroNum(tr.querySelector('.buyin')?.value)||0;
    const end = euroNum(tr.querySelector('.end')?.value)||0;
    const prof = end - buyin;
    return { name, buyin: +buyin.toFixed(2), end: +end.toFixed(2), profit: +prof.toFixed(2) };
  });

  // sessionId = timestampDate(YYYYMMDD) + '_' + sha1( sortedNames + totalString + desc )
  const dateIso = new Date().toISOString();
  const names = players.map(p=>p.name).sort().join(',');
  const totStr = players.map(p=>`${p.name}:${p.buyin}->${p.end}`).join('|');
  const hash = await sha1Hex(names + '|' + totStr + '|' + (desc||''));
  const dateKey = dateIso.slice(0,10).replace(/-/g,''); // YYYYMMDD
  const sessionId = `${dateKey}_${hash.slice(0,10)}`;

  return {
    sessionId,
    date: dateIso,
    description: desc,
    players
  };
}

// ===== Save / Export / Import
function idbPut(obj){
  return new Promise((resolve,reject)=>{
    const tx = _db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(obj);
    tx.oncomplete = ()=>resolve();
    tx.onerror = (e)=>reject(e.target.error);
  });
}

function idbGetAll(){
  return new Promise((resolve,reject)=>{
    const tx = _db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = ()=>resolve(req.result||[]);
    req.onerror = (e)=>reject(e.target.error);
  });
}

function idbGetAllKeys(){
  return new Promise((resolve,reject)=>{
    const tx = _db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = ()=>resolve(req.result||[]);
    req.onerror = (e)=>reject(e.target.error);
  });
}

async function saveCurrentSession(){
  if(!_db){ alert('Database nog niet klaar.'); return; }
  // Zorg dat berekening up-to-date is
  document.getElementById('calc')?.click();

  const sess = await buildSessionFromDOM();
  await idbPut(sess);
  document.getElementById('lastSaved').textContent = `Opgeslagen ✓ (${new Date().toLocaleString('nl-NL')})`;
}

async function exportBackup(){
  if(!_db){ alert('Database nog niet klaar.'); return; }
  const sessions = await idbGetAll();
  const backup = {
    meta: { exported: new Date().toISOString(), count: sessions.length, db: DB_NAME, v: DB_VERSION },
    sessions
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const fname = `poker_backup_${formatTS()}.json`;

  const canFiles = !!(navigator.canShare && navigator.canShare({ files: [new File(['x'],'x.txt')] }));
  if(navigator.share && canFiles){
    const file = new File([blob], fname, {type:'application/json'});
    try{
      await navigator.share({ files:[file] });
      return;
    }catch(e){
      // val terug naar download
    }
  }
  // fallback download
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

async function importBackupFile(file){
  const text = await file.text();
  const data = JSON.parse(text);
  if(!data?.sessions){ throw new Error('Ongeldige backup'); }
  const existing = new Set((await idbGetAllKeys()).map(String));
  let add=0, upd=0;
  for(const s of data.sessions){
    if(existing.has(String(s.sessionId))) upd++; else add++;
    await idbPut(s);
  }
  alert(`Import klaar: ${add} nieuw, ${upd} bijgewerkt.`);
}

// ===== Wire buttons (exists on index page)
window.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('saveSession')?.addEventListener('click', async ()=>{
    try{ await saveCurrentSession(); }catch(e){ console.error(e); alert('Opslaan mislukt'); }
  });
  document.getElementById('backupBtn')?.addEventListener('click', async ()=>{
    try{ await exportBackup(); }catch(e){ console.error(e); alert('Backup mislukt'); }
  });
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  importBtn?.addEventListener('click', ()=>importFile?.click());
  importFile?.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    try{ await importBackupFile(f); }catch(err){ console.error(err); alert('Import mislukt: '+err.message); }
    e.target.value = '';
  });

  // PWA registration + persistent storage
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js').catch(console.warn);
  }
  if(navigator.storage?.persist){
    navigator.storage.persist().then(g=>console.log('persistent storage',g));
  }
});
