/* global pdfjsLib, Tesseract */

pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js";

const els = {
dropzone: document.getElementById("dropzone"),
pdfInput: document.getElementById("pdfInput"),
fileMeta: document.getElementById("fileMeta"),
analyzeBtn: document.getElementById("analyzeBtn"),
ocrBtn: document.getElementById("ocrBtn"),
clearBtn: document.getElementById("clearBtn"),

kwhValue: document.getElementById("kwhValue"),
periodValue: document.getElementById("periodValue"),
tariffValue: document.getElementById("tariffValue"),
prevReadValue: document.getElementById("prevReadValue"),
currReadValue: document.getElementById("currReadValue"),
methodValue: document.getElementById("methodValue"),

extractedBox: document.getElementById("extractedBox"),
ocrBox: document.getElementById("ocrBox"),
candidatesBox: document.getElementById("candidatesBox"),

confFill: document.getElementById("confFill"),
confText: document.getElementById("confText"),

statusText: document.getElementById("statusText"),
statusDot: document.getElementById("statusDot"),

canvas: document.getElementById("pdfCanvas"),
progressFill: document.getElementById("progressFill"),
progressText: document.getElementById("progressText"),

manualKwh: document.getElementById("manualKwh"),
applyManualBtn: document.getElementById("applyManualBtn"),
};

let currentFile = null;
let extractedText = "";
let ocrText = "";

function setDot(color) {
const map = {
good: "var(--good)",
warn: "var(--warn)",
bad: "var(--bad)",
};
els.statusDot.style.background = map[color] || "var(--good)";
els.statusDot.style.boxShadow =
color === "warn" ? "0 0 0 4px rgba(251,191,36,.10)"
: color === "bad" ? "0 0 0 4px rgba(251,113,133,.12)"
: "0 0 0 4px rgba(134,239,172,.10)";
}

function setStatus(msg, tone = "good") {
els.statusText.textContent = msg;
setDot(tone);
}

function setProgress(pct, msg = "—") {
const clamped = Math.max(0, Math.min(100, pct));
els.progressFill.style.width = `${clamped}%`;
els.progressText.textContent = msg;
}

function formatBytes(bytes) {
const units = ["B", "KB", "MB", "GB"];
let i = 0;
let n = bytes;
while (n >= 1024 && i < units.length - 1) {
n /= 1024;
i++;
}
return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function resetUI() {
currentFile = null;
extractedText = "";
ocrText = "";

els.fileMeta.textContent = "Sin archivo";
els.analyzeBtn.disabled = true;
els.ocrBtn.disabled = true;
els.clearBtn.disabled = true;

els.kwhValue.textContent = "—";
els.periodValue.textContent = "—";
els.tariffValue.textContent = "—";
els.prevReadValue.textContent = "—";
els.currReadValue.textContent = "—";
els.methodValue.textContent = "—";

els.extractedBox.textContent = "—";
els.ocrBox.textContent = "—";
els.candidatesBox.textContent = "—";

els.confFill.style.width = "0%";
els.confText.textContent = "—";

els.manualKwh.value = "";

const ctx = els.canvas.getContext("2d");
ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);

setProgress(0, "—");
setStatus("Listo");
}

async function readFileAsArrayBuffer(file) {
return new Promise((resolve, reject) => {
const r = new FileReader();
r.onload = () => resolve(r.result);
r.onerror = reject;
r.readAsArrayBuffer(file);
});
}

function normalizeText(t) {
return (t || "")
.replace(/\u00A0/g, " ")
.replace(/[ \t]+/g, " ")
.replace(/\r/g, "")
.trim();
}

function toNumberFlex(s) {
let x = String(s).trim();
if (/,/.test(x) && /\./.test(x)) x = x.replace(/,/g, "");
else if (/,/.test(x) && !/\./.test(x)) x = x.replace(/,/g, ".");
const n = Number(x);
return Number.isFinite(n) ? n : null;
}

