const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

app.use(bodyParser.json());
app.use(express.static(__dirname));

// POŁĄCZENIE Z BAZĄ
if (MONGO_URI && (MONGO_URI.startsWith('mongodb://') || MONGO_URI.startsWith('mongodb+srv://'))) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ Połączono z MongoDB'))
        .catch(err => console.error('❌ BŁĄD POŁĄCZENIA:', err));
} else {
    console.error('❌ KRYTYCZNY BŁĄD: Brak MONGO_URI w Environment Variables na Render!');
}

const Zone = mongoose.model('Zone', new mongoose.Schema({
    id: Number, map: String, p1: Object, p2: Object, owners: Array
}));

// API: Pobieranie stref
app.get('/api/zones', async (req, res) => {
    try { 
        const zones = await Zone.find({});
        res.json(zones); 
    } catch (err) { res.status(500).send(err); }
});

// API: Zapisywanie stref
app.post('/api/zones', async (req, res) => {
    try {
        await Zone.deleteMany({});
        await Zone.insertMany(req.body);
        res.sendStatus(200);
    } catch (err) { res.status(500).send(err); }
});

// Mock profilu użytkownika (zmień to później na prawdziwe logowanie)
app.get('/api/user', (req, res) => {
    res.json({ id: "1", username: "Admin_Test", avatar: "", isAdmin: true });
});

// GŁÓWNA TRASA - Obsługa index.html
app.get('*', (req, res) => {
    const htmlPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(htmlPath)) {
        res.sendFile(htmlPath);
    } else {
        res.status(404).send(`❌ BŁĄD: Serwer nie widzi pliku index.html w: ${__dirname}`);
    }
});

app.listen(PORT, () => console.log(`🚀 Serwer działa na porcie ${PORT}`));
