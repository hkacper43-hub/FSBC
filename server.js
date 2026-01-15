const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

// --- KONFIGURACJA ---
const PORT = 3000;
const MONGO_URI = 'TWOJA_LINKA_Z_MONGODB_ATLAS'; // Wklej tutaj swój link!

// Middlewares
app.use(bodyParser.json());
// Serwowanie plików statycznych (jeśli masz CSS/JS w osobnych plikach)
app.use(express.static(path.join(__dirname, 'public')));

// --- POŁĄCZENIE Z BAZĄ ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Połączono z MongoDB'))
    .catch(err => console.error('❌ Błąd połączenia z MongoDB:', err));

// --- MODEL DANYCH ---
const zoneSchema = new mongoose.Schema({
    id: Number,
    map: String,
    p1: Object,
    p2: Object,
    owners: Array
});
const Zone = mongoose.model('Zone', zoneSchema);

// --- TRASY (ROUTES) ---

// 1. NAPRAWA "CANNOT GET /" - Wyświetla Twój plik HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. API: Pobieranie wszystkich stref
app.get('/api/zones', async (req, res) => {
    try {
        const zones = await Zone.find({});
        res.json(zones);
    } catch (err) {
        res.status(500).json({ error: "Błąd pobierania" });
    }
});

// 3. API: Zapisywanie wszystkich stref (Nadpisywanie bazy)
app.post('/api/zones', async (req, res) => {
    try {
        // Czyścimy starą kolekcję i wstawiamy nową tablicę z frontendu
        await Zone.deleteMany({});
        if (req.body && Array.isArray(req.body)) {
            await Zone.insertMany(req.body);
            res.status(200).send("Zapisano pomyślnie");
        } else {
            res.status(400).send("Błędny format danych");
        }
    } catch (err) {
        console.error("Błąd zapisu:", err);
        res.status(500).send(err);
    }
});

// 4. API: Dane użytkownika (Mockup dla testów - zastąp swoim systemem Discord)
app.get('/api/user', (req, res) => {
    // Tutaj normalnie byłaby logika passport.js / Discord
    // Na potrzeby testu zwracamy admina:
    res.json({
        id: "123456789",
        username: "Tester",
        avatar: "link_do_avatara",
        isAdmin: true
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Serwer śmiga na http://localhost:${PORT}`);
});
