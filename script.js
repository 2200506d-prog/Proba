const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const els={
pdfInput:document.getElementById("pdfInput"),
analyzeBtn:document.getElementById("analyzeBtn"),
totalValue:document.getElementById("totalValue"),
kwhValue:document.getElementById("kwhValue"),
currReadValue:document.getElementById("currReadValue"),
prevReadValue:document.getElementById("prevReadValue"),
periodValue:document.getElementById("periodValue"),
tariffValue:document.getElementById("tariffValue")
};

let chartInstance=null;

els.analyzeBtn.addEventListener("click",async()=>{

const file=els.pdfInput.files[0];
const buffer=await file.arrayBuffer();
const pdf=await pdfjsLib.getDocument({data:buffer}).promise;
const page=await pdf.getPage(1);

const textContent=await page.getTextContent();
const text=textContent.items.map(i=>i.str).join(" ").toUpperCase();

extractData(text);
});

function extractData(text){

const total=text.match(/TOTAL A PAGAR\s*\$?\s*(\d+\.?\d*)/);
els.totalValue.textContent=total?total[1]:"No detectado";

const periodo=text.match(/PERIODO FACTURADO\s*(\d{2}\s[A-Z]{3}\s\d{2})\s*(AL|A)\s*(\d{2}\s[A-Z]{3}\s\d{2})/);
els.periodValue.textContent=periodo?`${periodo[1]} - ${periodo[3]}`:"No detectado";

const tarifa=text.match(/TARIFA\s*0?([0-9A-Z]+)/);
els.tariffValue.textContent=tarifa?tarifa[1]:"No detectado";

const energia=text.match(/ENERG[IÍ]A\s*\(KWH\)\s*(\d+)\s*(\d+)\s*(\d+)/);

if(energia){
els.currReadValue.textContent=energia[1];
els.prevReadValue.textContent=energia[2];
els.kwhValue.textContent=energia[3];
}

const history=text.match(/\b\d{2,4}\b/g)
.map(n=>parseInt(n))
.filter(n=>n<2000&&n>10)
.slice(0,6);

drawChart(history.reverse());
}

function drawChart(data){
if(chartInstance)chartInstance.destroy();
chartInstance=new Chart(document.getElementById("historyChart"),{
type:'bar',
data:{
labels:data.map((_,i)=>`P${i+1}`),
datasets:[{label:'Consumo kWh',data:data}]
}
});
}

