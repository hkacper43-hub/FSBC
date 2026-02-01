const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// --- DANE KONFIGURACYJNE ---
// Pobierz te dane z Discord Developer Portal
const CLIENT_ID = '1459649925485957266'; 
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const CALLBACK_URL = 'https://https://fsbc.onrender.com//auth/discord/callback';

// Baza danych stref zapisywana do pliku, aby nie znikała
let zones = [];
const ZONES_FILE = 'zones.json';
if (fs.existsSync(ZONES_FILE)) {
    zones = JSON.parse(fs.readFileSync(ZONES_FILE));
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ['identify'] // Wymagane dla poprawnej autoryzacji
}, (accessToken, refreshToken, profile, done) => {
    // Dodajemy uprawnienia admina dla konkretnego użytkownika
    profile.isAdmin = (profile.username === 'bliziog');
    return done(null, profile);
}));

app.use(express.json());
app.use(session({
    secret: 'fsbc-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Zmień na true, jeśli używasz HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Serwowanie plików Twojej strony
app.use(express.static(path.join(__dirname)));

// --- OBSŁUGA LOGOWANIA ---
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/');
});

app.get('/api/user', (req, res) => {
    res.json(req.user || null);
});

// --- API DLA MAPY ---
app.get('/api/zones', (req, res) => res.json(zones));

app.post('/api/zones', (req, res) => {
    zones = req.body;
    fs.writeFileSync(ZONES_FILE, JSON.stringify(zones));
    res.json({ status: 'ok' });
});

app.listen(PORT, () => console.log(`Serwer wystartował na porcie ${PORT}`));

