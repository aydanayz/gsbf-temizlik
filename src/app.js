import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc, getDoc, query, orderBy, serverTimestamp }
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

// ── STATE ─────────────────────────────────────────────────────────────────────
let personelList = [];
let alanList     = [];
let atamaMap     = {};  // { personelId: [alanId, ...] }

// ── AUTH ──────────────────────────────────────────────────────────────────────
document.getElementById("login-btn").addEventListener("click", doLogin);
document.getElementById("login-password").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });

async function doLogin() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn      = document.getElementById("login-btn");
  const errEl    = document.getElementById("login-error");
  if (!email || !password) { showLoginError("E-posta ve şifre giriniz."); return; }
  btn.disabled = true; btn.textContent = "Giriş yapılıyor..."; errEl.style.display = "none";
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    const msgs = {
      "auth/user-not-found": "Kullanıcı bulunamadı.",
      "auth/wrong-password": "Şifre hatalı.",
      "auth/invalid-email": "Geçersiz e-posta.",
      "auth/too-many-requests": "Çok fazla deneme. Bekleyiniz.",
      "auth/invalid-credential": "E-posta veya şifre hatalı."
    };
    showLoginError(msgs[e.code] || "Giriş başarısız.");
  } finally { btn.disabled = false; btn.textContent = "Giriş Yap"; }
}

function showLoginError(msg) {
  const el = document.getElementById("login-error");
  el.textContent = msg; el.style.display = "block";
}

document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById("page-login").classList.remove("active");
    document.getElementById("page-app").style.display = "flex";
    document.getElementById("user-initials").textContent = user.email.slice(0, 2).toUpperCase();
    document.getElementById("user-email-display").textContent = user.email;
    loadYonetimData();
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

// ── YÖNETİM DATA ──────────────────────────────────────────────────────────────
async function loadYonetimData() {
  try {
    const [pSnap, aSnap, atDoc] = await Promise.all([
      getDocs(collection(db, "personel")),
      getDocs(collection(db, "alanlar")),
      getDoc(doc(db, "ayarlar", "atamalar"))
    ]);
    personelList = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    alanList     = aSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    atamaMap     = atDoc.exists() ? atDoc.data() : {};
    renderYonetim();
    updateFormSelects();
    updateKontrolEdenGroup();
  } catch (e) { console.error(e); }
}

// ── YÖNETİM RENDER ────────────────────────────────────────────────────────────
function renderYonetim() {
  renderPersonelList();
  renderAlanList();
  renderAtamaList();
}

function renderPersonelList() {
  const el = document.getElementById("personel-list");
  if (!personelList.length) { el.innerHTML = '<div class="empty-hint">Henüz personel eklenmedi</div>'; return; }
  el.innerHTML = personelList.map(p => `
    <div class="mgmt-item">
      <span class="mgmt-item-name">${p.ad}</span>
      <button class="btn-del" data-id="${p.id}" data-col="personel">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><line x1="5" y1="5" x2="15" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="15" y1="5" x2="5" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>`).join("");
  el.querySelectorAll(".btn-del").forEach(btn => {
    btn.addEventListener("click", () => deleteItem(btn.dataset.col, btn.dataset.id));
  });
}

function renderAlanList() {
  const el = document.getElementById("alan-list");
  if (!alanList.length) { el.innerHTML = '<div class="empty-hint">Henüz alan eklenmedi</div>'; return; }
  el.innerHTML = alanList.map(a => `
    <div class="mgmt-item">
      <span class="mgmt-item-name">${a.ad}</span>
      <button class="btn-del" data-id="${a.id}" data-col="alanlar">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><line x1="5" y1="5" x2="15" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="15" y1="5" x2="5" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>`).join("");
  el.querySelectorAll(".btn-del").forEach(btn => {
    btn.addEventListener("click", () => deleteItem(btn.dataset.col, btn.dataset.id));
  });
}

function renderAtamaList() {
  const el = document.getElementById("atama-list");
  if (!personelList.length) { el.innerHTML = '<div class="empty-hint">Önce personel ekleyiniz</div>'; return; }
  el.innerHTML = personelList.map(p => {
    const assigned = atamaMap[p.id] || [];
    const alanCheckboxes = alanList.map(a => `
      <label class="atama-check">
        <input type="checkbox" data-personel="${p.id}" data-alan="${a.id}" ${assigned.includes(a.id) ? "checked" : ""}>
        <span>${a.ad}</span>
      </label>`).join("");
    return `
      <div class="atama-row">
        <div class="atama-personel">${p.ad}</div>
        <div class="atama-alanlar">${alanList.length ? alanCheckboxes : '<span class="empty-hint">Alan yok</span>'}</div>
      </div>`;
  }).join("");

  el.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener("change", async () => {
      const pid = cb.dataset.personel;
      const aid = cb.dataset.alan;
      if (!atamaMap[pid]) atamaMap[pid] = [];
      if (cb.checked) {
        if (!atamaMap[pid].includes(aid)) atamaMap[pid].push(aid);
      } else {
        atamaMap[pid] = atamaMap[pid].filter(x => x !== aid);
      }
      await setDoc(doc(db, "ayarlar", "atamalar"), atamaMap);
      updateFormSelects();
    });
  });
}

