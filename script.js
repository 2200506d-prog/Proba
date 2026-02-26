/* global pdfjsLib, Tesseract */

// Configuración de Worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js";

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

/* ===== UTILIDADES DE UI ===== */

function setDot(color) {
    const map = {
        good: "#22c55e", // Verde
        warn: "#f59e0b", // Ámbar
        bad: "#ef4444",  // Rojo
    };
    els.statusDot.style.background = map[color] || map.good;
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
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function resetUI() {
    currentFile = null;
    extractedText = "";
    ocrText = "";

    els.fileMeta.textContent = "Sin archivo";
    els.analyzeBtn.disabled = true;
    els.ocrBtn.disabled = true;
    els.clearBtn.disabled = true;

    const resets = [els.kwhValue, els.periodValue, els.tariffValue, els.prevReadValue, els.currReadValue, els.methodValue, els.extractedBox, els.ocrBox, els.candidatesBox, els.confText];
    resets.forEach(el => el.textContent = "—");

    els.confFill.style.width = "0%";
    els.manualKwh.value = "";

    const ctx = els.canvas.getContext("2d");
    ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);

    setProgress(0, "—");
    setStatus("Listo");
}

/* ===== PROCESAMIENTO DE ARCHIVOS ===== */

async function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsArrayBuffer(file);
    });
}

function normalizeText(t) {
    return (t || "").replace(/\u00A0/g, " ").replace(/[ \t]+/g, " ").replace(/\r/g, "").trim();
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
        text += content.items.map((it) => it.str).join(" ") + "\n";
    }
    return text;
}

async function runOcrFromCanvas() {
    setStatus("OCR: inicializando…", "warn");
    const dataUrl = els.canvas.toDataURL("image/png");
    const res = await Tesseract.recognize(dataUrl, "spa", {
        logger: (m) => {
            if (m.status === "recognizing text") {
                const pct = Math.round((m.progress || 0) * 100);
                setProgress(pct, `OCR: ${pct}%`);
            }
        },
    });
    return res?.data?.text || "";
}

/* ===== LÓGICA DE DETECCIÓN CFE ===== */

function detectTariff(text) {
    const t = normalizeText(text);
    const m1 = t.match(/\bTARIFA\b[:\s-]*([A-Z0-9]{1,4}(?:\s*[A-Z]{1,3})?)/i);
    if (m1?.[1]) return m1[1].trim();
    if (/\b(DAC)\b/i.test(t)) return "DAC";
    if (/\bDOM[ÉE]STICA\b/i.test(t)) return "DOMÉSTICA";
    return null;
}

function detectPeriod(text) {
    const t = normalizeText(text);
    const patterns = [
        /\bPERIODO\b[^0-9A-Z]*([0-3]?\d[\/\-][0-1]?\d[\/\-](?:\d{2}|\d{4}))\s*(?:AL|A|-|–|—)\s*([0-3]?\d[\/\-][0-1]?\d[\/\-](?:\d{2}|\d{4}))/i,
        /(\d{2}\s+[A-Z]{3}\s+\d{4})\s+A\s+(\d{2}\s+[A-Z]{3}\s+\d{4})/i
    ];
    for (const re of patterns) {
        const m = t.match(re);
        if (m?.[1] && m?.[2]) return `${m[1]} - ${m[2]}`;
    }
    return null;
}

function detectReadings(text) {
    const t = normalizeText(text);
    const prevM = t.match(/LECTURA\s+ANTERIOR\s+([0-9,.]+)/i);
    const currM = t.match(/LECTURA\s+ACTUAL\s+([0-9,.]+)/i);
    return {
        prev: prevM ? toNumberFlex(prevM[1]) : null,
        curr: currM ? toNumberFlex(currM[1]) : null
    };
}

function detectKwh(text) {
    const t = normalizeText(text);
    // Busca el número que esté cerca de la palabra "Total periodo" o "kWh"
    const m = t.match(/(?:TOTAL|CONSUMO)\s+PERIODO\s+([0-9,.]+)/i) || t.match(/([0-9,.]+)\s*kWh/i);
    const val = m ? toNumberFlex(m[1]) : null;
    return { 
        kwh: val, 
        confidence: val ? 0.85 : 0, 
        candidates: val ? [`• Detectado: ${val} kWh`] : [] 
    };
}

