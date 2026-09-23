import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
    onAuthStateChanged, GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, getDoc, query, where, doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider


provider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.coursework.me.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.rosters.readonly');

export function buildLogo(svg, scaleFactor = 1) {
  const rectWidth = 340 * scaleFactor;
  const rectHeight = 385 * scaleFactor;
  const rectX = 200 * scaleFactor;
  const rectY = 200 * scaleFactor;

  svg.append("rect")
    .attr("x", rectX)
    .attr("y", rectY)
    .attr("width", rectWidth)
    .attr("height", rectHeight)
    .attr("fill", "white")
    .attr("stroke", "darkgreen")
    .attr("stroke-width", 5 * scaleFactor);

  const arcLeft = d3.arc()
    .innerRadius(rectHeight / 2 - 0.01)
    .outerRadius(rectHeight / 2)
    .startAngle(-Math.PI)
    .endAngle(-2 * Math.PI);

  const arcRight = d3.arc()
    .innerRadius(rectHeight / 2 - 0.01)
    .outerRadius(rectHeight / 2)
    .startAngle(Math.PI)
    .endAngle(2 * Math.PI);

  const arcTop = d3.arc()
    .innerRadius(rectHeight / 2 - 0.01)
    .outerRadius(rectHeight / 2)
    .startAngle(-1.05)
    .endAngle(1.05);

  svg.append("path")
    .attr("d", arcLeft)
    .attr("transform", `translate(${rectX - 200 * scaleFactor}, ${rectY + rectHeight / 2})`)
    .attr("fill", "none")
    .attr("stroke", "darkgreen")
    .attr("stroke-width", 5 * scaleFactor)
    .transition()
    .duration(1500)
    .attr("transform", `translate(${rectX + 25 * scaleFactor}, ${rectY + rectHeight / 2})`);

  svg.append("path")
    .attr("d", arcRight)
    .attr("transform", `translate(${rectX + rectWidth + 200 * scaleFactor}, ${rectY + rectHeight / 2})`)
    .attr("fill", "none")
    .attr("stroke", "darkgreen")
    .attr("stroke-width", 5 * scaleFactor)
    .transition()
    .duration(1500)
    .attr("transform", `translate(${rectX + rectWidth - 25 * scaleFactor}, ${rectY + rectHeight / 2})`);

  svg.append("path")
    .attr("d", arcTop)
    .attr("transform", `translate(${rectX + rectWidth / 2}, ${rectY - 200 * scaleFactor})`)
    .attr("fill", "white")
    .attr("stroke", "darkgreen")
    .attr("stroke-width", 5 * scaleFactor)
    .transition()
    .duration(1500)
    .attr("transform", `translate(${rectX + rectWidth / 2}, ${rectY + rectHeight / 2})`);

    svg.append("rect")
      .attr("x", 130 * scaleFactor)
      .attr("y", 300 * scaleFactor)
      .attr("width", rectWidth / 3)
      .attr("height", rectHeight)
      .attr("fill", "white");

    svg.append("rect")
      .attr("x", 160 * scaleFactor + rectWidth)
      .attr("y", 300 * scaleFactor)
      .attr("width", rectWidth / 3)
      .attr("height", rectHeight)
      .attr("fill", "white");
}

document.addEventListener('DOMContentLoaded', function () {
  if (document.querySelector("#bg-animation")) {
    buildLogo(d3.select("#bg-animation"), 1);
  }

  if (document.querySelector("#logo")) {
    const miniLogo = d3.select("#logo")
      .append("svg")
      .attr("width", 100)
      .attr("height", 100)
      .style("margin-left", "0px")
      .style("vertical-align", "middle");

    buildLogo(miniLogo, 0.1);
  }
});


window.showTab = (tab) => {
  document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(div => div.classList.remove('active'));

  document.querySelector(`.tab[onclick="showTab('${tab}')"]`).classList.add('active');
  document.getElementById(`${tab}-tab`).classList.add('active');
};

window.signUp = () => {
  const email = document.getElementById('email-signup').value;
  const password = document.getElementById('password-signup').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (!email || !password || !confirmPassword) {
    alert("Please fill out all fields.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => alert('Signup successful'))
    .catch(err => alert(err.message));
};



window.login = () => {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!emailInput || !passwordInput) {
    alert("Login form inputs not found.");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      alert("Login successful");

      const redirectURL = localStorage.getItem("redirectAfterLogin");
      if (redirectURL) {
        localStorage.removeItem("redirectAfterLogin");
        window.location.href = redirectURL;
      } else {
        window.location.href = "home/home.html";
      }
    })
    .catch(error => {
      console.error("Firebase Auth Error:", error.code, error.message);
      switch (error.code) {
        case "auth/invalid-email":
          alert("Invalid email format.");
          break;
        case "auth/user-not-found":
          alert("No user found with that email.");
          break;
        case "auth/wrong-password":
          alert("Incorrect password.");
          break;
        case "auth/internal-error":
          alert("An internal error occurred. Please try again.");
          break;
        default:
          alert("Login failed: " + error.message);
      }
    });
};



window.logout = (redirectTo = "index.html") => {
  signOut(auth).then(() => {
    alert('Logged out');
    window.location.href = redirectTo;
  });
};

onAuthStateChanged(auth, async (user) => {
  const currentPage = window.location.pathname.split("/").pop();
  const logoutButton = document.getElementById('logoutButton');

  if (typeof window.authChecked === 'undefined') {
    window.authChecked = true;

    if (!user && currentPage !== "index.html" && currentPage !== "") {
      localStorage.setItem("redirectAfterLogin", window.location.href);
      window.location.href = "index.html";
    }

    if (logoutButton) logoutButton.style.display = user ? 'block' : 'none';
  }

  if (!user) return;

  const emailSpan = document.getElementById("user-email");
  if (emailSpan && user?.email) {
    emailSpan.textContent = user.email;
  }

  try {
    const progress = {};
    const answersRef = collection(db, "student_answers");
    const snapshot = await getDocs(query(answersRef, where("userId", "==", user.uid)));

    snapshot.forEach(doc => {
      const data = doc.data();
      const unit = data.questionId.split("_")[0];
      const difficulty = (data.difficulty || "medium").toLowerCase();
      const correct = data.correct;

      const pointMap = { easy: 1, medium: 2, hard: 3 };
      const basePoints = pointMap[difficulty] || 2;

      if (!progress[unit]) progress[unit] = 0;
      progress[unit] += correct ? basePoints : -1;
    });

    Object.entries(progress).forEach(([unit, points]) => {
      const link = document.querySelector(`a[href="${unit}/"]`);
      if (link) {
        link.textContent += points >= 25 ? ` ✅ (${points} pts)` : ` 🟡 (${points} pts)`;
      }
    });

  } catch (e) {
    console.warn("⚠️ Background read failed:", e);
  }
});

