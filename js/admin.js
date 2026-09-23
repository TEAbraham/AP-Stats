    // admin.js (Enhanced with: Email, Sortable Columns, CSV Export, Avg Time, D3-based Charts)
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
    import {
      getFirestore, collection, getDoc, getDocs, doc, query, where, orderBy, onSnapshot
    } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
    import {
      getAuth, onAuthStateChanged, signOut
    } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
    import { firebaseConfig } from "./firebase-config.js";
    
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const allowedEmails = ["thomas.e.abraham@gmail.com"];
    
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        localStorage.setItem("redirectAfterLogin", window.location.href);
        window.location.href = "../../index.html";
        return;
      }
    
      document.getElementById("user-email").textContent = `${user.email}`;
      document.getElementById("logoutButton").style.display = "block";
    
      // 🔐 Get admin claim
      const token = await user.getIdTokenResult();
      const isAdmin = token.claims.admin === true && allowedEmails.includes(user.email);

      if (isAdmin) {
        loadDashboard();       // show full dashboard
        loadStudentSummary();  // show all student summaries
        document.getElementById("tab-summary").appendChild(buttons);
      } else {
        loadOwnSummary(user);  // student can only see their own data
        // Optional: hide chart areas
        document.getElementById("unitChart").style.display = "none";
        document.getElementById("scoreChart").style.display = "none";
      }

    });