function computeFinalSignals({ textMain, textOcr }) {
    const combinedText = textMain + " " + textOcr;
    const period = detectPeriod(combinedText);
    const tariff = detectTariff(combinedText);
    const readings = detectReadings(combinedText);
    const kwhData = detectKwh(combinedText);

    let finalKwh = kwhData.kwh;
    let method = "Detección Directa";

    if (!finalKwh && readings.prev !== null && readings.curr !== null) {
        finalKwh = readings.curr - readings.prev;
        method = "Cálculo por Lecturas";
    }

    return {
        kwh: finalKwh,
        confidence: finalKwh ? 0.9 : 0.1,
        method: finalKwh ? method : "No detectado",
        period,
        tariff,
        prevRead: readings.prev,
        currRead: readings.curr,
        candidatesLines: kwhData.candidates
    };
}

function paintResult(res, textMain, textOcr) {
    els.kwhValue.textContent = res.kwh ?? "—";
    els.periodValue.textContent = res.period ?? "—";
    els.tariffValue.textContent = res.tariff ?? "—";
    els.prevReadValue.textContent = res.prevRead ?? "—";
    els.currReadValue.textContent = res.currRead ?? "—";
    els.methodValue.textContent = res.method;

    const pct = Math.round(res.confidence * 100);
    els.confFill.style.width = `${pct}%`;
    els.confText.textContent = `${pct}%`;

    els.extractedBox.textContent = textMain.slice(0, 1000);
    els.ocrBox.textContent = textOcr.slice(0, 1000);
}

/* ===== FLUJO PRINCIPAL ===== */

async function analyze({ forceOcr = false } = {}) {
    if (!currentFile) return;
    try {
        els.analyzeBtn.disabled = true;
        setStatus("Analizando...", "warn");
        
        const buf = await readFileAsArrayBuffer(currentFile);
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        
        await renderFirstPage(pdf);
        extractedText = await extractAllText(pdf);

        let ocrResult = "";
        if (forceOcr || extractedText.trim().length < 50) {
            ocrResult = await runOcrFromCanvas();
        }

        const res = computeFinalSignals({ textMain: extractedText, textOcr: ocrResult });
        paintResult(res, extractedText, ocrResult);
        setStatus("Análisis completado", "good");
        setProgress(100, "Listo");

    } catch (err) {
        console.error(err);
        setStatus("Error al procesar", "bad");
    } finally {
        els.analyzeBtn.disabled = false;
    }
}

/* ===== EVENTOS DE UI (CORREGIDOS) ===== */

function bindFile(file) {
    currentFile = file;
    els.fileMeta.textContent = `${file.name} (${formatBytes(file.size)})`;
    els.analyzeBtn.disabled = false;
    els.ocrBtn.disabled = false;
    els.clearBtn.disabled = false;
    setStatus("Archivo listo", "good");
}

// Click en el cuadro para abrir selector
els.dropzone.addEventListener("click", () => els.pdfInput.click());

// Cambio en el input de archivo
els.pdfInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (isPdf(file)) bindFile(file);
    else if (file) setStatus("Error: Solo PDF", "bad");
});

// Arrastrar y soltar
els.dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.dropzone.style.borderColor = "var(--good)";
});

els.dropzone.addEventListener("dragleave", () => {
    els.dropzone.style.borderColor = "";
});

els.dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (isPdf(file)) bindFile(file);
});

els.analyzeBtn.addEventListener("click", () => analyze({ forceOcr: false }));
els.ocrBtn.addEventListener("click", () => analyze({ forceOcr: true }));
els.clearBtn.addEventListener("click", resetUI);

els.applyManualBtn.addEventListener("click", () => {
    const val = els.manualKwh.value;
    if (val) {
        els.kwhValue.textContent = val;
        els.methodValue.textContent = "Manual";
        setStatus("Actualizado manualmente", "good");
    }
});

// Inicio
resetUI();
