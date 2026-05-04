# GSBF Temizlik Kontrol Formu

Google Forms'un yerini alan web uygulaması.  
**Firebase** (Auth + Firestore) + **Cloudinary** (görsel depolama — ücretsiz, Storage gerekmez).

## Özellikler
- Google ile giriş (Firebase Auth)
- Form gönderimi → Firestore'a kaydedilir
- Görsel yükleme → Cloudinary'e kaydedilir (ücretsiz 25 GB)
- Tüm kayıtları listeleme ve filtreleme

---

## Kurulum (yaklaşık 10 dakika)

### 1. Firebase Projesi Oluştur

1. https://console.firebase.google.com → Proje Ekle
2. Sol menüden:
   - Authentication → Sign-in method → Google → Etkinleştir
   - Firestore Database → Oluştur → Production mode → Bölge: europe-west
3. Proje Genel Bakış → </> → Web uygulaması ekle → config'i kopyala

### 2. Firebase Config'i Yapıştır

src/app.js dosyasını aç, şu kısmı kendi değerlerinle değiştir:

  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

### 3. Cloudinary Hesabı Aç (ücretsiz)

1. https://cloudinary.com → Sign Up Free
2. Dashboard'dan Cloud Name'i kopyala
3. Settings → Upload → Add upload preset
   - Signing Mode: Unsigned seç → preset adını kaydet (örn. gsbf_unsigned)
4. src/app.js içindeki şu satırları doldur:

  const CLOUDINARY_CLOUD_NAME    = "dxyz123abc";
  const CLOUDINARY_UPLOAD_PRESET = "gsbf_unsigned";

### 4. Firestore Kuralını Uygula

Firebase Console → Firestore → Kurallar → şunu yapıştır → Yayınla:

  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /kontroller/{docId} {
        allow read, write: if request.auth != null;
      }
    }
  }

### 5. GitHub'a Yükle

  git init
  git add .
  git commit -m "ilk surum"
  git remote add origin https://github.com/KULLANICI/gsbf-temizlik.git
  git push -u origin main

### 6. GitHub Pages ile Yayınla

Repo → Settings → Pages → Source: main branch → Kaydet
Birkaç dakika sonra: https://KULLANICI.github.io/gsbf-temizlik

---

## Neden Cloudinary?

Firebase Storage yeni projelerde Blaze (ücretli) plan gerektirebilir.
Cloudinary ücretsiz plan: 25 GB depolama + 25 GB/ay bant genişliği.