// ── PERSONEL EKLE / SİL ───────────────────────────────────────────────────────
document.getElementById("btn-personel-ekle").addEventListener("click", async () => {
  const input = document.getElementById("personel-ad");
  const ad = input.value.trim();
  if (!ad) return;
  const ref = await addDoc(collection(db, "personel"), { ad });
  personelList.push({ id: ref.id, ad });
  input.value = "";
  renderYonetim(); updateFormSelects(); updateKontrolEdenGroup();
});

document.getElementById("btn-alan-ekle").addEventListener("click", async () => {
  const input = document.getElementById("alan-ad");
  const ad = input.value.trim();
  if (!ad) return;
  const ref = await addDoc(collection(db, "alanlar"), { ad });
  alanList.push({ id: ref.id, ad });
  input.value = "";
  renderYonetim(); updateFormSelects();
});

document.getElementById("personel-ad").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("btn-personel-ekle").click();
});
document.getElementById("alan-ad").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("btn-alan-ekle").click();
});

async function deleteItem(colName, id) {
  await deleteDoc(doc(db, colName, id));
  if (colName === "personel") {
    personelList = personelList.filter(p => p.id !== id);
    delete atamaMap[id];
    await setDoc(doc(db, "ayarlar", "atamalar"), atamaMap);
    updateKontrolEdenGroup();
  } else {
    alanList = alanList.filter(a => a.id !== id);
    for (const pid in atamaMap) {
      atamaMap[pid] = atamaMap[pid].filter(aid => aid !== id);
    }
    await setDoc(doc(db, "ayarlar", "atamalar"), atamaMap);
  }
  renderYonetim(); updateFormSelects();
}

// ── FORM SELECTS ──────────────────────────────────────────────────────────────
function updateFormSelects() {
  const pSel = document.getElementById("f-personel");
  const pVal = pSel.value;
  pSel.innerHTML = '<option value="">Seçiniz</option>' +
    personelList.map(p => `<option value="${p.id}">${p.ad}</option>`).join("");
  if (pVal) pSel.value = pVal;
  updateAlanSelect();
}

function updateAlanSelect() {
  const pSel  = document.getElementById("f-personel");
  const aSel  = document.getElementById("f-alan");
  const pid   = pSel.value;
  const atananIds = pid ? (atamaMap[pid] || []) : [];
  const atananAlanlar = alanList.filter(a => atananIds.includes(a.id));
  if (!pid) {
    aSel.innerHTML = '<option value="">Önce personel seçiniz</option>';
  } else if (!atananAlanlar.length) {
    aSel.innerHTML = '<option value="">Bu personele alan atanmamış</option>';
  } else {
    aSel.innerHTML = '<option value="">Seçiniz</option>' +
      atananAlanlar.map(a => `<option value="${a.ad}">${a.ad}</option>`).join("");
  }
}

document.getElementById("f-personel").addEventListener("change", updateAlanSelect);

function updateKontrolEdenGroup() {
  const group = document.getElementById("kontrol-eden-group");
  if (!personelList.length) {
    group.innerHTML = '<span class="empty-hint">Yönetim sayfasından personel ekleyiniz</span>';
    return;
  }
  group.innerHTML = personelList.map((p, i) => `
    <label class="radio-item">
      <input type="radio" name="kontrol_eden" value="${p.ad}" ${i === 0 ? "checked" : ""}>
      <span>${p.ad}</span>
    </label>`).join("");
}

// ── CLOUDINARY ────────────────────────────────────────────────────────────────
async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file); fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET); fd.append("folder", "gsbf-temizlik");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Görsel yükleme hatası");
  return (await res.json()).secure_url;
}

// ── FILES ─────────────────────────────────────────────────────────────────────
let selectedFiles = [];

