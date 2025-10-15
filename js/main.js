const fileInput = document.getElementById("fileInput");
const filtroMes = document.getElementById("filtroMes");
const contenedorResultados = document.getElementById("seccionResultados");
const tablaPromedios = document.getElementById("tablaPromedios");
const graficoCanvas = document.getElementById("grafico");

let datos = [];
let grafico;

fileInput.addEventListener("change", handleFile);
filtroMes.addEventListener("change", () => renderizar(filtroMes.value));

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();

  reader.onload = (evt) => {
    const workbook = XLSX.read(evt.target.result, { type: "binary" });
    const sheet = workbook.Sheets["BBDD Guardia"];
    if (!sheet) {
      alert("⚠️ No se encontró la hoja 'BBDD Guardia'.");
      return;
    }

    datos = XLSX.utils.sheet_to_json(sheet);
    inicializarFiltroMes();
    renderizar("Todos");
    contenedorResultados.classList.remove("d-none");
  };

  reader.readAsBinaryString(file);
}

function inicializarFiltroMes() {
  const meses = [...new Set(datos.map(d => d["Mes"]).filter(m => m !== undefined && m !== ""))].sort((a,b)=>a-b);
  filtroMes.innerHTML = `<option value="Todos">Todos</option>` +
    meses.map(m => `<option value="${m}">${nombreMes(m)}</option>`).join("");
}

function nombreMes(num) {
  const nombres = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return nombres[num-1] || num;
}

function renderizar(mesSeleccionado) {
  const filtrados = mesSeleccionado === "Todos"
    ? datos
    : datos.filter(d => d["Mes"] == mesSeleccionado);

  const registros = filtrados.filter(r => r["SALIDA TARDE"] && r["DIFERENCIA IA DE"]);

  const grupos = { "En horario": [], "Salió Tarde": [] };
  registros.forEach(r => {
    const tipo = r["SALIDA TARDE"].trim();
    const diff = r["DIFERENCIA IA DE"];
    if (grupos[tipo]) {
      const segundos = convertirASegundos(diff);
      grupos[tipo].push(segundos);
    }
  });

  const total = Object.values(grupos).reduce((a,b)=>a+b.length,0);
  const porcentajes = {
    "En horario": total ? ((grupos["En horario"].length / total) * 100).toFixed(0) : 0,
    "Salió Tarde": total ? ((grupos["Salió Tarde"].length / total) * 100).toFixed(0) : 0
  };

  const promedios = {
    "En horario": segundosAHora(promedio(grupos["En horario"])),
    "Salió Tarde": segundosAHora(promedio(grupos["Salió Tarde"]))
  };

  tablaPromedios.innerHTML = `
    <tr><td>En horario (&lt;20 MIN)</td><td>${promedios["En horario"]}</td></tr>
    <tr><td>Salió Tarde</td><td>${promedios["Salió Tarde"]}</td></tr>
  `;

  dibujarGrafico(porcentajes, mesSeleccionado);
}

function convertirASegundos(horaStr) {
  const partes = horaStr.toString().split(":").map(Number);
  return partes[0]*3600 + (partes[1]||0)*60 + (partes[2]||0);
}

function promedio(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}

function segundosAHora(seg) {
  if (!seg) return "-";
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = Math.floor(seg % 60);
  return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

function dibujarGrafico(porcentajes, mesSeleccionado) {
  const ctx = graficoCanvas.getContext("2d");
  if (grafico) grafico.destroy();

  grafico = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["En horario", "Salió Tarde"],
      datasets: [{
        label: `% de móviles (${mesSeleccionado})`,
        data: [porcentajes["En horario"], porcentajes["Salió Tarde"]],
        backgroundColor: ["#007bff", "#dc3545"],
        borderWidth: 0
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "SALIDA DE MÓVILES",
          color: "#fff",
          font: { size: 20, weight: "bold" }
        },
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          ticks: { color: "#fff", font: { size: 14 } },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#ccc", callback: v => v + "%" },
          grid: { color: "rgba(255,255,255,0.1)" }
        }
      },
      animation: { duration: 1000 },
      layout: { padding: 10 }
    },
    plugins: [{
      id: 'labels',
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((bar, index) => {
            const value = dataset.data[index];
            ctx.fillStyle = "#fff";
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`${value}%`, bar.x, bar.y - 10);
          });
        });
      }
    }]
  });
}