function isPdf(file) {
return file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
}

/* ===== PDF & OCR ===== */

async function renderFirstPage(pdf) {
const page = await pdf.getPage(1);
const viewport = page.getViewport({ scale: 1.7 });

const canvas = els.canvas;
const ctx = canvas.getContext("2d");
canvas.width = Math.floor(viewport.width);
canvas.height = Math.floor(viewport.height);

await page.render({ canvasContext: ctx, viewport }).promise;
}

async function extractAllText(pdf) {
let text = "";
for (let p = 1; p <= pdf.numPages; p++) {
const page = await pdf.getPage(p);
const content = await page.getTextContent();
const strings = content.items.map((it) => it.str);
text += strings.join(" ") + "\n";
}
return text;
}

async function runOcrFromCanvas() {
setStatus("OCR: inicializando…", "warn");
setProgress(5, "OCR: preparando…");

const dataUrl = els.canvas.toDataURL("image/png");

const res = await Tesseract.recognize(dataUrl, "spa", {
logger: (m) => {
if (m.status === "recognizing text") {
const pct = Math.round((m.progress || 0) * 100);
setProgress(Math.max(10, pct), `OCR: ${pct}%`);
} else if (m.status) {
setProgress(10, `OCR: ${m.status}`);
}
},
});

setProgress(100, "OCR: listo");
return res?.data?.text || "";
}

/* ===== DETECCIÓN CFE ===== */

function detectTariff(text) {
const t = normalizeText(text);

const m1 = t.match(/\bTARIFA\b[:\s-]*([A-Z0-9]{1,4}(?:\s*[A-Z]{1,3})?)/i);
if (m1?.[1]) return m1[1].trim();

const m2 = t.match(/\b(DAC)\b/i);
if (m2?.[1]) return m2[1].toUpperCase();

const m3 = t.match(/\bDOM[ÉE]STICA\b/i);
if (m3) return "DOMÉSTICA";

return null;
}

function detectPeriod(text) {
const t = normalizeText(text);

const patterns = [
/\bPERIODO\b[^0-9A-Z]*([0-3]?\d[\/\-][0-1]?\d[\/\-](?:\d{2}|\d{4}))\s*(?:AL|A|-|–|—)\s*([0-3]?\d[\/\-][0-1]?\d[\/\-](?:\d{2}|\d{4}))/i,
/\bPERIODO\b[^A-Z0-9]*([0-3]?\d\s+[A-ZÁÉÍÓÚÑ]{3,}\s+\d{4})\s*(?:AL|A|-|–|—)\s*([0-3]?\d\s+[A-ZÁÉÍÓÚÑ]{3,}\s+\d{4})/i,
/\bDEL\b[^0-9A-Z]*([0-3]?\d[\/\-][0-1]?\d[\/\-](?:\d{2}|\d{4}))\s*\bAL\b\s*([0-3]?\d[\/\-][0-1]?\d[\/\-](?:\d{2}|\d{4}))/i,
/\bPERIODO\s+DE\s+CONSUMO\b[^0-9A-Z]*([0-3]?\d[\/\-][0-1]?\d[\/\-](?:\d{2}|\d{4}))\s*(?:AL|A|-|–|—)\s*([0-3]?\d[\/\-][0-1]?\d[\/\-](?:\d{2}|\d{4}))/i,
];

for (const re of patterns) {
const m = t.match(re);
if (m?.[1] && m?.[2]) return `${m[1].trim()} → ${m[2].trim()}`;
}
return null;
}

