/**
 * ============================================
 * FSBC - SYSTEM TAKTYCZNY MAP
 * Plik Node.js/Express - Backend serwera
 * ============================================
 */

// ============================================
// IMPORTY BIBLIOTEK
// ============================================
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');

// ============================================
// KONFIGURACJA SERWERA
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// POŁĄCZENIE Z BAZĄ DANYCH MONGODB
// ============================================
// TODO: Wklej tutaj swój link z MongoDB Atlas w cudzysłowie
const MONGO_URI = 'mongodb+srv://hkacper43_db_user:Bimatech1907@cluster0.nsfmsqp.mongodb.net/?retryWrites=true&w=majority'; 

mongoose.connect(MONGO_URI)
    .then(() => console.log('Połączono z MongoDB!'))
    .catch(err => console.error('Błąd MongoDB:', err));

// ============================================
// MODEL BAZY DANYCH - Strefy (Zones)
// ============================================
const Zone = mongoose.model('Zone', new mongoose.Schema({
    data: Array // Przechowujemy całą listę stref jako jeden dokument dla ułatwienia
}));

// ============================================
// KONFIGURACJA DISCORD OAUTH
// ============================================
const CLIENT_ID = '1459649925485957266'; 
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = 'https://fsbc.onrender.com/auth/discord/callback';

// ============================================
// KONFIGURACJA PASSPORT.JS (Autentykacja Discord)
// ============================================
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ['identify']
}, (accessToken, refreshToken, profile, done) => {
    // Określamy czy użytkownik jest adminem
    profile.isAdmin = (profile.username === 'bliziog');
    return done(null, profile);
}));

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json());

// ============================================
// SESJE (PRZECHOWYWANE W MONGODB, NIE W RAM)
// ============================================
app.use(session({
    secret: 'fsbc-secret-key-123',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 * 7 } // Sesja na 7 dni
}));

app.use(passport.initialize());
app.use(passport.session());

// Serwujemy pliki statyczne (HTML, CSS, JS, obrazy itp.)
app.use(express.static(path.join(__dirname)));

// ============================================
// ROUTES - AUTENTYKACJA DISCORD
// ============================================

/**
 * Redirect do Discord login
 */
app.get('/auth/discord', passport.authenticate('discord'));

/**
 * Callback po logowaniu przez Discord
 */
app.get('/auth/discord/callback', 
    passport.authenticate('discord', { failureRedirect: '/' }), 
    (req, res) => res.redirect('/')
);

// ============================================
// API ENDPOINTS
// ============================================

/**
 * GET /api/user - Pobiera dane zalogowanego użytkownika
 */
app.get('/api/user', (req, res) => {
    res.json(req.user || null);
});

// ============================================
// API ENDPOINTS - STREFY (ZONES)
// ============================================

/**
 * GET /api/zones - Pobiera wszystkie strefy z bazy danych
 */
app.get('/api/zones', async (req, res) => {
    const doc = await Zone.findOne();
    res.json(doc ? doc.data : []);
});

/**
 * MIDDLEWARE - Sprawdzanie uprawnień admina
 * Musi być zalogowany i mieć role administratora
 */
function requireAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Brak uprawnień administratora' });
    }
    next();
}

/**
 * POST /api/zones - Zapisuje nowe strefy do bazy danych (tylko admin)
 * Usuwa stare strefy i zapisuje nowe
 */
app.post('/api/zones', requireAdmin, async (req, res) => {
    // Usuwamy stare dokumenty strefy
    await Zone.deleteMany({});
    
    // Tworzymy i zapisujemy nowe strefy
    const newZones = new Zone({ data: req.body });
    await newZones.save();
    
    res.json({ status: 'ok' });
});

// ============================================
// START SERWERA
// ============================================
app.listen(PORT, () => console.log(`Serwer wystartował na porcie ${PORT}`));


