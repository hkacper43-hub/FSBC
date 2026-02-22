const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');

const app = express();
const PORT = process.env.PORT || 3000;

// --- POŁĄCZENIE Z MONGODB ---
// Wklej tutaj swój link z MongoDB Atlas w cudzysłowie
const MONGO_URI = process.env.MONGO_URI; 

mongoose.connect(MONGO_URI)
    .then(() => console.log('Połączono z MongoDB!'))
    .catch(err => console.error('Błąd MongoDB:', err));

// Model strefy w bazie danych
const Zone = mongoose.model('Zone', new mongoose.Schema({
    data: Array // Przechowujemy całą listę stref jako jeden dokument dla ułatwienia
}));

// --- DANE KONFIGURACYJNE ---
const CLIENT_ID = '1459649925485957266'; 
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = 'https://fsbc.onrender.com/auth/discord/callback';

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ['identify']
}, (accessToken, refreshToken, profile, done) => {
    profile.isAdmin = (profile.username === 'bliziog');
    return done(null, profile);
}));

app.use(express.json());

// --- NAPRAWIONE SESJE (Zapisują się w MongoDB, nie w RAMie) ---
app.use(session({
    secret: 'fsbc-secret-key-123',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 * 7 } // Sesja na 7 dni
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname)));

// --- OBSŁUGA LOGOWANIA ---
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/'));
app.get('/api/user', (req, res) => res.json(req.user || null));

// --- API DLA MAPY (ZAPIS DO MONGODB) ---
app.get('/api/zones', async (req, res) => {
    const doc = await Zone.findOne();
    res.json(doc ? doc.data : []);
});

app.post('/api/zones', async (req, res) => {
    // Usuwamy stare i zapisujemy nowe do bazy MongoDB
    await Zone.deleteMany({});
    const newZones = new Zone({ data: req.body });
    await newZones.save();
    res.json({ status: 'ok' });
});

app.listen(PORT, () => console.log(`Serwer wystartował na porcie ${PORT}`));