function detectReadings(text) {
const t = normalizeText(text);
const candidates = [];

const re1 = /\bLECTURA\s+ANTERIOR\b[^0-9]*([0-9]{1,9}(?:[.,][0-9]{1,3})?)\b[\s\S]{0,120}?\bLECTURA\s+ACTUAL\b[^0-9]*([0-9]{1,9}(?:[.,][0-9]{1,3})?)/i;
const re2 = /\bLECTURA\s+ACTUAL\b[^0-9]*([0-9]{1,9}(?:[.,][0-9]{1,3})?)\b[\s\S]{0,120}?\bLECTURA\s+ANTERIOR\b[^0-9]*([0-9]{1,9}(?:[.,][0-9]{1,3})?)/i;

let m = t.match(re1);
if (m?.[1] && m?.[2]) {
const prev = toNumberFlex(m[1]);
const curr = toNumberFlex(m[2]);
if (prev != null && curr != null) candidates.push({ prev, curr, score: 5 });
}

m = t.match(re2);
if (m?.[1] && m?.[2]) {
const curr = toNumberFlex(m[1]);
const prev = toNumberFlex(m[2]);
if (prev != null && curr != null) candidates.push({ prev, curr, score: 5 });
}

const prevM = t.match(/\bLECTURA\s+ANTERIOR\b[^0-9]*([0-9]{1,9}(?:[.,][0-9]{1,3})?)/i);
const currM = t.match(/\bLECTURA\s+ACTUAL\b[^0-9]*([0-9]{1,9}(?:[.,][0-9]{1,3})?)/i);
if (prevM?.[1] && currM?.[1]) {
const prev = toNumberFlex(prevM[1]);
const curr = toNumberFlex(currM[1]);
if (prev != null && curr != null) candidates.push({ prev, curr, score: 3 });
}

if (!candidates.length) return { prev: null, curr: null };

candidates.sort((a, b) => b.score - a.score);
const best = candidates.find((c) => c.curr >= c.prev) || candidates[0];
return { prev: best.prev, curr: best.curr };
}

function detectKwh(text) {
const t = normalizeText(text);

const lines = t
.split("\n")
.flatMap((ln) => ln.split(/(?<=kWh|KWH|kwh)\s+/))
.map((s) => s.trim())
.filter(Boolean);

const keywords = ["consumo", "energ", "kwh", "kilowatt", "k w h", "consumo total"];
const candidates = [];

function lineScore(ln) {
const low = ln.toLowerCase();
const hasKwh = /k\s*wh/i.test(ln);
const kwScore = keywords.reduce((acc, kw) => acc + (low.includes(kw) ? 1 : 0), 0);
const bonus = (low.includes("consumo") ? 2 : 0) + (hasKwh ? 3 : 0);
return kwScore + bonus;
}

for (const ln of lines) {
const low = ln.toLowerCase();
const hasSignal = /k\s*wh/i.test(ln) || low.includes("consumo") || low.includes("energ");
if (!hasSignal) continue;

const nums = [...ln.matchAll(/(\d{1,6}(?:[.,]\d{1,3})?)/g)].map(m => m[1]);
if (!nums.length) continue;

const parsed = nums
.map((raw) => ({ raw, val: toNumberFlex(raw) }))
.filter((o) => o.val != null);

if (!parsed.length) continue;

parsed.sort((a, b) => {
const aOk = a.val >= 1 && a.val <= 50000;
const bOk = b.val >= 1 && b.val <= 50000;
if (aOk !== bOk) return aOk ? -1 : 1;

const aInt = Number.isInteger(a.val);
const bInt = Number.isInteger(b.val);
if (aInt !== bInt) return aInt ? -1 : 1;

return a.val - b.val; // preferir el más chico razonable
});

candidates.push({ line: ln, nums: parsed, score: lineScore(ln) });
}

if (!candidates.length) {
const around = [...t.matchAll(/(\d{1,6}(?:[.,]\d{1,3})?)\s*(k\s*wh)/gi)];
for (const m of around.slice(0, 25)) {
const val = toNumberFlex(m[1]);
if (val != null) candidates.push({ line: `${m[1]} ${m[2]}`, nums: [{ raw: m[1], val }], score: 2 });
}
}

if (!candidates.length) return { kwh: null, confidence: 0, candidates: [] };

candidates.sort((a, b) => b.score - a.score);
const top = candidates[0];
const kwh = top.nums[0]?.val ?? null;
const confidence = Math.max(0.2, Math.min(0.95, top.score / 10 + (kwh ? 0.2 : 0)));

return { kwh, confidence, candidates: candidates.slice(0, 10).map(c => `• ${c.line}`) };
}

