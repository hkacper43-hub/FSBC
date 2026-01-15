const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

const app = express();

// Konfiguracja pobierana z Environment Variables na Render
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_ID = '1459649925485957266';
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = 'https://fsbc.onrender.com/auth/discord/callback';

app.use(express.json());
app.use(express.static(__dirname));
app.use(session({ 
    secret: 'fsbc_system_secret_key_2024', 
    resave: false, 
    saveUninitialized: false 
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Bezpieczna konfiguracja strategii Discord
if (CLIENT_ID && CLIENT_SECRET) {
    passport.use(new DiscordStrategy({
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
        scope: ['identify']
    }, (accessToken, refreshToken, profile, done) => {
        // Tu możesz wpisać swoje ID Discorda (np. '123456789'), aby mieć admina
        profile.isAdmin = (profile.id === '1444637422385365195'); 
        return done(null, profile);
    }));
}

// Łączenie z MongoDB z obsługą błędów (naprawa image_8acce5.png)
if (MONGO_URI && MONGO_URI.startsWith('mongodb')) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ Połączono z MongoDB'))
        .catch(err => console.error('❌ Błąd połączenia MongoDB:', err.message));
} else {
    console.error('❌ BŁĄD: MONGO_URI jest puste lub ma zły format!');
}

const Zone = mongoose.model('Zone', new mongoose.Schema({
    id: Number, map: String, p1: Array, p2: Array, owners: Array
}));

// TRASY AUTH
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

// API
app.get('/api/user', (req, res) => {
    res.json(req.user || null);
});

app.get('/api/zones', async (req, res) => {
    try {
        const zones = await Zone.find({});
        res.json(zones);
    } catch (err) {
        res.status(500).json({ error: "Błąd bazy danych" });
    }
});

app.post('/api/zones', async (req, res) => {
    if (!req.user || !req.user.isAdmin) return res.sendStatus(403);
    try {
        await Zone.deleteMany({});
        await Zone.insertMany(req.body);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Serwowanie frontendu (naprawa image_94c56f.png)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serwer aktywny na porcie ${PORT}`));d