async function loadDashboard() {
  const tbody = document.querySelector("#student-summary tbody");
  tbody.innerHTML = "";

  const snapshot = await getDocs(collection(db, "unit_completion"));

  const users = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    const email = data.email || data.userId;
    const unit = data.unit?.toString();

    if (!email || !unit) return;

    if (!users[email]) {
      users[email] = {};
    }

    users[email][unit] = 1;
  });

  Object.entries(users).forEach(([email, unitMap]) => {
    const tr = document.createElement("tr");

    let totalComplete = 0;
    const unitCells = [];
    for (let i = 1; i <= 9; i++) {
      const val = unitMap[`unit${i.toString()}`] ? 1 : 0;
      totalComplete += val;
      unitCells.push(`<td>${val}</td>`);
    }

    tr.innerHTML = `<td>${email}</td>${unitCells.join("")}<td>${totalComplete}</td>`;
    tbody.appendChild(tr);
  });
}

    
async function loadStudentSummary() {
  const tbody = document.querySelector("#student-summary-table tbody");
  tbody.innerHTML = "";

  const snapshot = await getDocs(collection(db, "student_summary"));
  const studentScores = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    const email = data.email || "(unknown)";
    const units = data.units || {};
    const unitCells = [];

    for (let i = 1; i <= 9; i++) {
      const unitKey = `unit${i.toString()}`;
      const unitPoints = units[unitKey]?.points || 0;
      unitCells.push(`<td>${unitPoints}</td>`);
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${email}</td>
      ${unitCells.join("")}
      <td>${data.totalAttempted || 0}</td>
      <td>${data.totalCorrect || 0}</td>
      <td>${data.totalPointsEarned || 0}</td>
      <td>${data.totalPointsPossible || 0}</td>
    `;
    tbody.appendChild(tr);

    studentScores.push({
      label: email,
      value: data.totalPointsEarned || 0,
      attempted: data.totalAttempted || 0,
      possible: data.totalPointsPossible || 0,
      role: email === "thomas.e.abraham@gmail.com" ? "teacher" : "student"
    });
  });

  renderScoreChart(studentScores);
}

async function loadOwnSummary(user) {
  const email = user.email;
  const uid = user.uid;

  // Clear table
  const unitTable = document.querySelector("#student-summary tbody");
  const summaryTable = document.querySelector("#student-summary-table tbody");
  unitTable.innerHTML = "";
  summaryTable.innerHTML = "";

  // Get own student_summary doc
  const summaryDoc = await getDoc(doc(db, "student_summary", uid));
  if (summaryDoc.exists()) {
    const data = summaryDoc.data();
    const unitCells = [];
    for (let i = 1; i <= 9; i++) {
      unitCells.push(`<td>${data[`unit${i}`] || 0}</td>`);
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${email}</td>
      ${unitCells.join("")}
      <td>${data.totalAttempted || 0}</td>
      <td>${data.totalCorrect || 0}</td>
      <td>${data.totalPointsEarned || 0}</td>
      <td>${data.totalPointsPossible || 0}</td>
    `;
    summaryTable.appendChild(tr);
  }

  // Get own unit completions
  const snapshot = await getDocs(query(
    collection(db, "unit_completion"),
    where("userId", "==", uid)
  ));

  const unitMap = {};
  snapshot.forEach(doc => {
    const unit = doc.data().unit?.toString();
    if (/^[1-9]$/.test(unit)) unitMap[unit] = 1;
  });

  const tr = document.createElement("tr");
  const completeCells = [];
  let total = 0;
  for (let i = 1; i <= 9; i++) {
    const val = unitMap[i.toString()] ? 1 : 0;
    completeCells.push(`<td>${val}</td>`);
    total += val;
  }

  tr.innerHTML = `<td>${email}</td>${completeCells.join("")}<td>${total}</td>`;
  unitTable.appendChild(tr);
}


    
    window.exportCSV = function(tableId, filename) {
      const rows = Array.from(document.querySelectorAll(`#${tableId} tr`));
      const csv = rows.map(row => Array.from(row.cells).map(cell => `"${cell.innerText}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    };
    
    function makeTableSortable(tableId) {
      const table = document.getElementById(tableId);
      const headers = table.querySelectorAll("th");
      headers.forEach((header, index) => {
        header.style.cursor = "pointer";
        header.onclick = () => {
          const rows = Array.from(table.querySelector("tbody").rows);
          const asc = header.classList.toggle("asc");
          rows.sort((a, b) => {
            const aText = a.cells[index].innerText;
            const bText = b.cells[index].innerText;
            return asc ? aText.localeCompare(bText, undefined, { numeric: true }) : bText.localeCompare(aText, undefined, { numeric: true });
          });
          rows.forEach(row => table.querySelector("tbody").appendChild(row));
        };
      });
    }


    function renderUnitChart(data) {
      d3.select("#unitChart").html("");
      const width = 600;
      const height = 300;
    
      const svg = d3.select("#unitChart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "auto");
    
      const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("padding", "6px 8px")
        .style("background", "rgba(0,0,0,0.7)")
        .style("color", "#fff")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", 1000);
    
      const units = Object.keys(data);
      const values = Object.values(data);
      const x = d3.scaleBand().domain(units).range([50, width - 20]).padding(0.2);
      const y = d3.scaleLinear().domain([0, d3.max(values)]).range([height - 30, 20]);
    
      svg.selectAll("rect")
        .data(units)
        .enter()
        .append("rect")
        .attr("x", d => x(d))
        .attr("y", d => y(data[d]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - 30 - y(data[d]))
        .attr("fill", "steelblue")
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(200).style("opacity", 0.95);
          tooltip.html(`<strong>${d}</strong><br/>Completions: ${data[d]}`)
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));
    
      svg.append("g")
        .attr("transform", `translate(0,${height - 30})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.5em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-45)");
    
      svg.append("g")
        .attr("transform", `translate(50,0)`)
        .call(d3.axisLeft(y));
    }
    
    function renderScoreChart(data) {
      d3.select("#scoreChart").html("");
      const width = 600;
      const height = 300;
    
      const svg = d3.select("#scoreChart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "auto");
    
      const labels = data.map(d => d.label);
      const values = data.map(d => d.value);
      const x = d3.scaleBand().domain(labels).range([50, width - 20]).padding(0.2);
      const y = d3.scaleLinear().domain([0, d3.max(values)]).range([height - 30, 20]);
    
      const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("padding", "6px 8px")
        .style("background", "rgba(0,0,0,0.7)")
        .style("color", "#fff")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", 1000);
    
      svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d.label))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => Math.max(height - 30 - y(d.value),0))
        .attr("fill", "green")
        .on("mouseover", (event, d) => {
          tooltip.transition().duration(200).style("opacity", 0.95);
          tooltip.html(
            `<strong>${d.label}</strong><br/>Score: ${d.value}<br/>Attempted: ${d.attempted || '?'}<br/>Possible: ${d.possible || '?'}`
          )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.transition().duration(200).style("opacity", 0));
    
      svg.append("g")
        .attr("transform", `translate(0,${height - 30})`)
        .call(d3.axisBottom(x).tickFormat(label => label.length > 10 ? label.slice(0, 10) + '…' : label))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.5em")
        .attr("dy", "0.15em")
        .attr("transform", "rotate(-45)");
    
      svg.append("g")
        .attr("transform", `translate(50,0)`)
        .call(d3.axisLeft(y));
    }
    document.addEventListener("DOMContentLoaded", () => {
      makeTableSortable("student-summary");
      makeTableSortable("student-summary-table");
    
      const buttons = document.createElement("div");
      buttons.innerHTML = `
        <button onclick="exportCSV('student-summary', 'unit_completions.csv')" class="button-1 perspective" style="padding: 10px 20px; font-size: 1em;">Export Unit Completions</button>
        <button onclick="exportCSV('student-summary-table', 'student_summary.csv')" class="button-1 perspective" style="padding: 10px 20px; font-size: 1em;">Export Student Summary</button>
        <div id="unitChart"></div>
        <div id="scoreChart"></div>
      `;
    });