function computeFinalSignals({ textMain, textOcr }) {
const period = detectPeriod(textMain) || detectPeriod(textOcr);
const tariff = detectTariff(textMain) || detectTariff(textOcr);

const readingsMain = detectReadings(textMain);
const readingsOcr = detectReadings(textOcr);
const readings =
(readingsMain.prev != null && readingsMain.curr != null) ? readingsMain :
(readingsOcr.prev != null && readingsOcr.curr != null) ? readingsOcr :
{ prev: null, curr: null };

const kwhMain = detectKwh(textMain);
const kwhOcr = detectKwh(textOcr);

let bestKwhSignal = null;
if (kwhMain.kwh != null) bestKwhSignal = { src: "PDF", ...kwhMain };
if (kwhOcr.kwh != null) {
const better = !bestKwhSignal || (kwhOcr.confidence > bestKwhSignal.confidence);
if (better) bestKwhSignal = { src: "OCR", ...kwhOcr };
}

let diffKwh = null;
if (readings.prev != null && readings.curr != null) {
const diff = readings.curr - readings.prev;
if (Number.isFinite(diff) && diff >= 0) diffKwh = diff;
}

let chosenKwh = null;
let confidence = 0;
let method = "No detectado";
const candidatesLines = [];

if (bestKwhSignal && bestKwhSignal.kwh != null) {
chosenKwh = bestKwhSignal.kwh;
confidence = bestKwhSignal.confidence;
method = `kWh explícito (${bestKwhSignal.src})`;
candidatesLines.push(...bestKwhSignal.candidates);

if (diffKwh != null && chosenKwh > 0) {
const delta = Math.abs(diffKwh - chosenKwh);
if (delta / chosenKwh > 0.12) {
confidence = Math.max(0.25, confidence - 0.25);
candidatesLines.push(`• Nota: diferencia por lecturas sugiere ${diffKwh} kWh`);
}
}
} else if (diffKwh != null) {
chosenKwh = diffKwh;
confidence = 0.55;
method = "Diferencia de lecturas";
candidatesLines.push("• Consumo = Lectura actual − Lectura anterior");
}

return {
kwh: chosenKwh,
confidence,
method,
period: period || null,
tariff: tariff || null,
prevRead: readings.prev,
currRead: readings.curr,
candidatesLines,
};
}

function paintResult(res, textMain, textOcr) {
els.kwhValue.textContent = (res.kwh ?? "—").toString();
els.periodValue.textContent = res.period ?? "—";
els.tariffValue.textContent = res.tariff ?? "—";
els.prevReadValue.textContent = res.prevRead != null ? String(res.prevRead) : "—";
els.currReadValue.textContent = res.currRead != null ? String(res.currRead) : "—";
els.methodValue.textContent = res.method ?? "—";

const pct = Math.round((res.confidence || 0) * 100);
els.confFill.style.width = `${pct}%`;
els.confText.textContent = `${pct || 0}%`;

els.candidatesBox.textContent = res.candidatesLines?.length ? res.candidatesLines.join("\n") : "—";
els.extractedBox.textContent = textMain ? textMain.slice(0, 2500) : "—";
els.ocrBox.textContent = textOcr ? textOcr.slice(0, 2500) : "—";

if (res.kwh == null) setStatus("No detectado (usa OCR o manual)", "warn");
else if (pct >= 70) setStatus("Detectado", "good");
else setStatus("Detectado (revisar)", "warn");
}

