const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

// --- KONFIGURACJA (ZMIEŃ TO!) ---
const MONGO_URI = 'TWOJA_LINKA_Z_MONGODB_ATLAS'; 

app.use(bodyParser.json());

// Łączenie z MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Połączono z MongoDB'))
    .catch(err => console.error('❌ BŁĄD MONGODB:', err));

// Schemat bazy danych
const zoneSchema = new mongoose.Schema({
    id: Number,
    map: String,
    p1: Object,
    p2: Object,
    owners: Array
});
const Zone = mongoose.model('Zone', zoneSchema);

// SERWOWANIE STRONY
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API: POBIERANIE
app.get('/api/zones', async (req, res) => {
    try {
        const zones = await Zone.find({});
        console.log(`📡 Wysłano ${zones.length} stref do przeglądarki.`);
        res.json(zones);
    } catch (err) {
        res.status(500).json([]);
    }
});

// API: ZAPISYWANIE
app.post('/api/zones', async (req, res) => {
    try {
        console.log("📥 Otrzymano dane do zapisu...");
        await Zone.deleteMany({}); // Czyścimy bazę
        await Zone.insertMany(req.body); // Wstawiamy nowe
        console.log("💾 Zapisano pomyślnie w MongoDB!");
        res.sendStatus(200);
    } catch (err) {
        console.error("❌ BŁĄD ZAPISU:", err);
        res.status(500).send(err);
    }
});

// API: USER (Dla testów zawsze admin)
app.get('/api/user', (req, res) => {
    res.json({ id: "123", username: "Admin", avatar: "", isAdmin: true });
});

app.listen(3000, () => console.log('🚀 Serwer: http://localhost:3000'));
