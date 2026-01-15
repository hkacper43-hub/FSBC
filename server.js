const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

const app = express();

// Konfiguracja
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_ID = '1459649925485957266';
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = 'https://fsbc.onrender.com/auth/discord/callback';

app.use(express.json());
app.use(express.static(__dirname));

// KLUCZOWE DLA RENDER: trust proxy
app.set('trust proxy', 1);

app.use(session({
    secret: 'fsbc_secret_key_123',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true, // Render ma HTTPS, więc musi być true
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Konfiguracja strategii z logowaniem błędów
if (CLIENT_ID && CLIENT_SECRET) {
    passport.use(new DiscordStrategy({
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
        scope: ['identify']
    }, (accessToken, refreshToken, profile, done) => {
        // Logika Admina
        profile.isAdmin = (profile.id === '1444637422385365195'); 
        return done(null, profile);
    }));
} else {
    console.error("❌ BŁĄD: Brak CLIENT_ID lub CLIENT_SECRET w Environment Variables!");
}

// Połączenie z MongoDB
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ MongoDB Połączone'))
        .catch(err => console.error('❌ Błąd MongoDB:', err));
}

const Zone = mongoose.model('Zone', new mongoose.Schema({
    id: Number, map: String, p1: Array, p2: Array, owners: Array
}));

// TRASY LOGOWANIA
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', (req, res, next) => {
    passport.authenticate('discord', (err, user, info) => {
        if (err) { 
            console.error("❌ Błąd Passport Auth:", err);
            return res.status(500).send("Błąd autoryzacji: " + err.message); 
        }
        if (!user) { 
            console.error("❌ Brak użytkownika w profilu Discorda");
            return res.redirect('/'); 
        }
        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.redirect('/');
        });
    })(req, res, next);
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

app.get('/api/user', (req, res) => res.json(req.user || null));

app.get('/api/zones', async (req, res) => {
    try {
        const zones = await Zone.find({});
        res.json(zones);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/zones', async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    try {
        const zonesFromClient = req.body;
        if (req.user.isAdmin) {
            await Zone.deleteMany({});
            if (zonesFromClient.length > 0) await Zone.insertMany(zonesFromClient);
        } else {
            const updatePromises = zonesFromClient.map(zone => {
                return Zone.updateOne({ id: zone.id }, { $set: { owners: zone.owners } });
            });
            await Promise.all(updatePromises);
        }
        res.sendStatus(200);
    } catch (e) { res.status(500).send("Błąd zapisu"); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serwer działa na https://fsbc.onrender.com`));
