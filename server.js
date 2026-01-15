const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

const app = express();

// Konfiguracja pobierana z Render Environment Variables
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_ID = '1459649925485957266';
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = 'https://fsbc.onrender.com/auth/discord/callback';

app.use(express.json());
app.use(express.static(__dirname));

// Konfiguracja sesji
app.use(session({
    secret: 'fsbc_system_ultra_secret_777',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' } 
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Strategia Discorda
if (CLIENT_ID && CLIENT_SECRET) {
    passport.use(new DiscordStrategy({
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
        scope: ['identify']
    }, (accessToken, refreshToken, profile, done) => {
        // ID Twojego konta (Admina)
        profile.isAdmin = (profile.id === '1444637422385365195'); 
        return done(null, profile);
    }));
}

// Połączenie z bazą
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ MongoDB Połączone'))
        .catch(err => console.error('❌ Błąd MongoDB:', err.message));
}

const Zone = mongoose.model('Zone', new mongoose.Schema({
    id: Number, map: String, p1: Array, p2: Array, owners: Array
}));

// TRASY AUTORYZACJI
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { 
    failureRedirect: '/',
    successRedirect: '/' 
}));

app.get('/api/user', (req, res) => res.json(req.user || null));

// POBIERANIE STREF
app.get('/api/zones', async (req, res) => {
    try {
        const zones = await Zone.find({});
        res.json(zones);
    } catch (e) { res.status(500).json([]); }
});

// ZAPISYWANIE STREF - POPRAWIONE
app.post('/api/zones', async (req, res) => {
    // 1. Sprawdzamy czy użytkownik jest zalogowany
    if (!req.user) return res.sendStatus(401);

    try {
        const zonesFromClient = req.body;

        if (req.user.isAdmin) {
            // ADMIN: Może zmieniać wszystko (dodawać/usuwać strefy)
            await Zone.deleteMany({});
            if (zonesFromClient.length > 0) {
                await Zone.insertMany(zonesFromClient);
            }
        } else {
            // GRACZ: Może TYLKO aktualizować listę osób (owners) w istniejących strefach
            // Pętla przechodzi przez każdą strefę wysłaną z mapy i aktualizuje owners w bazie
            const updatePromises = zonesFromClient.map(zone => {
                return Zone.updateOne(
                    { id: zone.id },
                    { $set: { owners: zone.owners } }
                );
            });
            await Promise.all(updatePromises);
        }
        
        res.sendStatus(200);
    } catch (e) {
        console.error("Błąd podczas zapisu stref:", e);
        res.status(500).send("Błąd zapisu");
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serwer działa na porcie ${PORT}`));
