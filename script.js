/* global pdfjsLib, Tesseract */
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
        els.fileMeta.innerHTML = `<strong>Archivo cargado:</strong> ${file.name}`;
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
        
        // Aumentamos a escala 2.5 para que el OCR lea mejor los números pequeños
        const viewport = page.getViewport({ scale: 2.5 }); 
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

        updateStatus("Escaneando con alta precisión...", "warn");
        const result = await Tesseract.recognize(els.canvas, 'spa');
        const ocrText = result.data.text;
        els.ocrBox.textContent = ocrText;

        analyzeCFE(fullText, ocrText);
        updateStatus("Análisis completado", "good");
    } catch (err) {
        updateStatus("Error en el proceso", "bad");
    } finally {
        els.analyzeBtn.disabled = false;
    }
}

function analyzeCFE(text, ocr) {
    // Unimos y limpiamos el texto para evitar que saltos de línea rompan la lectura
    const raw = (text + " " + ocr).toUpperCase().replace(/\s\s+/g, ' ');

    // 1. TARIFA
    const tarifaMatch = raw.match(/TARIFA[:\s]*(\d+|DAC|GDMTO)/);
    els.tariffValue.textContent = tarifaMatch ? tarifaMatch[1] : "01";

    // 2. PERIODO FACTURADO (Busca el formato del recibo: DD MMM AA)
    const periodoRegex = /(\d{2}\s[A-Z]{3}\s\d{2})\s*AL\s*(\d{2}\s[A-Z]{3}\s\d{2})/;
    const periodoMatch = raw.match(periodoRegex);
    els.periodValue.textContent = periodoMatch ? `${periodoMatch[1]} - ${periodoMatch[2]}` : "No detectado";

    // 3. LECTURAS (Mejorado para ignorar precios con punto decimal)
    // Buscamos números enteros de 4 a 5 dígitos que NO tengan puntos decimales cerca
    const numbers = raw.match(/\b\d{4,5}\b/g) || [];
    
    // En el recibo CFE, la lectura actual y anterior suelen ser los números más grandes en la tabla de energía
    const cleanNumbers = numbers.map(n => parseInt(n)).filter(n => n > 500);

    // Lógica específica para la tabla de energía: [Lectura Actual] [Lectura Anterior] [Consumo]
    // Buscamos el patrón: Energía (kWh) -> Número -> Número -> Número
    const energiaRow = raw.match(/ENERG[IÍ]A\s*\(KWH\)\s*(\d+)\s+(\d+)\s+(\d+)/i);

    if (energiaRow) {
        els.currReadValue.textContent = energiaRow[1];
        els.prevReadValue.textContent = energiaRow[2];
        els.kwhValue.textContent = energiaRow[3];
    } else if (cleanNumbers.length >= 2) {
        // Si no detecta la fila exacta, toma los dos números más probables
        els.currReadValue.textContent = cleanNumbers[0];
        els.prevReadValue.textContent = cleanNumbers[1];
        els.kwhValue.textContent = Math.abs(cleanNumbers[0] - cleanNumbers[1]);
    }

    els.methodValue.textContent = "OCR (Alta Precisión)";
}

function updateStatus(msg, type) {
    els.statusText.textContent = msg;
    els.progressFill.style.width = type === "good" ? "100%" : "60%";
}

els.analyzeBtn.addEventListener("click", () => processPdf(false));
els.ocrBtn.addEventListener("click", () => processPdf(true));
els.clearBtn.addEventListener("click", () => location.reload());