document.getElementById("f-gorsel").addEventListener("change", function() {
  selectedFiles = Array.from(this.files).slice(0, 5);
  const preview = document.getElementById("file-preview");
  preview.innerHTML = "";
  selectedFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement("img");
      img.src = e.target.result; img.className = "file-thumb";
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

// ── FORM ──────────────────────────────────────────────────────────────────────
document.getElementById("btn-clear").addEventListener("click", clearForm);

function clearForm() {
  document.getElementById("f-personel").value = "";
  updateAlanSelect();
  const kt = document.querySelectorAll('input[name="kontrol_turu"]');
  if (kt[0]) kt[0].checked = true;
  const ad = document.querySelectorAll('input[name="alan_durumu"]');
  if (ad[0]) ad[0].checked = true;
  const ke = document.querySelectorAll('input[name="kontrol_eden"]');
  if (ke[0]) ke[0].checked = true;
  document.getElementById("f-gorsel").value = "";
  document.getElementById("file-preview").innerHTML = "";
  selectedFiles = [];
}

document.getElementById("submit-btn").addEventListener("click", async () => {
  const personelId  = document.getElementById("f-personel").value;
  const personelAd  = document.getElementById("f-personel").selectedOptions[0]?.text;
  const alan        = document.getElementById("f-alan").value;
  const kontrolTuru = document.querySelector('input[name="kontrol_turu"]:checked')?.value || "";
  const alanDurumu  = document.querySelector('input[name="alan_durumu"]:checked')?.value;
  const kontrolEden = document.querySelector('input[name="kontrol_eden"]:checked')?.value;

  if (!personelId) return alert("Sorumlu personel seçiniz.");
  if (!alan)       return alert("Kontrol edilen alanı seçiniz.");
  if (!alanDurumu) return alert("Alan durumu seçiniz.");
  if (!kontrolEden) return alert("Kontrol eden kişiyi seçiniz.");
  if (!selectedFiles.length) return alert("En az bir görsel yükleyiniz.");

  const btn = document.getElementById("submit-btn");
  btn.disabled = true; btn.textContent = "Gönderiliyor...";

  try {
    const imageUrls = [];
    for (const file of selectedFiles) imageUrls.push(await uploadToCloudinary(file));
    await addDoc(collection(db, "kontroller"), {
      personel: personelAd, alan, kontrolTuru, alanDurumu, kontrolEden, imageUrls,
      kullanici: auth.currentUser?.email || "",
      tarih: serverTimestamp()
    });
    showToast("Form başarıyla gönderildi");
    clearForm();
  } catch (e) {
    alert("Hata: " + e.message);
  } finally {
    btn.disabled = false; btn.textContent = "Formu Gönder";
  }
});

// ── RECORDS ───────────────────────────────────────────────────────────────────
let allRecords = [];

async function loadRecords() {
  const list = document.getElementById("records-list");
  list.innerHTML = '<div class="empty-state">Yükleniyor...</div>';
  try {
    const snap = await getDocs(query(collection(db, "kontroller"), orderBy("tarih", "desc")));
    allRecords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderRecords(allRecords);
  } catch (e) { list.innerHTML = `<div class="empty-state">Hata: ${e.message}</div>`; }
}

function renderRecords(records) {
  const list = document.getElementById("records-list");
  if (!records.length) { list.innerHTML = '<div class="empty-state">Kayıt bulunamadı</div>'; return; }
  list.innerHTML = records.map(r => {
    const tarih = r.tarih?.toDate ? r.tarih.toDate().toLocaleString("tr-TR") : "—";
    const bc = r.alanDurumu === "UYGUN" ? "badge-uygun" : "badge-eksik";
    const imgs = (r.imageUrls || []).map(url =>
      `<img src="${url}" class="record-img" onclick="window.open('${url}','_blank')">`).join("");
    return `<div class="record-card">
      <div class="record-top"><span class="record-alan">${r.alan || "—"}</span><span class="record-date">${tarih}</span></div>
      <div class="record-meta">
        <span class="record-field">Personel: <strong>${r.personel || "—"}</strong></span>
        <span class="record-field">Kontrol Eden: <strong>${r.kontrolEden || "—"}</strong></span>
        <span class="record-field">Tür: ${r.kontrolTuru || "—"}</span>
        <span class="badge ${bc}">${r.alanDurumu || "—"}</span>
      </div>
      ${imgs ? `<div class="record-imgs">${imgs}</div>` : ""}
    </div>`;
  }).join("");
}

document.getElementById("search-input").addEventListener("input", filterRecords);
document.getElementById("filter-durum").addEventListener("change", filterRecords);

function filterRecords() {
  const q = document.getElementById("search-input").value.toLowerCase();
  const d = document.getElementById("filter-durum").value;
  renderRecords(allRecords.filter(r =>
    (!q || (r.alan||"").toLowerCase().includes(q) || (r.personel||"").toLowerCase().includes(q) || (r.kontrolEden||"").toLowerCase().includes(q)) &&
    (!d || r.alanDurumu === d)
  ));
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

// ── MOBİL MENÜ ───────────────────────────────────────────────────────────────
document.getElementById("mobile-menu-btn").addEventListener("click", () => {
  document.getElementById("mobile-nav").classList.toggle("open");
});

document.getElementById("mobile-logout").addEventListener("click", (e) => {
  e.preventDefault();
  signOut(auth);
});
