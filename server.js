const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

const app = express();

// ZMIENNE - POBIERANE Z RENDER (ZAKŁADKA ENVIRONMENT)
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_ID = '1459649925485957266'; // ID musi być w cudzysłowie
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const CALLBACK_URL = 'https://fsbc.onrender.com/auth/discord/callback'; // URL musi być w cudzysłowie

app.use(express.json());
app.use(express.static(__dirname));
app.use(session({ secret: 'fsbc_secret_key', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Konfiguracja Discorda - zadziała tylko jeśli podasz SECRET na Renderze
if (CLIENT_ID && CLIENT_SECRET) {
    passport.use(new DiscordStrategy({
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
        scope: ['identify']
    }, (accessToken, refreshToken, profile, done) => {
        // TUTAJ WPISZ SWOJE PRAWIDŁOWE ID DISCORD ZAMIAST "TWOJE_ID"
        profile.isAdmin = (profile.id === "1444637422385365195"); 
        return done(null, profile);
    }));
}

// BAZA DANYCH
if (MONGO_URI) {
    mongoose.connect(MONGO_URI).then(() => console.log("✅ Baza działa")).catch(err => console.log("❌ Błąd bazy:", err));
}

const Zone = mongoose.model('Zone', new mongoose.Schema({
    id: Number, map: String, p1: Array, p2: Array, owners: Array
}));

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/'));
app.get('/api/user', (req, res) => res.json(req.user || null));

app.get('/api/zones', async (req, res) => {
    const zones = await Zone.find({});
    res.json(zones);
});

app.post('/api/zones', async (req, res) => {
    if (!req.user || !req.user.isAdmin) return res.sendStatus(403);
    await Zone.deleteMany({});
    await Zone.insertMany(req.body);
    res.sendStatus(200);
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serwer ruszył na porcie ${PORT}`));
