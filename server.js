const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const fs = require('fs');

const app = express();

// ZMIENNE ŚRODOWISKOWE - Ustaw je w panelu Render!
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_ID = 1459649925485957266;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = https://fsbc.onrender.com/auth/discord/callback; // np. https://twoja-strona.onrender.com/auth/discord/callback

app.use(express.json());
app.use(express.static(__dirname));
app.use(session({ secret: 'fsbc_secret_key', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// KONFIGURACJA PASSPORT (DISCORD)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ['identify']
}, (accessToken, refreshToken, profile, done) => {
    // Sprawdzamy czy użytkownik jest adminem (możesz tu wpisać swoje ID na stałe)
    profile.isAdmin = (profile.id === "TWOJE_ID_DISCORD"); 
    return done(null, profile);
}));

// POŁĄCZENIE Z BAZĄ
mongoose.connect(MONGO_URI).catch(err => console.log("Błąd bazy:", err));

const Zone = mongoose.model('Zone', new mongoose.Schema({
    id: Number, map: String, p1: Array, p2: Array, owners: Array
}));

// TRASY AUTH
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/'));
app.get('/logout', (req, res) => { req.logout(() => res.redirect('/')); });

// API
app.get('/api/user', (req, res) => {
    res.json(req.user || null);
});

app.get('/api/zones', async (req, res) => {
    const zones = await Zone.find({});
    res.json(zones);
});

app.post('/api/zones', async (req, res) => {
    if (!req.user?.isAdmin) return res.sendStatus(403);
    await Zone.deleteMany({});
    await Zone.insertMany(req.body);
    res.sendStatus(200);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(process.env.PORT || 3000);

