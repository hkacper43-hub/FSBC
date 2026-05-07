# 📍 FSBC - System Taktyczny Map

Zaawansowany system interaktywnych map dla turnieju Solo Blitz Royale z obsługą Discord logowania.

---

## 📁 Struktura Projektu

```
FSBC/
├── index.html          # 🌐 Struktura HTML (Frontend - HTML)
├── styles.css          # 🎨 Style CSS (Frontend - Design)
├── script.js           # ⚙️ Logika JavaScript (Frontend - Funkcjonalność)
├── server.js           # 🖥️ Backend Node.js/Express (Backend - API)
├── package.json        # 📦 Dependencje projektowe
└── README.md           # 📖 Ten plik - dokumentacja
```

---

## 🗂️ Opis Plików

### **Frontend (Strona użytkownika)**

#### **1. `index.html`** 🌐
- **Język:** HTML
- **Zadanie:** Struktura strony i Layout
- **Zawiera:**
  - Nagłówek nawigacyjny
  - Sekcja hero (strona główna)
  - Widok mapy z sidebarami
  - Turnieje i statystyki
  - Informacje i zasady
- **Linki:** Odwołuje się do `styles.css` i `script.js`

#### **2. `styles.css`** 🎨
- **Język:** CSS
- **Zadanie:** Całe oprawy wizualne i design
- **Zawiera:**
  - Zmienne kolorów (root colors)
  - Layout i grid
  - Komponenty (karty, przyciski, itp.)
  - Animacje i efekty hover
  - Media queries
  - Style dla:
    - Nagłówka i nawigacji
    - Sekcji hero
    - Mapy i kontrolek
    - Kart informacyjnych
    - Sidebaru z graczami

#### **3. `script.js`** ⚙️
- **Język:** JavaScript (Frontend)
- **Zadanie:** Logika interaktywna strony
- **Zawiera:**
  - Inicjalizacja Leaflet mapy
  - Ładowanie i rysowanie stref
  - Obsługa kliknięć na strefy
  - Zarządzanie graczami
  - Przełączanie widoków
  - Autentykacja użytkownika (frontend part)
  - Cooldown dla zmian strefy
  - Tryb rysowania stref dla admina

---

### **Backend (Serwer)**

#### **4. `server.js`** 🖥️
- **Język:** Node.js (JavaScript na serwerze)
- **Framework:** Express
- **Zadanie:** API backend i zarządzanie danymi
- **Zawiera:**
  - Konfiguracja Express serwera
  - Połączenie z MongoDB
  - Passport.js - autentykacja Discord
  - Sesje użytkownika
  - API Endpoints:
    - `GET /api/user` - Dane zalogowanego użytkownika
    - `GET /api/zones` - Pobierz wszystkie strefy
    - `POST /api/zones` - Zapisz strefy (admin only)
  - Middleware do sprawdzania uprawnień admina
  - Serwowanie plików statycznych (HTML, CSS, JS)

#### **5. `package.json`** 📦
- **Język:** JSON
- **Zadanie:** Konfiguracja projektowa
- **Zawiera:**
  - Metadata projektu
  - Lista zależności (dependencies):
    - `express` - Framework webowy
    - `mongoose` - ORM dla MongoDB
    - `passport` - Autentykacja
    - `passport-discord` - Strategia Discord
    - `express-session` - Sesje użytkownika
    - `connect-mongo` - Store sesji w MongoDB
  - Skrypty npm (`npm start`)

---

## 🔄 Przepływ Pracy

### **1. Użytkownik odwiedza stronę**
```
1. Przeglądarka ładuje index.html
   ↓
2. HTML ładuje styles.css (design)
   ↓
3. HTML ładuje script.js (funkcjonalność)
   ↓
4. script.js wysyła żądanie do serwera: GET /api/user
```

### **2. Autentykacja Discord**
```
Użytkownik → Klik "ZALOGUJ SIĘ" → Discord OAuth → server.js → MongoDB sesja
```

### **3. Załadowanie mapy**
```
script.js → GET /api/zones → server.js → MongoDB → JSON strefy → Leaflet rysuje
```

### **4. Zmiana strefy gracza**
```
Kliknięcie na strefę → script.js → POST /api/zones → server.js → MongoDB
```

---

## 🚀 Jak Uruchomić

### **Instalacja**
```bash
npm install
```

### **Uruchomienie**
```bash
npm start
```

Serwer będzie dostępny na: `http://localhost:3000`

---

## 🔑 Zmienne Środowiskowe

Utwórz plik `.env` w głównym katalogu:
```env
PORT=3000
CLIENT_SECRET=your_discord_bot_secret
```

---

## 🗄️ Baza Danych - MongoDB

### **Kolekcja: zones**
Struktura dokumentu:
```javascript
{
  "_id": ObjectId(...),
  "data": [
    {
      "id": 1234567890,
      "map": "venture",
      "p1": [100, 100],
      "p2": [200, 200],
      "owners": [
        {
          "name": "username",
          "avatar": "https://cdn.discordapp.com/avatars/..."
        }
      ]
    }
  ]
}
```

---

## 👤 Uprawnienia

- **Gracz**: Może wybrać strefę (z cooldownem 7 minut)
- **Admin** (username: `bliziog`): 
  - Dodawanie nowych stref (tryb rysowania)
  - Usuwanie stref
  - Czyszczenie całej mapy
  - Brak cooldownu

---

## 📚 Używane Biblioteki

### **Frontend:**
- **Leaflet 1.9.4** - Interaktywne mapy
- **Font Awesome 6.4.0** - Ikony
- **Poppins Font** - Typografia

### **Backend:**
- **Express** - Web framework
- **Mongoose** - MongoDB ORM
- **Passport.js** - Autentykacja
- **Discord OAuth** - Logowanie przez Discord

---

## 💡 Krótkie Porady

- **CSS**: Wszystkie kolory są zmiennymi CSS (`:root`) - łatwo zmienić motyw
- **JS**: Każda funkcja ma komentarze JSDoc
- **Server**: Błędy MongoDB są logowane w konsoli
- **Mapy**: Współrzędne są w systemie prostokątnym (CRS.Simple), nie geograficznym

---

## 📞 Kontakt/Pomoc

Jeśli masz pytania dotyczące struktury projektu - sprawdź komentarze w kodzie!

---

**Ostatnia aktualizacja:** 07.05.2026 ✅
