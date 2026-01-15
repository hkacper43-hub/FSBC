const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

// --- KONFIGURACJA ŚCIEŻEK I BAZY ---
const PORT = process.env.PORT || 3000;
// Jeśli nie masz zmiennej w Render, wklej link bezpośrednio w miejsce process.env.MONGO_URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://TWOJA_LINKA_Z_ATLAS'; 

app.use(bodyParser.json());
// Serwowanie plików statycznych z głównego folderu
app.use(express.static(path.resolve(__dirname)));

// --- POŁĄCZENIE Z MONGODB ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Połączono z MongoDB'))
    .catch(err => console.error('❌ BŁĄD MONGODB (Sprawdź link!):', err));

// --- MODEL STREFY ---
const zoneSchema = new mongoose.Schema({
    id: Number,
    map: String,
    p1: Object,
    p2: Object,
    owners: Array
});
const Zone = mongoose.model('Zone', zoneSchema);

// --- TRASY (ROUTES) ---

// Główna strona - NAPRAWA BŁĘDU ENOENT
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

// API: Pobieranie stref
app.get('/api/zones', async (req, res) => {
    try {
        const zones = await Zone.find({});
        res.json(zones);
    } catch (err) {
        res.status(500).json({ error: "Błąd bazy" });
    }
});

// API: Zapisywanie stref
app.post('/api/zones', async (req, res) => {
    try {
        await Zone.deleteMany({});
        if (req.body && Array.isArray(req.body)) {
            await Zone.insertMany(req.body);
            res.status(200).send("Zapisano");
        }
    } catch (err) {
        console.error("Błąd zapisu:", err);
        res.status(500).send("Błąd serwera");
    }
});

// Mockup użytkownika (Admin dla testów)
app.get('/api/user', (req, res) => {
    res.json({ id: "123", username: "Administrator", avatar: "", isAdmin: true });
});

app.listen(PORT, () => console.log(`🚀 Serwer śmiga na porcie ${PORT}`));
