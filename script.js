/* global pdfjsLib, Tesseract */

const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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
    progressFill: document.getElementById("progressFill"),
    statusText: document.getElementById("statusText"),
    canvas: document.getElementById("pdfCanvas"),
    extractedBox: document.getElementById("extractedBox"),
    ocrBox: document.getElementById("ocrBox")
};

let currentFile = null;

els.dropzone.addEventListener("click", () => els.pdfInput.click());
els.pdfInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
        currentFile = file;
        els.fileMeta.innerHTML = `<strong>Archivo:</strong> ${file.name}`;
        els.analyzeBtn.disabled = false;
        els.ocrBtn.disabled = false;
    }
});

async function processPdf(forceOcr) {
    if (!currentFile) return;
    try {
        els.analyzeBtn.disabled = true;
        updateStatus("Procesando documento...", "warn");
        
        const arrayBuffer = await currentFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 }); // Mayor escala para mejor OCR
        const ctx = els.canvas.getContext("2d");
        els.canvas.height = viewport.height;
        els.canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const p = await pdf.getPage(i);
            const content = await p.getTextContent();
            fullText += content.items.map(item => item.str).join(" ") + "\n";
        }
        els.extractedBox.textContent = fullText;

        let ocrText = "";
        if (forceOcr || fullText.trim().length < 50) {
            updateStatus("Escaneando imagen (OCR)...", "warn");
            const result = await Tesseract.recognize(els.canvas, 'spa');
            ocrText = result.data.text;
            els.ocrBox.textContent = ocrText;
        }

        analyzeCFE(fullText, ocrText);
        updateStatus("Análisis completado", "good");
    } catch (err) {
        updateStatus("Error técnico al leer PDF", "bad");
    } finally {
        els.analyzeBtn.disabled = false;
    }
}

function analyzeCFE(text, ocr) {
    // Limpiamos el texto: quitamos espacios extra y pasamos a mayúsculas
    const raw = (text + " " + ocr).toUpperCase().replace(/\s+/g, ' ');

    // 1. EXTRAER TARIFA (Busca "TARIFA:" seguido de algo como 01, DAC, GDMTO)
    const tarifaMatch = raw.match(/TARIFA[:\s]*([A-Z0-9]+)/);
    els.tariffValue.textContent = tarifaMatch ? tarifaMatch[1] : "No detectada";

    // 2. EXTRAER PERIODO (Busca dos fechas separadas por " AL " o " A ")
    const periodoMatch = raw.match(/(\d{2}\s[A-Z]{3}\s\d{4})\s*(?:AL|A)\s*(\d{2}\s[A-Z]{3}\s\d{4})/);
    els.periodValue.textContent = periodoMatch ? `${periodMatch[1]} - ${periodMatch[2]}` : "No detectado";

    // 3. EXTRAER LECTURAS Y CONSUMO (Lógica de Tabla)
    // Buscamos la fila que contiene "Energía (kWh)" o similar
    // Los recibos suelen tener: Lectura actual | Lectura anterior | Total periodo
    const tableRegex = /(?:ENERG[IÍ]A|CONCEPTO).*?(\d{4,})\s+(\d{4,})\s+(\d{1,5})/;
    const tableMatch = raw.match(tableRegex);

    if (tableMatch) {
        els.currReadValue.textContent = tableMatch[1]; // Lectura Actual
        els.prevReadValue.textContent = tableMatch[2]; // Lectura Anterior
        els.kwhValue.textContent = tableMatch[3];      // Consumo Total
    } else {
        // Búsqueda individual si la tabla falla
        const kwhFallback = raw.match(/TOTAL\s+PERIODO\s+(\d+)/) || raw.match(/(\d+)\s*KWH/);
        els.kwhValue.textContent = kwhFallback ? kwhFallback[1] : "No hallado";
        
        const antFallback = raw.match(/LECTURA\s+ANTERIOR\s+(\d+)/);
        els.prevReadValue.textContent = antFallback ? antFallback[1] : "No hallado";
        
        const actFallback = raw.match(/LECTURA\s+ACTUAL\s+(\d+)/);
        els.currReadValue.textContent = actFallback ? actFallback[1] : "No hallado";
    }

    els.methodValue.textContent = ocr ? "OCR (Imagen)" : "Texto Nativo";
}

function updateStatus(msg, type) {
    els.statusText.textContent = msg;
    els.progressFill.style.width = type === "good" ? "100%" : "50%";
    els.progressFill.style.background = type === "bad" ? "red" : "#22c55e";
}

els.analyzeBtn.addEventListener("click", () => processPdf(false));
els.ocrBtn.addEventListener("click", () => processPdf(true));
els.clearBtn.addEventListener("click", () => location.reload());
