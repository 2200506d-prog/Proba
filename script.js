const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const els = {
    dropzone: document.getElementById("dropzone"),
    pdfInput: document.getElementById("pdfInput"),
    fileMeta: document.getElementById("fileMeta"),
    analyzeBtn: document.getElementById("analyzeBtn"),
    clearBtn: document.getElementById("clearBtn"),
    canvas: document.getElementById("pdfCanvas"),
    totalValue: document.getElementById("totalValue"),
    kwhValue: document.getElementById("kwhValue"),
    currReadValue: document.getElementById("currReadValue"),
    prevReadValue: document.getElementById("prevReadValue"),
    periodValue: document.getElementById("periodValue"),
    tariffValue: document.getElementById("tariffValue"),
};

let currentFile = null;
let chartInstance = null;

els.dropzone.addEventListener("click", () => els.pdfInput.click());

els.pdfInput.addEventListener("change", e => {
    currentFile = e.target.files[0];
    if (currentFile) {
        els.fileMeta.innerHTML = `<strong>Archivo:</strong> ${currentFile.name}`;
        els.analyzeBtn.disabled = false;
    }
});

els.analyzeBtn.addEventListener("click", analyzePDF);
els.clearBtn.addEventListener("click", () => location.reload());

async function analyzePDF() {

    const arrayBuffer = await currentFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 2.5 });
    const ctx = els.canvas.getContext("2d");

    els.canvas.height = viewport.height;
    els.canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const result = await Tesseract.recognize(els.canvas, 'spa', {
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.$ '
    });

    const text = result.data.text.toUpperCase().replace(/\s+/g, ' ');

    extractData(text);
}

function extractData(text) {

    // TOTAL A PAGAR
    const totalMatch = text.match(/TOTAL A PAGAR\s*\$?\s*(\d+\.?\d*)/);
    els.totalValue.textContent = totalMatch ? totalMatch[1] : "No detectado";

    // PERIODO
    const periodMatch = text.match(/(\d{2}\s[A-Z]{3}\s\d{2})\s*(AL|A)\s*(\d{2}\s[A-Z]{3}\s\d{2})/);
    els.periodValue.textContent =
        periodMatch ? `${periodMatch[1]} - ${periodMatch[3]}` : "No detectado";

    // TARIFA
    const tarifaMatch = text.match(/TARIFA\s*0?([0-9A-Z]+)/);
    els.tariffValue.textContent = tarifaMatch ? tarifaMatch[1] : "No detectado";

    // LECTURAS
    const numbers = text.match(/\b\d{4,5}\b/g) || [];

    if (numbers.length >= 2) {
        const sorted = numbers.map(n => parseInt(n)).sort((a,b)=>b-a);
        const actual = sorted[0];
        const anterior = sorted[1];

        els.currReadValue.textContent = actual;
        els.prevReadValue.textContent = anterior;
        els.kwhValue.textContent = Math.abs(actual - anterior);
    }

    // HISTORIAL (busca consumos pequeños 2-3 dígitos)
    const history = text.match(/\b\d{2,4}\b/g)
        .map(n => parseInt(n))
        .filter(n => n < 2000 && n > 10)
        .slice(0,6);

    drawChart(history.reverse());
}

function drawChart(data) {

    const ctx = document.getElementById("historyChart");

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map((_,i)=>`Periodo ${i+1}`),
            datasets: [{
                label: 'Consumo kWh',
                data: data
            }]
        }
    });
}

