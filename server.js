const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

// 1. SCHEMAT BAZY DANYCH
const zoneSchema = new mongoose.Schema({
    id: Number,
    map: String,    // Bardzo ważne: identyfikator mapy (starfall/venture)
    p1: Object,     // Współrzędne punktu 1 {lat, lng}
    p2: Object,     // Współrzędne punktu 2 {lat, lng}
    owners: Array   // Lista graczy [{name, avatar}]
});

const Zone = mongoose.model('Zone', zoneSchema);

// 2. POBIERANIE STREF
app.get('/api/zones', async (req, res) => {
    try {
        const zones = await Zone.find({});
        res.json(zones);
    } catch (err) {
        res.status(500).send("Błąd podczas pobierania danych");
    }
});

// 3. ZAPISYWANIE STREF (Nadpisywanie całej bazy)
app.post('/api/zones', async (req, res) => {
    try {
        // Czyścimy starą kolekcję, aby uniknąć duplikatów
        await Zone.deleteMany({});
        
        // Wstawiamy nową listę stref otrzymaną z frontendu
        if (req.body && Array.isArray(req.body)) {
            await Zone.insertMany(req.body);
            res.status(200).send("Zapisano pomyślnie");
        } else {
            res.status(400).send("Nieprawidłowy format danych");
        }
    } catch (err) {
        console.error("Błąd MongoDB:", err);
        res.status(500).send("Błąd serwera podczas zapisu");
    }
});

app.listen(3000, () => console.log('Serwer działa na porcie 3000'));
