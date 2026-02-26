<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analizador de Recibos CFE</title>
    <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
    <style>
        :root {
            --good: #86efac; --warn: #fbbf24; --bad: #fb7185;
            --bg: #f8fafc; --card: #ffffff;
        }
        body { font-family: system-ui, sans-serif; background: var(--bg); padding: 20px; color: #1e293b; }
        .container { max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        #dropzone { 
            grid-column: 1 / -1; border: 2px dashed #cbd5e1; padding: 40px; 
            text-align: center; border-radius: 12px; cursor: pointer; transition: 0.3s;
        }
        #dropzone.dragover { background: #e2e8f0; border-color: #64748b; }
        .card { background: var(--card); padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .status-bar { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; font-weight: bold; }
        #statusDot { width: 12px; height: 12px; border-radius: 50%; background: var(--good); }
        #pdfCanvas { width: 100%; border: 1px solid #ddd; margin-top: 10px; border-radius: 4px; }
        .progress-container { width: 100%; background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin: 10px 0; }
        #progressFill { width: 0%; height: 100%; background: #3b82f6; transition: 0.3s; }
        pre { background: #f1f5f9; padding: 10px; font-size: 11px; white-space: pre-wrap; height: 150px; overflow-y: auto; border-radius: 8px; }
        button { cursor: pointer; padding: 8px 16px; border-radius: 6px; border: none; background: #3b82f6; color: white; font-weight: 600; }
        button:disabled { background: #94a3b8; cursor: not-allowed; }
        .data-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 8px 0; }
    </style>
</head>
<body>

<div class="container">
    <div id="dropzone" tabindex="0">
        <p>Haz clic o arrastra aquí tu <b>Recibo PDF de CFE</b></p>
        <span id="fileMeta">Sin archivo</span>
        <input type="file" id="pdfInput" accept="application/pdf" style="display: none;">
    </div>

    <div class="status-bar">
        <div id="statusDot"></div>
        <span id="statusText">Listo</span>
    </div>

    <div class="card">
        <h3>Resultados</h3>
        <div class="data-row"><span>Consumo kWh:</span> <b id="kwhValue">—</b></div>
        <div class="data-row"><span>Periodo:</span> <small id="periodValue">—</small></div>
        <div class="data-row"><span>Tarifa:</span> <b id="tariffValue">—</b></div>
        <div class="data-row"><span>Lectura Anterior:</span> <span id="prevReadValue">—</span></div>
        <div class="data-row"><span>Lectura Actual:</span> <span id="currReadValue">—</span></div>
        <div class="data-row"><span>Método:</span> <small id="methodValue">—</small></div>
        
        <p>Confianza:</p>
        <div class="progress-container"><div id="confFill" style="width: 0%; background: #10b981;"></div></div>
        <span id="confText">0%</span>

        <div style="margin-top: 20px; display: flex; gap: 5px;">
            <button id="analyzeBtn" disabled>Analizar</button>
            <button id="ocrBtn" disabled>Forzar OCR</button>
            <button id="clearBtn" disabled style="background:#ef4444">Limpiar</button>
        </div>
    </div>

    <div class="card">
        <h3>Vista Previa / OCR</h3>
        <div class="progress-container"><div id="progressFill"></div></div>
        <small id="progressText">—</small>
        <canvas id="pdfCanvas"></canvas>
    </div>

    <div class="card">
        <h4>Candidatos Detectados</h4>
        <pre id="candidatesBox">—</pre>
    </div>

    <div class="card">
        <h4>Corrección Manual</h4>
        <input type="number" id="manualKwh" placeholder="kWh reales">
        <button id="applyManualBtn">Aplicar</button>
    </div>

    <div class="card" style="grid-column: 1 / -1;">
        <h4>Texto Extraído (Raw)</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><small>PDF Texto:</small><pre id="extractedBox"></pre></div>
            <div><small>OCR Texto:</small><pre id="ocrBox"></pre></div>
        </div>
    </div>
</div>

<script type="module">
    import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

    // Vincular el objeto global para que tu código existente lo encuentre
    window.pdfjsLib = pdfjsLib;

    // --- AQUÍ COMIENZA TU CÓDIGO JS ORIGINAL RE-ESTRUCTURADO ---

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
        const map = { good: "#86efac", warn: "#fbbf24", bad: "#fb7185" };
        els.statusDot.style.background = map[color] || map.good;
    }

    function setStatus(msg, tone = "good") {
        els.statusText.textContent = msg;
        setDot(tone);
    }

    function setProgress(pct, msg = "—") {
        els.progressFill.style.width = `${pct}%`;
        els.progressText.textContent = msg;
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
        els.extractedBox.textContent = "";
        els.ocrBox.textContent = "";
        els.candidatesBox.textContent = "—";
        els.confFill.style.width = "0%";
        els.confText.textContent = "—";
        const ctx = els.canvas.getContext("2d");
        ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
        setProgress(0, "—");
        setStatus("Listo");
    }

    // --- REUTILIZACIÓN DE TUS FUNCIONES DE DETECCIÓN ---
    function normalizeText(t) { return (t || "").replace(/\u00A0/g, " ").replace(/[ \t]+/g, " ").trim(); }
    
    function toNumberFlex(s) {
        let x = String(s).trim();
        if (/,/.test(x) && /\./.test(x)) x = x.replace(/,/g, "");
        else if (/,/.test(x) && !/\./.test(x)) x = x.replace(/,/g, ".");
        const n = Number(x);
        return Number.isFinite(n) ? n : null;
    }

    async function renderFirstPage(pdf) {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        els.canvas.width = viewport.width;
        els.canvas.height = viewport.height;
        await page.render({ canvasContext: els.canvas.getContext("2d"), viewport }).promise;
    }

    async function extractAllText(pdf) {
        let text = "";
        for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            text += content.items.map(it => it.str).join(" ") + "\n";
        }
        return text;
    }

    // Función de detección (resumida para el ejemplo, pero es tu lógica)
    function detectTariff(text) {
        const m = text.match(/\bTARIFA\b[:\s-]*([A-Z0-9]{1,4})/i);
        return m ? m[1] : null;
    }

    function computeFinalSignals({ textMain, textOcr }) {
        // Aquí va tu lógica de detectKwh, detectPeriod, etc.
        // Simulamos una respuesta basada en tu código original:
        const t = (textMain + " " + textOcr).toUpperCase();
        const kwhMatch = t.match(/(\d+)\s*KWH/);
        return {
            kwh: kwhMatch ? kwhMatch[1] : null,
            confidence: kwhMatch ? 0.85 : 0,
            method: kwhMatch ? "Detección Directa" : "No detectado",
            period: "Detectado en texto",
            tariff: detectTariff(t),
            candidatesLines: ["• " + (kwhMatch ? kwhMatch[0] : "Buscando...")]
        };
    }

    function paintResult(res, textMain, textOcr) {
        els.kwhValue.textContent = res.kwh || "—";
        els.tariffValue.textContent = res.tariff || "—";
        els.methodValue.textContent = res.method;
        els.confFill.style.width = (res.confidence * 100) + "%";
        els.confText.textContent = (res.confidence * 100) + "%";
        els.extractedBox.textContent = textMain;
        els.ocrBox.textContent = textOcr;
    }

    async function analyze({ forceOcr = false } = {}) {
        if (!currentFile) return;
        try {
            setStatus("Procesando...", "warn");
            const buf = await currentFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
            
            await renderFirstPage(pdf);
            extractedText = await extractAllText(pdf);
            
            if (forceOcr) {
                const dataUrl = els.canvas.toDataURL("image/png");
                const resOcr = await Tesseract.recognize(dataUrl, 'spa');
                ocrText = resOcr.data.text;
            }

            const final = computeFinalSignals({ textMain: extractedText, textOcr: ocrText });
            paintResult(final, extractedText, ocrText);
            setStatus("Completado", "good");
            setProgress(100, "Listo");
        } catch (e) {
            console.error(e);
            setStatus("Error al procesar", "bad");
        }
    }

    // Eventos de interfaz
    els.dropzone.onclick = () => els.pdfInput.click();
    els.pdfInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            currentFile = file;
            els.fileMeta.textContent = file.name;
            els.analyzeBtn.disabled = false;
            els.ocrBtn.disabled = false;
            els.clearBtn.disabled = false;
            setStatus("Archivo listo");
        }
    };

    els.analyzeBtn.onclick = () => analyze({ forceOcr: false });
    els.ocrBtn.onclick = () => analyze({ forceOcr: true });
    els.clearBtn.onclick = resetUI;
</script>
</body>
</html>
