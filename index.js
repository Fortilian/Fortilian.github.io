import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
// --- CSS ---
const STYLES = `
:root{
  --fg:#0b0b0b;--muted:#6a6a6a;--line:rgba(0,0,0,0.08);--bg:#f2f2f7;--card:#ffffff;--hint:#f7f7f7;
  --accent:#007aff;--danger:#ff3b30;--success:#34c759;--warning:#ffcc00;
  --input-bg:rgba(0,0,0,0.04);--glass-border:rgba(255,255,255,0.6);
  --shadow:0 8px 24px rgba(0,0,0,0.06);
}
@media (prefers-color-scheme: dark){
  :root{
    --fg:#f5f5f7;--muted:#8e8e93;--line:rgba(255,255,255,0.1);--bg:#000000;--card:#1c1c1e;--hint:#2c2c2e;
    --accent:#0a84ff;--danger:#ff453a;--success:#30d158;--warning:#ffd60a;
    --input-bg:rgba(255,255,255,0.1);--glass-border:rgba(255,255,255,0.15);
    --shadow:0 8px 24px rgba(0,0,0,0.4);
  }
}
html,body{background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;margin:0;padding:0;height:100%;}
body{max-width:800px;margin:0 auto;padding-bottom:120px;overflow-x:hidden;}
h1{font-size:1.6rem;margin:0;font-weight:700;letter-spacing:-0.5px;} 
h2{font-size:1.2rem;margin:0;font-weight:600} 
h3{margin:0 0 8px;font-size:1rem;font-weight:600;opacity:0.9} 
h4{margin:0 0 8px;font-size:0.95rem}
.small{font-size:.85rem;color:var(--muted)}
.muted{color:var(--muted)}

/* Liquid Glass Effect */
.glass {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
}
@media (prefers-color-scheme: dark) {
  .glass { background: rgba(30, 30, 30, 0.7); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5); }
}

/* Floating Controls */
.floating-dock-left {
  position: fixed; bottom: 24px; left: 24px; z-index: 2000;
  display: flex; gap: 12px;
}
.floating-dock-right {
  position: fixed; bottom: 24px; right: 24px; z-index: 2000;
  display: flex; gap: 12px;
}
@media (max-width: 450px) {
  .floating-dock-left { left: 16px; bottom: 16px; }
  .floating-dock-right { right: 16px; bottom: 16px; }
}

/* Animated Navigation */
.nav-container {
  position: relative;
  display: flex;
  padding: 5px;
  border-radius: 32px;
  width: 200px;
  height: 50px;
  box-sizing: border-box;
}
.nav-bg {
  position: absolute;
  top: 5px; bottom: 5px; left: 5px;
  width: calc(50% - 5px);
  background: var(--fg);
  border-radius: 26px;
  transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
  z-index: 1;
}
.nav-btn {
  flex: 1;
  border: none;
  background: transparent;
  z-index: 2;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.2s;
  text-align: center;
  border-radius: 26px;
}
.nav-btn.active { color: var(--bg); }

/* Diff Pill */
.diff-pill {
  height: 50px;
  min-width: 90px;
  padding: 0 20px;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
  transition: transform 0.2s, opacity 0.2s;
  cursor: default;
  box-sizing: border-box;
}
.diff-pill.ok { background: rgba(52, 199, 89, 0.7); color: white; border-color: rgba(255,255,255,0.2); }
.diff-pill.bad { background: rgba(255, 59, 48, 0.7); color: white; border-color: rgba(255,255,255,0.2); }
.diff-pill:active { transform: scale(0.95); }

/* Static Action Bar (In Flow) */
.action-bar-static {
  display: flex; gap: 12px; margin-top: 24px;
}
.action-btn {
  flex: 1; border: none; padding: 16px; border-radius: 18px;
  font-weight: 600; font-size: 1rem; cursor: pointer;
  background: var(--card); color: var(--fg);
  box-shadow: var(--shadow);
  transition: filter 0.2s, transform 0.2s;
}
.action-btn.primary { background: var(--fg); color: var(--bg); }
.action-btn:active { transform: scale(0.98); opacity: 0.9; }

/* Cards & Inputs */
.card{border-radius:24px;padding:20px;margin:16px 0;background:var(--card);box-shadow:var(--shadow);}
.row{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0} .row>*{flex:1;min-width:0}
.pill{display:inline-flex;align-items:center;gap:6px;background:var(--input-bg);padding:6px 14px;border-radius:20px;margin:4px 6px 0 0;font-size:0.9rem;font-weight:500;color:var(--fg);cursor:pointer;transition:all 0.15s;}
.pill.active{background:var(--accent);color:#fff}

input,select,button.std{font:inherit;padding:12px 14px;border-radius:12px;border:none;background:var(--input-bg);color:var(--fg);width:100%;box-sizing:border-box;}
input:focus, select:focus { outline: 2px solid var(--accent); background: var(--card); }
.icon-btn{width:36px;height:36px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:50%;border:none;background:transparent;color:var(--muted);font-size:1.2rem;cursor:pointer;}
.icon-btn:hover { background: var(--input-bg); color: var(--danger); }

/* Glass Close Button */
.glass-close-btn {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; cursor: pointer;
  background: rgba(120, 120, 128, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--muted);
  transition: all 0.2s;
}
.glass-close-btn:hover { background: rgba(120, 120, 128, 0.3); color: var(--fg); }

/* Layout */
.page-content{padding:20px 20px 40px;}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 0;margin-bottom:16px;}

/* Table */
.compact-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.compact-table th { text-align: left; font-size: 0.8rem; text-transform: uppercase; letter-spacing:0.5px; color: var(--muted); padding: 0 4px 12px; border-bottom: 1px solid var(--line); }
.compact-table td { padding: 8px 2px; border-bottom: 1px solid var(--line); vertical-align: middle; }
.compact-table tr:last-child td { border-bottom: none; }
.compact-table input { padding: 10px 8px; font-size: 1rem; border-radius: 10px; background: transparent; transition: background 0.2s; font-weight:500; }
.compact-table input:focus { background: var(--input-bg); }
.stepper { display: flex; align-items: center; gap: 4px; background:var(--input-bg); border-radius:12px; padding:2px; }
.stepper input { background:transparent; text-align:center; padding:8px 2px; font-weight:600; min-width: 60px; }
.stepper input:focus { background:var(--card); }
.stepper button { width: 32px; height: 32px; border:none; background:var(--card); border-radius: 9px; color: var(--fg); font-size:1.1rem; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex-shrink: 0; }

/* Leaderboard & Lists */
.list-item { display: flex; align-items: center; padding: 14px 8px; border-bottom: 1px solid var(--line); cursor: pointer; transition: background 0.2s; }
.list-item:last-child { border-bottom: none; }
.list-item:active { background: var(--input-bg); }
.list-rank { width: 32px; font-weight: 700; color: var(--muted); font-size: 1rem; }
.list-content { flex: 1; }
.list-title { font-weight: 600; font-size:1rem; margin-bottom:2px; }
.list-sub { font-size: 0.85rem; color: var(--muted); }
.list-value { font-weight: 700; font-size: 1rem; text-align: right; }
.pos { color: var(--success); } .neg { color: var(--danger); }

/* History Expansion */
.history-details { background: var(--input-bg); padding: 12px; border-radius: 12px; margin-top: 8px; font-size: 0.9rem; animation: slideDown 0.2s ease-out; }
.history-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
.history-row:last-child { border: none; }
.history-header-row { display: flex; justify-content: space-between; padding: 0 0 6px 0; border-bottom: 1px solid rgba(0,0,0,0.1); font-weight: 600; font-size: 0.8rem; text-transform:uppercase; color: var(--muted); margin-bottom: 4px; }
.history-col { flex: 1; text-align: right; }
.history-col:first-child { text-align: left; flex: 1.2; }

/* Modals */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 3000; display: flex; align-items: flex-end; justify-content: center; backdrop-filter:blur(8px); animation: fadeIn 0.2s ease-out; }
.modal-content { background: var(--card); width: 100%; max-width: 600px; max-height: 90vh; border-radius: 32px 32px 0 0; box-shadow: 0 -10px 60px rgba(0,0,0,0.3); animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; overflow: hidden; }
.modal-header {
  padding: 20px 24px;
  display: flex; justify-content: space-between; align-items: center;
  position: sticky; top: 0; z-index: 10;
  background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--line);
}
@media (prefers-color-scheme: dark) { .modal-header { background: rgba(28, 28, 30, 0.85); } }
.modal-body { padding: 24px; overflow-y: auto; overscroll-behavior: contain; }

.chart-box{position:relative;width:100%;height:220px;margin:16px 0;}

/* Heatmap */
.heatmap-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.heatmap-dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.1); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
`;
// --- HELPERS ---
const PRESETS = ['Jordy', 'Ronan', 'Tyson', 'Julian', 'Glenn', 'Max', 'Bram', 'Hanifi', 'Jordi', 'Vince', 'Aron', 'Jeroen'];
function euro(n) { return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' }); }
function parseNum(v) { if (v === '' || v == null)
    return NaN; let s = String(v).replace(',', '.'); const n = Number(s); return Number.isFinite(n) ? n : NaN; }
function roundTo(x, step) { const inv = 1 / step; return Math.round(x * inv) / inv; }
// --- LOGIC ---
function settle(entries, rounding, strategy) {
    let creditors = [], debtors = [], sum = 0;
    for (const e of entries) {
        const a = roundTo(e.amount, rounding);
        sum += a;
        if (a > 1e-9)
            creditors.push({ ...e, amount: a });
        else if (a < -1e-9)
            debtors.push({ ...e, amount: -a });
    }
    if (strategy === 'largest') {
        creditors.sort((a, b) => b.amount - a.amount);
        debtors.sort((a, b) => b.amount - a.amount);
    }
    else {
        creditors.sort((a, b) => a.order - b.order);
        debtors.sort((a, b) => a.order - b.order);
    }
    const transfers = [];
    if (strategy === 'proportional') {
        const totalDebt0 = debtors.reduce((a, d) => a + d.amount, 0);
        for (const c of creditors) {
            let remaining = c.amount;
            for (const d of debtors) {
                if (d.amount <= 1e-9 || remaining <= 1e-9)
                    continue;
                const share = roundTo(c.amount * (d.amount / totalDebt0), rounding);
                const amount = Math.min(share, d.amount, remaining);
                const amtR = roundTo(amount, rounding);
                if (amtR > 0) {
                    transfers.push({ from: d.name, to: c.name, amount: amtR });
                    d.amount = roundTo(d.amount - amtR, rounding);
                    remaining = roundTo(remaining - amtR, rounding);
                }
            }
        }
    }
    else {
        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const d = debtors[i], c = creditors[j];
            const amount = Math.min(d.amount, c.amount);
            const amtR = roundTo(amount, rounding);
            if (amtR > 0) {
                transfers.push({ from: d.name, to: c.name, amount: amtR });
                d.amount = roundTo(d.amount - amtR, rounding);
                c.amount = roundTo(c.amount - amtR, rounding);
            }
            if (d.amount <= 1e-9)
                i++;
            if (c.amount <= 1e-9)
                j++;
        }
    }
    return { transfers, residual: roundTo(sum, rounding) };
}
// --- DATABASE ---
const DB_NAME = 'poker_split_history_v1';
const STORE = 'sessions';
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE))
                db.createObjectStore(STORE, { keyPath: 'sessionId' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
async function saveSessionToDB(session) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(session);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
async function getAllSessions() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}
async function deleteSessionFromDB(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
// --- APP ---
function App() {
    const [view, setView] = useState('calculator');
    const [diff, setDiff] = useState(0);
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: STYLES }), _jsxs("div", { className: "page-content", children: [_jsx("header", { className: "topbar", children: _jsx("h1", { children: view === 'calculator' ? '💸 Poker Split' : '📊 Statistieken' }) }), _jsxs("main", { children: [_jsx("div", { style: { display: view === 'calculator' ? 'block' : 'none' }, children: _jsx(Calculator, { onDiffChange: setDiff, isActive: view === 'calculator' }) }), view === 'stats' && _jsx(Stats, {})] })] }), _jsx("div", { className: "floating-dock-left", children: _jsxs("div", { className: "glass nav-container", children: [_jsx("div", { className: "nav-bg", style: { transform: view === 'calculator' ? 'translateX(0%)' : 'translateX(100%)' } }), _jsx("button", { className: `nav-btn ${view === 'calculator' ? 'active' : ''}`, onClick: () => setView('calculator'), children: "Calculator" }), _jsx("button", { className: `nav-btn ${view === 'stats' ? 'active' : ''}`, onClick: () => setView('stats'), children: "Stats" })] }) }), view === 'calculator' && (_jsx("div", { className: "floating-dock-right", children: _jsx("div", { className: `glass diff-pill ${Math.abs(diff) < 0.01 ? 'ok' : 'bad'}`, children: euro(diff) }) }))] }));
}
function Calculator({ onDiffChange, isActive }) {
    const [desc, setDesc] = useState('Pokeravond');
    const [players, setPlayers] = useState([
        { id: 1, name: 'Julian', buyin: '10', end: '', ab: true },
        { id: 2, name: 'Tyson', buyin: '10', end: '', ab: true }
    ]);
    const [settings, setSettings] = useState({
        defaultBuyin: '10', round: '0.01', strategy: 'largest', perspective: 'receiver', autoBalance: true
    });
    const [showSettings, setShowSettings] = useState(false);
    const [result, setResult] = useState(null);
    useEffect(() => {
        try {
            const raw = localStorage.getItem('poker_split_state');
            if (raw) {
                const s = JSON.parse(raw);
                if (s.players)
                    setPlayers(s.players);
                if (s.desc)
                    setDesc(s.desc);
                if (s.settings)
                    setSettings(prev => ({ ...prev, ...s.settings }));
            }
        }
        catch (e) { }
    }, []);
    useEffect(() => {
        const timer = setTimeout(() => localStorage.setItem('poker_split_state', JSON.stringify({ players, desc, settings })), 500);
        return () => clearTimeout(timer);
    }, [players, desc, settings]);
    const entries = useMemo(() => players.map((p, i) => ({ ...p, amount: (parseNum(p.end) || 0) - (parseNum(p.buyin) || 0), order: i })), [players]);
    const total = entries.reduce((a, e) => a + e.amount, 0);
    useEffect(() => { onDiffChange(total); }, [total, onDiffChange]);
    const addPlayer = (name) => setPlayers(p => [...p, { id: Date.now() + Math.random(), name, buyin: settings.defaultBuyin, end: '', ab: true }]);
    const updatePlayer = (id, field, val) => setPlayers(p => p.map(x => x.id === id ? { ...x, [field]: val } : x));
    const removePlayer = (id) => setPlayers(p => p.filter(x => x.id !== id));
    const stepVal = (id, field, delta) => {
        setPlayers(p => p.map(x => {
            if (x.id !== id)
                return x;
            return { ...x, [field]: ((parseNum(x[field]) || 0) + delta).toFixed(2) };
        }));
    };
    const handlePaste = async () => {
        let txt = '';
        try {
            txt = await navigator.clipboard.readText();
        }
        catch (e) { }
        if (!txt)
            txt = prompt('Plak lijst (Naam, inzet, eind):') || '';
        if (!txt)
            return;
        const lines = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        const newPlayers = [];
        for (const raw of lines) {
            const parts = raw.split(/[;,|\t]/).map(s => s.trim());
            if (parts.length >= 2) {
                const buy = parseNum(parts[1]) || 0;
                const end = parts.length > 2 ? parseNum(parts[2]) : (buy + (parseNum(parts[1]) || 0));
                newPlayers.push({ id: Date.now() + Math.random(), name: parts[0], buyin: String(buy), end: String(end), ab: true });
            }
        }
        if (newPlayers.length)
            setPlayers(prev => [...prev, ...newPlayers]);
    };
    const handleCalculate = () => {
        let activeEntries = entries.map(e => ({ ...e }));
        if (settings.autoBalance && Math.abs(total) > 0.005) {
            const sign = total > 0 ? 1 : -1;
            let pool = activeEntries.filter(e => e.ab && (sign > 0 ? e.amount > 0 : e.amount < 0));
            if (!pool.length)
                pool = activeEntries.filter(e => e.ab);
            if (pool.length) {
                const picked = pool[Math.floor(Math.random() * pool.length)];
                const idx = activeEntries.findIndex(e => e.id === picked.id);
                if (idx >= 0)
                    activeEntries[idx].amount = roundTo(activeEntries[idx].amount - total, 0.01);
            }
        }
        setResult(settle(activeEntries, Number(settings.round), settings.strategy));
        setTimeout(() => { var _a; return (_a = document.getElementById('result-area')) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' }); }, 100);
    };
    const handleSaveSession = async () => {
        if (!players.filter(p => p.name).length)
            return alert('Geen spelers.');
        const session = {
            sessionId: new Date().toISOString() + '_' + Math.random().toString(36).slice(2),
            date: new Date().toISOString(),
            desc,
            players: players.map(p => ({ name: p.name, buyin: parseNum(p.buyin) || 0, end: parseNum(p.end) || 0, net: (parseNum(p.end) || 0) - (parseNum(p.buyin) || 0) }))
        };
        await saveSessionToDB(session);
        handleCalculate();
        alert('Opgeslagen!');
    };
    const handleShare = async () => {
        if (!result)
            return;
        const lines = [`💸 ${desc}`, `📅 ${new Date().toLocaleDateString()}`, '', 'Resultaat:'];
        entries.forEach(e => lines.push(`• ${e.name}: ${e.amount > 0 ? '+' : ''}${euro(e.amount)}`));
        lines.push('', 'Tikkies:');
        if (!result.transfers.length)
            lines.push('Niemand hoeft te betalen.');
        else
            result.transfers.forEach((t) => lines.push(`• ${t.from} → ${t.to}: ${euro(t.amount)}`));
        const text = lines.join('\n');
        if (navigator.share)
            try {
                await navigator.share({ text });
            }
            catch (e) { }
        else
            window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }, onClick: () => setShowSettings(!showSettings), children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }, children: _jsx("input", { value: desc, onChange: e => { e.stopPropagation(); setDesc(e.target.value); }, style: { fontWeight: 600 }, onClick: e => e.stopPropagation() }) }), _jsx("div", { className: "icon-btn", style: { fontSize: '0.8rem' }, children: showSettings ? '▲' : '▼' })] }), showSettings && (_jsxs("div", { style: { marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '12px' }, children: [_jsxs("div", { className: "row", children: [_jsxs("div", { children: [_jsx("label", { className: "small muted", children: "Standaard" }), _jsx("input", { type: "number", value: settings.defaultBuyin, onChange: e => setSettings({ ...settings, defaultBuyin: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "small muted", children: "Afronden" }), _jsxs("select", { value: settings.round, onChange: e => setSettings({ ...settings, round: e.target.value }), children: [_jsx("option", { value: "0.01", children: "0,01" }), _jsx("option", { value: "0.05", children: "0,05" }), _jsx("option", { value: "1", children: "1,00" })] })] })] }), _jsxs("div", { style: { marginTop: '12px', display: 'flex', gap: '10px' }, children: [_jsx("button", { className: "std", onClick: () => setPlayers(ps => ps.map(p => ({ ...p, buyin: settings.defaultBuyin }))), children: "Reset Inzet" }), _jsx("button", { className: "std", onClick: () => setPlayers(ps => ps.map(p => ({ ...p, end: p.buyin }))), children: "Eind = Inzet" })] })] }))] }), _jsxs("div", { className: "card", style: { padding: '20px' }, children: [_jsxs("div", { style: { marginBottom: '24px' }, children: [_jsx("h3", { children: "Spelers Kiezen" }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' }, children: PRESETS.map(name => (_jsx("span", { className: `pill ${players.find(p => p.name.toLowerCase() === name.toLowerCase()) ? 'active' : ''}`, onClick: () => {
                                        const exists = players.find(p => p.name.toLowerCase() === name.toLowerCase());
                                        if (exists)
                                            removePlayer(exists.id);
                                        else
                                            addPlayer(name);
                                    }, children: name }, name))) }), _jsxs("div", { className: "row", style: { marginTop: '12px' }, children: [_jsx("input", { id: "customName", placeholder: "Naam toevoegen...", onKeyDown: e => { if (e.key === 'Enter') {
                                            addPlayer(e.currentTarget.value);
                                            e.currentTarget.value = '';
                                        } } }), _jsx("button", { className: "std", style: { flex: 0.4 }, onClick: handlePaste, children: "Plak lijst" })] })] }), _jsx("div", { style: { overflowX: 'auto', margin: '0 -20px', padding: '0 20px' }, children: _jsxs("table", { className: "compact-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: '32%' }, children: "Speler" }), _jsx("th", { style: { width: '30%' }, children: "In" }), _jsx("th", { style: { width: '30%' }, children: "Uit" }), _jsx("th", { style: { width: '30px' } })] }) }), _jsx("tbody", { children: players.map(p => {
                                        const prof = (parseNum(p.end) || 0) - (parseNum(p.buyin) || 0);
                                        return (_jsxs("tr", { children: [_jsx("td", { children: _jsx("input", { value: p.name, onChange: ev => updatePlayer(p.id, 'name', ev.target.value), placeholder: "Naam" }) }), _jsx("td", { children: _jsxs("div", { className: "stepper", children: [_jsx("button", { onClick: () => stepVal(p.id, 'buyin', -10), children: "-" }), _jsx("input", { type: "number", step: "0.01", value: p.buyin, onChange: ev => updatePlayer(p.id, 'buyin', ev.target.value), placeholder: "0" }), _jsx("button", { onClick: () => stepVal(p.id, 'buyin', 10), children: "+" })] }) }), _jsx("td", { children: _jsxs("div", { className: "stepper", children: [_jsx("button", { onClick: () => stepVal(p.id, 'end', -10), children: "-" }), _jsx("input", { type: "number", step: "0.01", value: p.end, onChange: ev => updatePlayer(p.id, 'end', ev.target.value), placeholder: "0" }), _jsx("button", { onClick: () => stepVal(p.id, 'end', 10), children: "+" })] }) }), _jsx("td", { children: _jsx("button", { className: "icon-btn", onClick: () => removePlayer(p.id), children: "\u00D7" }) })] }, p.id));
                                    }) })] }) }), _jsxs("div", { className: "action-bar-static", children: [_jsx("button", { className: "action-btn", onClick: handleSaveSession, children: "Opslaan" }), _jsx("button", { className: "action-btn primary", onClick: handleCalculate, children: "Bereken" })] })] }), result && (_jsxs("div", { id: "result-area", className: "card", style: { border: '1px solid var(--accent)' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }, children: [_jsx("h3", { children: "Resultaat" }), _jsx("button", { className: "pill", onClick: handleShare, children: "\uD83D\uDCE4 Delen" })] }), result.transfers.length === 0 ? _jsx("p", { className: "muted", children: "Geen transacties." }) : result.transfers.map((t, i) => (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }, children: [_jsxs("span", { children: [t.from, " ", _jsx("span", { className: "muted", children: "\u279C" }), " ", t.to] }), _jsx("span", { style: { fontWeight: 'bold' }, children: euro(t.amount) })] }, i)))] }))] }));
}
function Stats() {
    const [sessions, setSessions] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [showAllCharts, setShowAllCharts] = useState(false);
    const [showAllLeaderboardModal, setShowAllLeaderboardModal] = useState(false);
    const [showAllHistoryModal, setShowAllHistoryModal] = useState(false);
    const [expandedSessionId, setExpandedSessionId] = useState(null);
    const [expandedPlayerSessionId, setExpandedPlayerSessionId] = useState(null);
    // Chart refs
    const chartRef1 = useRef(null);
    const chartRef2 = useRef(null);
    const chartInst1 = useRef(null);
    const chartInst2 = useRef(null);
    const chartDetailRef = useRef(null);
    const chartDetailInst = useRef(null);
    const ovRef1 = useRef(null);
    const ovRef2 = useRef(null);
    const ovRef3 = useRef(null);
    const ovInst = useRef([]);
    const reload = () => getAllSessions().then(data => setSessions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
    useEffect(() => { reload(); }, []);
    const { stats, totalStake, funStats, heatmapDots } = useMemo(() => {
        const map = new Map();
        let totStake = 0;
        // Fun Stats placeholders
        let bestWin = { amount: 0, name: '', date: '' };
        let worstLoss = { amount: 0, name: '', date: '' };
        let bestStake = { amount: 0, date: '' }; // Total stake of a session
        let biggestTable = { count: 0, date: '' };
        // For heatmap
        const sessionStakes = [];
        sessions.forEach(sess => {
            const sessPlayers = sess.players || [];
            let sessStake = 0;
            if (sessPlayers.length > biggestTable.count) {
                biggestTable = { count: sessPlayers.length, date: sess.date };
            }
            sessPlayers.forEach((p) => {
                const net = typeof p.net === 'number' ? p.net : ((parseNum(p.end) || 0) - (parseNum(p.buyin) || 0));
                const buy = parseNum(p.buyin) || 0;
                sessStake += buy;
                totStake += buy;
                if (!map.has(p.name))
                    map.set(p.name, { name: p.name, total: 0, count: 0, wins: 0, stake: 0, maxWin: -Infinity, maxLoss: Infinity, nets: [] });
                const s = map.get(p.name);
                s.total += net;
                s.stake += buy;
                s.count++;
                s.nets.push(net);
                if (net > 0)
                    s.wins++;
                if (net > s.maxWin)
                    s.maxWin = net;
                if (net < s.maxLoss)
                    s.maxLoss = net;
                if (net > bestWin.amount)
                    bestWin = { amount: net, name: p.name, date: sess.date };
                if (net < worstLoss.amount)
                    worstLoss = { amount: net, name: p.name, date: sess.date };
            });
            if (sessStake > bestStake.amount) {
                bestStake = { amount: sessStake, date: sess.date };
            }
            sessionStakes.push({ date: sess.date, amount: sessStake });
        });
        const playerStats = Array.from(map.values()).map((s) => {
            const avg = s.total / s.count;
            const variance = s.nets.reduce((a, n) => a + Math.pow(n - avg, 2), 0) / s.count;
            return {
                ...s,
                avg,
                stdev: Math.sqrt(variance),
                winRate: Math.round((s.wins / s.count) * 100),
                maxWin: s.maxWin === -Infinity ? 0 : s.maxWin,
                maxLoss: s.maxLoss === Infinity ? 0 : s.maxLoss
            };
        }).sort((a, b) => b.total - a.total);
        // Advanced Fun Stats
        const fun = [];
        if (bestWin.name)
            fun.push({ label: '🔥 Grootste winst', text: `${bestWin.name} (${euro(bestWin.amount)})` });
        if (worstLoss.name)
            fun.push({ label: '💣 Grootste verlies', text: `${worstLoss.name} (${euro(worstLoss.amount)})` });
        if (bestStake.amount > 0)
            fun.push({ label: '🏆 Hoogste inzet-avond', text: `${euro(bestStake.amount)} op ${new Date(bestStake.date).toLocaleDateString()}` });
        if (playerStats.length) {
            const mostActive = playerStats.reduce((prev, current) => (prev.count > current.count) ? prev : current);
            fun.push({ label: '👑 Meest gespeelde speler', text: `${mostActive.name} (${mostActive.count}x)` });
            // Min 3 sessions for avg/swing
            const regulars = playerStats.filter((p) => p.count >= 3);
            if (regulars.length > 0) {
                const bestAvg = regulars.reduce((prev, curr) => (curr.avg > prev.avg ? curr : prev), regulars[0]);
                fun.push({ label: '📈 Beste gemiddelde (≥3 avonden)', text: `${bestAvg.name} (${euro(bestAvg.avg)})` });
                const mostSwing = regulars.reduce((prev, curr) => (curr.stdev > prev.stdev ? curr : prev), regulars[0]);
                fun.push({ label: '🎢 Meest swingende speler (≥3 avonden)', text: `${mostSwing.name} (σ ${euro(mostSwing.stdev)})` });
            }
        }
        if (biggestTable.count > 0)
            fun.push({ label: '👥 Grootste tafel', text: `${biggestTable.count} spelers` });
        // Heatmap data calculation
        const maxSessStake = Math.max(...sessionStakes.map(s => s.amount), 1);
        const heatmapDots = sessionStakes.reverse().map(s => ({
            ...s,
            intensity: s.amount / maxSessStake
        }));
        return { stats: playerStats, totalStake: totStake, funStats: fun, heatmapDots };
    }, [sessions]);
    // Main Charts
    useEffect(() => {
        if (!window.Chart || !chartRef1.current)
            return;
        const sessSorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const labels = sessSorted.map(s => new Date(s.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }));
        if (chartInst1.current)
            chartInst1.current.destroy();
        const data = sessSorted.map(s => (s.players || []).reduce((a, p) => a + (parseNum(p.buyin) || 0), 0));
        chartInst1.current = new window.Chart(chartRef1.current, {
            type: 'line', data: { labels, datasets: [{ label: 'Pot', data, borderColor: '#007aff', tension: 0.3, fill: true, backgroundColor: 'rgba(0,122,255,0.1)' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { beginAtZero: true } } }
        });
        if (chartRef2.current) {
            if (chartInst2.current)
                chartInst2.current.destroy();
            const top5 = stats.slice(0, 5);
            const datasets = top5.map((p, i) => {
                let cum = 0;
                const d = sessSorted.map(s => {
                    const pl = (s.players || []).find((x) => x.name === p.name);
                    cum += pl ? (typeof pl.net === 'number' ? pl.net : (parseNum(pl.end) - parseNum(pl.buyin))) : 0;
                    return cum;
                });
                return { label: p.name, data: d, borderColor: `hsl(${i * 60}, 70%, 50%)`, borderWidth: 2, pointRadius: 0 };
            });
            chartInst2.current = new window.Chart(chartRef2.current, {
                type: 'line', data: { labels, datasets },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } }, scales: { x: { display: false } } }
            });
        }
    }, [sessions, stats]);
    // Player Detail Chart
    useEffect(() => {
        if (!selectedPlayer || !chartDetailRef.current || !window.Chart)
            return;
        if (chartDetailInst.current)
            chartDetailInst.current.destroy();
        const sessSorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let cum = 0;
        const data = [];
        const labels = [];
        sessSorted.forEach(s => {
            const pl = (s.players || []).find((p) => p.name === selectedPlayer.name);
            if (pl) {
                cum += typeof pl.net === 'number' ? pl.net : (parseNum(pl.end) - parseNum(pl.buyin));
                data.push(cum);
                labels.push(new Date(s.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }));
            }
        });
        chartDetailInst.current = new window.Chart(chartDetailRef.current, {
            type: 'line', data: { labels, datasets: [{ label: 'Totaal', data, borderColor: '#007aff', tension: 0.2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }, [selectedPlayer]);
    // Overlay Charts
    useEffect(() => {
        if (!showAllCharts || !window.Chart)
            return;
        ovInst.current.forEach(c => c.destroy());
        ovInst.current = [];
        const names = stats.map((p) => p.name);
        if (ovRef1.current)
            ovInst.current.push(new window.Chart(ovRef1.current, { type: 'bar', data: { labels: names, datasets: [{ label: 'Winst', data: stats.map((p) => p.total), backgroundColor: stats.map((p) => p.total >= 0 ? '#34c759' : '#ff3b30') }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }));
        if (ovRef2.current)
            ovInst.current.push(new window.Chart(ovRef2.current, { type: 'bar', data: { labels: names, datasets: [{ label: 'Inzet', data: stats.map((p) => p.stake), backgroundColor: '#007aff' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }));
        if (ovRef3.current)
            ovInst.current.push(new window.Chart(ovRef3.current, { type: 'bar', data: { labels: names, datasets: [{ label: 'Win %', data: stats.map((p) => p.winRate), backgroundColor: '#ffcc00' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }));
    }, [showAllCharts, stats]);
    const handleDelete = async (id, e) => { e.stopPropagation(); if (confirm('Verwijderen?')) {
        await deleteSessionFromDB(id);
        reload();
    } };
    const handleImport = (e) => {
        var _a;
        const file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = async (evt) => { var _a; try {
            const d = JSON.parse((_a = evt.target) === null || _a === void 0 ? void 0 : _a.result);
            if (Array.isArray(d.sessions)) {
                for (const s of d.sessions)
                    await saveSessionToDB(s);
                reload();
                alert('Gelukt!');
            }
        }
        catch (err) {
            alert('Fout.');
        } };
        reader.readAsText(file);
        e.target.value = '';
    };
    const handleExport = () => {
        const blob = new Blob([JSON.stringify({ sessions }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `poker_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };
    const visibleLeaderboard = stats.slice(0, 5);
    // Render History Items helper
    const renderHistoryItems = (list, expandedIdState, setExpandedIdState) => list.map(s => {
        const isExpanded = expandedIdState === s.sessionId;
        return (_jsxs("div", { style: { padding: '12px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }, onClick: () => setExpandedIdState(isExpanded ? null : s.sessionId), children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { style: { fontWeight: 600 }, children: new Date(s.date).toLocaleDateString() }), _jsx("span", { className: "muted small", children: s.desc })] }), !isExpanded && (_jsx("div", { className: "small muted", style: { marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: (s.players || []).map((p) => p.name).join(', ') })), isExpanded && (_jsxs("div", { className: "history-details", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "history-header-row", children: [_jsx("div", { className: "history-col", children: "Naam" }), _jsx("div", { className: "history-col", children: "In" }), _jsx("div", { className: "history-col", children: "Uit" }), _jsx("div", { className: "history-col", children: "Res" })] }), (s.players || []).map((p, i) => {
                            const net = typeof p.net === 'number' ? p.net : (p.end - p.buyin);
                            return (_jsxs("div", { className: "history-row", children: [_jsx("div", { className: "history-col", children: p.name }), _jsx("div", { className: "history-col", style: { color: 'var(--muted)' }, children: euro(p.buyin) }), _jsx("div", { className: "history-col", style: { color: 'var(--muted)' }, children: euro(p.end) }), _jsx("div", { className: "history-col", style: { fontWeight: 600, color: net >= 0 ? 'var(--success)' : 'var(--danger)' }, children: euro(net) })] }, i));
                        }), _jsx("div", { style: { marginTop: '12px', textAlign: 'right' }, children: _jsx("button", { className: "pill", style: { color: 'var(--danger)' }, onClick: (e) => handleDelete(s.sessionId, e), children: "Verwijder avond" }) })] }))] }, s.sessionId));
    });
    // Calculate specific history for selected player
    const playerHistory = useMemo(() => {
        if (!selectedPlayer)
            return [];
        return sessions.filter(s => (s.players || []).some((p) => p.name === selectedPlayer.name))
            .map(s => {
            const p = (s.players || []).find((x) => x.name === selectedPlayer.name);
            return { ...s, playerNet: typeof p.net === 'number' ? p.net : (parseNum(p.end) - parseNum(p.buyin)) };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sessions, selectedPlayer]);
    return (_jsxs("div", { children: [_jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: 'flex', gap: '12px', marginBottom: '16px' }, children: [_jsxs("div", { style: { flex: 1, textAlign: 'center' }, children: [_jsx("div", { className: "small muted", children: "Pot Totaal" }), _jsx("div", { style: { fontWeight: 700, fontSize: '1.2rem' }, children: euro(totalStake) })] }), _jsxs("div", { style: { flex: 1, textAlign: 'center' }, children: [_jsx("div", { className: "small muted", children: "Avonden" }), _jsx("div", { style: { fontWeight: 700, fontSize: '1.2rem' }, children: sessions.length })] })] }), _jsxs("div", { style: { background: 'var(--input-bg)', borderRadius: '12px', padding: '12px' }, children: [funStats.length === 0 ? _jsx("span", { className: "small muted", children: "Speel wat potjes voor statistieken!" }) :
                                funStats.map((s, i) => (_jsxs("div", { className: "small", style: { marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }, children: [_jsxs("span", { style: { color: 'var(--muted)' }, children: [s.label, ":"] }), _jsx("span", { style: { fontWeight: 500, textAlign: 'right' }, children: s.text })] }, i))), sessions.length > 1 && (_jsxs("div", { style: { marginTop: '12px' }, children: [_jsx("div", { className: "small", style: { color: 'var(--muted)', marginBottom: '4px' }, children: "\uD83D\uDD25 Inzet-intensiteit over avonden:" }), _jsx("div", { className: "heatmap-grid", children: heatmapDots.map((dot, i) => {
                                            const color = `rgba(0, 122, 255, ${0.2 + (dot.intensity * 0.8)})`;
                                            return _jsx("div", { className: "heatmap-dot", style: { backgroundColor: color }, title: `${new Date(dot.date).toLocaleDateString()}: ${euro(dot.amount)}` }, i);
                                        }) })] }))] })] }), _jsxs("div", { className: "card", style: { padding: '0 0 12px 0' }, children: [_jsx("div", { style: { padding: '20px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: _jsx("h3", { children: "Leaderboard" }) }), _jsxs("div", { children: [visibleLeaderboard.map((s, i) => (_jsxs("div", { className: "list-item", onClick: () => setSelectedPlayer(s), children: [_jsx("div", { className: "list-rank", style: { paddingLeft: '20px' }, children: i + 1 }), _jsxs("div", { className: "list-content", children: [_jsx("div", { className: "list-title", children: s.name }), _jsxs("div", { className: "list-sub", children: [s.count, "x gespeeld"] })] }), _jsx("div", { className: `list-value ${s.total >= 0 ? 'pos' : 'neg'}`, style: { paddingRight: '20px' }, children: euro(s.total) })] }, s.name))), stats.length > 5 && (_jsx("div", { style: { padding: '12px', textAlign: 'center' }, children: _jsxs("button", { className: "pill", onClick: () => setShowAllLeaderboardModal(true), children: ["Toon alles (", stats.length, ")"] }) })), stats.length === 0 && _jsx("div", { style: { padding: '20px', textAlign: 'center' }, className: "small muted", children: "Geen data" })] })] }), _jsxs("div", { className: "card", children: [_jsx("h3", { children: "Trends" }), _jsx("div", { style: { height: '180px', position: 'relative' }, children: _jsx("canvas", { ref: chartRef1 }) }), _jsx("div", { style: { height: '180px', position: 'relative', marginTop: '24px' }, children: _jsx("canvas", { ref: chartRef2 }) }), _jsx("button", { className: "pill", style: { display: 'block', margin: '16px auto 0' }, onClick: () => setShowAllCharts(true), children: "Toon alle grafieken..." })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }, children: [_jsx("h3", { children: "Geschiedenis" }), _jsxs("div", { children: [_jsx("button", { className: "pill", onClick: handleExport, children: "Backup" }), _jsxs("label", { className: "pill", style: { marginLeft: '6px' }, children: ["Import", _jsx("input", { type: "file", onChange: handleImport, accept: ".json", style: { display: 'none' } })] })] })] }), renderHistoryItems(sessions.slice(0, 3), expandedSessionId, setExpandedSessionId), sessions.length > 3 && (_jsx("div", { style: { padding: '12px', textAlign: 'center' }, children: _jsxs("button", { className: "pill", onClick: () => setShowAllHistoryModal(true), children: ["Toon alles (", sessions.length, ")"] }) }))] }), selectedPlayer && (_jsx("div", { className: "modal-overlay", onClick: () => setSelectedPlayer(null), children: _jsxs("div", { className: "modal-content", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("h2", { children: selectedPlayer.name }), _jsx("button", { className: "glass-close-btn", onClick: () => setSelectedPlayer(null), children: "\u2715" })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("div", { className: "row", children: [_jsxs("div", { className: "glass", style: { flex: 1, textAlign: 'center', padding: '12px', borderRadius: '16px' }, children: [_jsx("div", { className: "small muted", children: "Winst" }), _jsx("div", { style: { fontWeight: 700, fontSize: '1.1rem', color: selectedPlayer.total >= 0 ? 'var(--success)' : 'var(--danger)' }, children: euro(selectedPlayer.total) })] }), _jsxs("div", { className: "glass", style: { flex: 1, textAlign: 'center', padding: '12px', borderRadius: '16px' }, children: [_jsx("div", { className: "small muted", children: "Win %" }), _jsxs("div", { style: { fontWeight: 700, fontSize: '1.1rem' }, children: [selectedPlayer.winRate, "%"] })] })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "glass", style: { flex: 1, textAlign: 'center', padding: '12px', borderRadius: '16px' }, children: [_jsx("div", { className: "small muted", children: "Max Winst" }), _jsx("div", { style: { fontWeight: 600, color: 'var(--success)' }, children: euro(selectedPlayer.maxWin) })] }), _jsxs("div", { className: "glass", style: { flex: 1, textAlign: 'center', padding: '12px', borderRadius: '16px' }, children: [_jsx("div", { className: "small muted", children: "Max Verlies" }), _jsx("div", { style: { fontWeight: 600, color: 'var(--danger)' }, children: euro(selectedPlayer.maxLoss) })] })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "glass", style: { flex: 1, textAlign: 'center', padding: '12px', borderRadius: '16px' }, children: [_jsx("div", { className: "small muted", children: "Gemiddeld" }), _jsx("div", { style: { fontWeight: 600 }, children: euro(selectedPlayer.avg) })] }), _jsxs("div", { className: "glass", style: { flex: 1, textAlign: 'center', padding: '12px', borderRadius: '16px' }, children: [_jsx("div", { className: "small muted", children: "Volatiliteit (SD)" }), _jsx("div", { style: { fontWeight: 600 }, children: euro(selectedPlayer.stdev) })] })] }), _jsx("div", { className: "chart-box", style: { marginTop: '24px' }, children: _jsx("canvas", { ref: chartDetailRef }) }), _jsx("h3", { style: { marginTop: '24px' }, children: "Gespeelde Avonden" }), _jsx("div", { children: renderHistoryItems(playerHistory, expandedPlayerSessionId, setExpandedPlayerSessionId) })] })] }) })), showAllLeaderboardModal && (_jsx("div", { className: "modal-overlay", onClick: () => setShowAllLeaderboardModal(false), children: _jsxs("div", { className: "modal-content", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("h2", { children: "Leaderboard" }), _jsx("button", { className: "glass-close-btn", onClick: () => setShowAllLeaderboardModal(false), children: "\u2715" })] }), _jsx("div", { className: "modal-body", style: { padding: 0 }, children: stats.map((s, i) => (_jsxs("div", { className: "list-item", onClick: () => { setShowAllLeaderboardModal(false); setSelectedPlayer(s); }, children: [_jsx("div", { className: "list-rank", style: { paddingLeft: '20px' }, children: i + 1 }), _jsxs("div", { className: "list-content", children: [_jsx("div", { className: "list-title", children: s.name }), _jsxs("div", { className: "list-sub", children: [s.count, "x gespeeld"] })] }), _jsx("div", { className: `list-value ${s.total >= 0 ? 'pos' : 'neg'}`, style: { paddingRight: '20px' }, children: euro(s.total) })] }, s.name))) })] }) })), showAllHistoryModal && (_jsx("div", { className: "modal-overlay", onClick: () => setShowAllHistoryModal(false), children: _jsxs("div", { className: "modal-content", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("h2", { children: "Alle Avonden" }), _jsx("button", { className: "glass-close-btn", onClick: () => setShowAllHistoryModal(false), children: "\u2715" })] }), _jsx("div", { className: "modal-body", style: { padding: 0 }, children: renderHistoryItems(sessions, expandedSessionId, setExpandedSessionId) })] }) })), showAllCharts && (_jsx("div", { className: "modal-overlay", onClick: () => setShowAllCharts(false), children: _jsxs("div", { className: "modal-content", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsx("h2", { children: "Alle Grafieken" }), _jsx("button", { className: "glass-close-btn", onClick: () => setShowAllCharts(false), children: "\u2715" })] }), _jsxs("div", { className: "modal-body", children: [_jsx("h4", { children: "Winst per speler" }), _jsx("div", { className: "chart-box", children: _jsx("canvas", { ref: ovRef1 }) }), _jsx("h4", { children: "Inzet per speler" }), _jsx("div", { className: "chart-box", children: _jsx("canvas", { ref: ovRef2 }) }), _jsx("h4", { children: "Win Percentage" }), _jsx("div", { className: "chart-box", children: _jsx("canvas", { ref: ovRef3 }) })] })] }) }))] }));
}
const root = createRoot(document.getElementById('root'));
root.render(_jsx(App, {}));
