// ─── Firebase yapılandırması ─────────────────────────────────────────────────
// Firebase Console'dan aldığın config'i buraya yapıştır:
// https://console.firebase.google.com → Proje Ayarları → Web uygulaması ekle
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
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

// ⚠️  2) CLOUDINARY AYARLARI
// cloudinary.com → ücretsiz kayıt → Dashboard'dan al
// Upload Preset: Settings → Upload → "Add upload preset" → Unsigned → kaydet
const CLOUDINARY_CLOUD_NAME = "di3maaqag";
const CLOUDINARY_UPLOAD_PRESET = "gsbf_unsigned";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─── Cloudinary'e görsel yükle ───────────────────────────────────────────────
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "gsbf-temizlik");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Görsel yükleme hatası: " + res.statusText);
  const data = await res.json();
  return data.secure_url;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
const provider = new GoogleAuthProvider();

document.getElementById("google-login-btn").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert("Giriş başarısız: " + e.message);
  }
});

document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user) {
    document.getElementById("user-info").style.display = "flex";
    document.getElementById("user-photo").src  = user.photoURL || "";
    document.getElementById("user-name").textContent = user.displayName || user.email;
    document.getElementById("form-user-email").textContent = user.email;
    showPage("form");
  } else {
    document.getElementById("user-info").style.display = "none";
    showPage("login");
  }
});

// ─── Sayfa yönetimi ──────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.dataset.page === name);
  });
  if (name === "kayitlar") loadRecords();
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    if (!auth.currentUser) return;
    showPage(link.dataset.page);
  });
});

// ─── Dosya önizleme ──────────────────────────────────────────────────────────
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

// ─── Radio temizle ───────────────────────────────────────────────────────────
window.clearRadio = function(name) {
  document.querySelectorAll(`input[name="${name}"]`).forEach(r => r.checked = false);
};

// ─── Formu temizle ───────────────────────────────────────────────────────────
window.clearForm = function() {
  document.getElementById("f-personel").value = "";
  document.getElementById("f-alan").value = "";
  clearRadio("kontrol_turu");
  clearRadio("alan_durumu");
  clearRadio("kontrol_eden");
  document.getElementById("f-gorsel").value = "";
  document.getElementById("file-preview").innerHTML = "";
  window.selectedFiles = [];
};

// ─── Form gönder ─────────────────────────────────────────────────────────────
window.submitForm = async function() {
  const personel   = document.getElementById("f-personel").value;
  const alan       = document.getElementById("f-alan").value;
  const kontrolTuru = document.querySelector('input[name="kontrol_turu"]:checked')?.value || "";
  const alanDurumu  = document.querySelector('input[name="alan_durumu"]:checked')?.value;
  const kontrolEden = document.querySelector('input[name="kontrol_eden"]:checked')?.value;

  if (!personel)    return alert("Sorumlu personel seçiniz.");
  if (!alan)        return alert("Kontrol edilen alanı seçiniz.");
  if (!alanDurumu)  return alert("Alan durumu seçiniz.");
  if (!kontrolEden) return alert("Kontrol eden kişiyi seçiniz.");
  if (window.selectedFiles.length === 0) return alert("Lütfen en az bir görsel yükleyiniz.");

  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.textContent = "Gönderiliyor...";

  try {
    // Görselleri Cloudinary'e yükle
    const imageUrls = [];
    for (const file of window.selectedFiles) {
      const url = await uploadToCloudinary(file);
      imageUrls.push(url);
    }

    // Firestore'a kaydet
    await addDoc(collection(db, "kontroller"), {
      personel,
      alan,
      kontrolTuru,
      alanDurumu,
      kontrolEden,
      imageUrls,
      kullanici: auth.currentUser?.email || "",
      tarih: serverTimestamp()
    });

    showToast("Form başarıyla gönderildi!");
    clearForm();
  } catch (e) {
    alert("Hata oluştu: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Gönder";
  }
};

// ─── Kayıtları yükle ─────────────────────────────────────────────────────────
let allRecords = [];

async function loadRecords() {
  const list = document.getElementById("records-list");
  list.innerHTML = '<div class="records-empty">Yükleniyor...</div>';
  try {
    const q = query(collection(db, "kontroller"), orderBy("tarih", "desc"));
    const snap = await getDocs(q);
    allRecords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderRecords(allRecords);
  } catch (e) {
    list.innerHTML = '<div class="records-empty">Kayıtlar yüklenemedi: ' + e.message + '</div>';
  }
}

function renderRecords(records) {
  const list = document.getElementById("records-list");
  if (!records.length) {
    list.innerHTML = '<div class="records-empty">Kayıt bulunamadı.</div>';
    return;
  }
  list.innerHTML = records.map(r => {
    const tarih = r.tarih?.toDate
      ? r.tarih.toDate().toLocaleString("tr-TR")
      : "—";
    const badgeClass = r.alanDurumu === "UYGUN" ? "badge-uygun" : "badge-eksik";
    const imgs = (r.imageUrls || []).map(url =>
      `<img src="${url}" class="record-img" onclick="window.open('${url}','_blank')">`
    ).join("");
    return `
      <div class="record-card">
        <div class="record-top">
          <span class="record-alan">${r.alan || "—"}</span>
          <span class="record-date">${tarih}</span>
        </div>
        <div class="record-body">
          <span class="record-field">Personel: <strong>${r.personel || "—"}</strong></span>
          <span class="record-field">Kontrol Eden: <strong>${r.kontrolEden || "—"}</strong></span>
          <span class="record-field">Tür: ${r.kontrolTuru || "—"}</span>
          <span class="badge ${badgeClass}">${r.alanDurumu || "—"}</span>
        </div>
        ${imgs ? `<div class="record-imgs">${imgs}</div>` : ""}
      </div>`;
  }).join("");
}

// ─── Filtrele / Ara ──────────────────────────────────────────────────────────
window.filterRecords = function() {
  const q = document.getElementById("search-input").value.toLowerCase();
  const durum = document.getElementById("filter-durum").value;
  const filtered = allRecords.filter(r => {
    const matchQ = !q ||
      (r.alan || "").toLowerCase().includes(q) ||
      (r.personel || "").toLowerCase().includes(q) ||
      (r.kontrolEden || "").toLowerCase().includes(q);
    const matchD = !durum || r.alanDurumu === durum;
    return matchQ && matchD;
  });
  renderRecords(filtered);
};

// ─── Toast ───────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}
