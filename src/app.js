import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBLvQY6hYEvIUJnI9Hpzk5cqPILGOlD73Y",
  authDomain: "gsfb-e6c4c.firebaseapp.com",
  projectId: "gsfb-e6c4c",
  storageBucket: "gsfb-e6c4c.firebasestorage.app",
  messagingSenderId: "736778540580",
  appId: "1:736778540580:web:3cca2903c3a7861031eab1"
};

const CLOUDINARY_CLOUD_NAME    = "di3maaqag";
const CLOUDINARY_UPLOAD_PRESET = "gsbf_unsigned";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── AUTH ──────────────────────────────────────────────────────────────────────
window.doLogin = async function() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl    = document.getElementById("login-error");
  const btn      = document.getElementById("login-btn");

  if (!email || !password) { showError("E-posta ve şifre giriniz."); return; }

  btn.disabled = true;
  btn.textContent = "Giriş yapılıyor...";
  errEl.style.display = "none";

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    const msgs = {
      "auth/user-not-found":  "Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.",
      "auth/wrong-password":  "Şifre hatalı.",
      "auth/invalid-email":   "Geçersiz e-posta adresi.",
      "auth/too-many-requests": "Çok fazla deneme. Lütfen bekleyiniz.",
      "auth/invalid-credential": "E-posta veya şifre hatalı."
    };
    showError(msgs[e.code] || "Giriş başarısız: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Giriş Yap";
  }
};

function showError(msg) {
  const el = document.getElementById("login-error");
  el.textContent = msg;
  el.style.display = "block";
}

window.doLogout = () => signOut(auth);

onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById("page-login").classList.remove("active");
    document.getElementById("page-app").style.display = "flex";
    const initials = user.email.slice(0, 2).toUpperCase();
    document.getElementById("user-initials").textContent = initials;
    document.getElementById("user-email-display").textContent = user.email;
  } else {
    document.getElementById("page-login").classList.add("active");
    document.getElementById("page-app").style.display = "none";
  }
});

// ── NAV ───────────────────────────────────────────────────────────────────────
document.querySelectorAll(".nav-item").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const page = link.dataset.page;
    document.querySelectorAll(".nav-item").forEach(l => l.classList.remove("active"));
    link.classList.add("active");
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById("view-" + page).classList.add("active");
    if (page === "kayitlar") loadRecords();
  });
});

// ── CLOUDINARY ────────────────────────────────────────────────────────────────
async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  fd.append("folder", "gsbf-temizlik");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Görsel yükleme hatası");
  return (await res.json()).secure_url;
}

// ── FILES ─────────────────────────────────────────────────────────────────────
window.selectedFiles = [];

window.handleFiles = function(input) {
  window.selectedFiles = Array.from(input.files).slice(0, 5);
  const preview = document.getElementById("file-preview");
  preview.innerHTML = "";
  window.selectedFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.className = "file-thumb";
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
};

// ── FORM ──────────────────────────────────────────────────────────────────────
window.clearForm = function() {
  document.getElementById("f-personel").value = "";
  document.getElementById("f-alan").value = "";
  document.querySelectorAll('input[name="kontrol_turu"]')[0].checked = true;
  document.querySelectorAll('input[name="alan_durumu"]')[0].checked = true;
  document.querySelectorAll('input[name="kontrol_eden"]')[0].checked = true;
  document.getElementById("f-gorsel").value = "";
  document.getElementById("file-preview").innerHTML = "";
  window.selectedFiles = [];
};

window.submitForm = async function() {
  const personel    = document.getElementById("f-personel").value;
  const alan        = document.getElementById("f-alan").value;
  const kontrolTuru = document.querySelector('input[name="kontrol_turu"]:checked')?.value || "";
  const alanDurumu  = document.querySelector('input[name="alan_durumu"]:checked')?.value;
  const kontrolEden = document.querySelector('input[name="kontrol_eden"]:checked')?.value;

  if (!personel)    return alert("Sorumlu personel seçiniz.");
  if (!alan)        return alert("Kontrol edilen alanı seçiniz.");
  if (!alanDurumu)  return alert("Alan durumu seçiniz.");
  if (!kontrolEden) return alert("Kontrol eden kişiyi seçiniz.");
  if (!window.selectedFiles.length) return alert("En az bir görsel yükleyiniz.");

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.textContent = "Gönderiliyor...";

  try {
    const imageUrls = [];
    for (const file of window.selectedFiles) {
      imageUrls.push(await uploadToCloudinary(file));
    }
    await addDoc(collection(db, "kontroller"), {
      personel, alan, kontrolTuru, alanDurumu, kontrolEden, imageUrls,
      kullanici: auth.currentUser?.email || "",
      tarih: serverTimestamp()
    });
    showToast("Form başarıyla gönderildi");
    clearForm();
  } catch (e) {
    alert("Hata: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Formu Gönder";
  }
};

// ── RECORDS ───────────────────────────────────────────────────────────────────
let allRecords = [];

async function loadRecords() {
  const list = document.getElementById("records-list");
  list.innerHTML = '<div class="empty-state">Yükleniyor...</div>';
  try {
    const snap = await getDocs(query(collection(db, "kontroller"), orderBy("tarih", "desc")));
    allRecords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderRecords(allRecords);
  } catch (e) {
    list.innerHTML = `<div class="empty-state">Hata: ${e.message}</div>`;
  }
}

function renderRecords(records) {
  const list = document.getElementById("records-list");
  if (!records.length) { list.innerHTML = '<div class="empty-state">Kayıt bulunamadı</div>'; return; }
  list.innerHTML = records.map(r => {
    const tarih = r.tarih?.toDate ? r.tarih.toDate().toLocaleString("tr-TR") : "—";
    const badgeClass = r.alanDurumu === "UYGUN" ? "badge-uygun" : "badge-eksik";
    const imgs = (r.imageUrls || []).map(url =>
      `<img src="${url}" class="record-img" onclick="window.open('${url}','_blank')">`
    ).join("");
    return `<div class="record-card">
      <div class="record-top">
        <span class="record-alan">${r.alan || "—"}</span>
        <span class="record-date">${tarih}</span>
      </div>
      <div class="record-meta">
        <span class="record-field">Personel: <strong>${r.personel || "—"}</strong></span>
        <span class="record-field">Kontrol Eden: <strong>${r.kontrolEden || "—"}</strong></span>
        <span class="record-field">Tür: ${r.kontrolTuru || "—"}</span>
        <span class="badge ${badgeClass}">${r.alanDurumu || "—"}</span>
      </div>
      ${imgs ? `<div class="record-imgs">${imgs}</div>` : ""}
    </div>`;
  }).join("");
}

window.filterRecords = function() {
  const q = document.getElementById("search-input").value.toLowerCase();
  const d = document.getElementById("filter-durum").value;
  renderRecords(allRecords.filter(r =>
    (!q || (r.alan||"").toLowerCase().includes(q) || (r.personel||"").toLowerCase().includes(q) || (r.kontrolEden||"").toLowerCase().includes(q)) &&
    (!d || r.alanDurumu === d)
  ));
};

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}