async function loadPdf(file) {
setStatus("Leyendo PDF…", "warn");
setProgress(5, "Leyendo archivo…");
const buf = await readFileAsArrayBuffer(file);

setProgress(15, "Abriendo PDF…");
const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

setProgress(25, "Renderizando vista previa…");
await renderFirstPage(pdf);

setProgress(35, "Extrayendo texto…");
const text = await extractAllText(pdf);

setProgress(45, "Texto extraído");
return { pdf, text };
}

function needsOcr(text) {
const t = normalizeText(text);
const letters = (t.match(/[A-ZÁÉÍÓÚÑa-záéíóúñ]/g) || []).length;
return t.length < 250 || letters < 80;
}

async function analyze({ forceOcr = false } = {}) {
if (!currentFile) return;

try {
els.analyzeBtn.disabled = true;
els.ocrBtn.disabled = true;

setStatus("Procesando…", "warn");
const { text } = await loadPdf(currentFile);
extractedText = text;

setProgress(55, "Detectando datos…");
let res = computeFinalSignals({ textMain: extractedText, textOcr: "" });
paintResult(res, extractedText, "");

if (forceOcr || needsOcr(extractedText) || res.kwh == null) {
setStatus("Intentando OCR…", "warn");
setProgress(60, "OCR: iniciando…");

ocrText = normalizeText(await runOcrFromCanvas());

setProgress(95, "Re-evaluando con OCR…");
res = computeFinalSignals({ textMain: extractedText, textOcr: ocrText });
paintResult(res, extractedText, ocrText);
}

setProgress(100, "Listo");
} catch (err) {
console.error(err);
setStatus("Error: PDF protegido/dañado o fallo de OCR", "bad");
setProgress(0, "—");
} finally {
els.analyzeBtn.disabled = false;
els.ocrBtn.disabled = false;
}
}

function bindFile(file) {
currentFile = file;
els.fileMeta.textContent = `${file.name} • ${formatBytes(file.size)}`;
els.analyzeBtn.disabled = false;
els.ocrBtn.disabled = false;
els.clearBtn.disabled = false;
setStatus("Archivo cargado", "good");
setProgress(0, "—");
}

/* ===== UI events (robustos) ===== */

function openPicker() {
// para que elegir el mismo archivo dispare change también
els.pdfInput.value = "";
els.pdfInput.click();
}

els.dropzone.addEventListener("click", openPicker);
els.dropzone.addEventListener("keydown", (e) => {
if (e.key === "Enter" || e.key === " ") {
e.preventDefault();
openPicker();
}
});

els.pdfInput.addEventListener("change", (e) => {
const file = e.target.files && e.target.files[0];
if (!file) {
setStatus("No se seleccionó archivo", "warn");
return;
}
if (!isPdf(file)) {
setStatus("Ese archivo no parece PDF", "bad");
return;
}
bindFile(file);
});

els.dropzone.addEventListener("dragover", (e) => {
e.preventDefault();
els.dropzone.classList.add("dragover");
});
els.dropzone.addEventListener("dragleave", () => els.dropzone.classList.remove("dragover"));
els.dropzone.addEventListener("drop", (e) => {
e.preventDefault();
els.dropzone.classList.remove("dragover");
const file = e.dataTransfer.files && e.dataTransfer.files[0];
if (!file) return;
if (!isPdf(file)) return setStatus("Ese archivo no parece PDF", "bad");
bindFile(file);
});

els.analyzeBtn.addEventListener("click", () => analyze({ forceOcr: false }));
els.ocrBtn.addEventListener("click", () => analyze({ forceOcr: true }));

els.clearBtn.addEventListener("click", () => {
els.pdfInput.value = "";
resetUI();
});

els.applyManualBtn.addEventListener("click", () => {
const val = Number(els.manualKwh.value);
if (!Number.isFinite(val) || val <= 0) return setStatus("Ingresa un kWh válido", "warn");

els.kwhValue.textContent = String(val);
els.confFill.style.width = "100%";
els.confText.textContent = "100%";
els.methodValue.textContent = "Manual";
setStatus("Aplicado manualmente", "good");
});

// init
resetUI();
