require('dotenv').config();
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const path = require('path');
const https = require('https');
const mongoose = require('mongoose');

const app = express();

// --- POŁĄCZENIE Z BAZĄ ---
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("BŁĄD: Brak zmiennej MONGO_URI w ustawieniach Rendera!");
} else {
    mongoose.connect(MONGO_URI)
        .then(() => console.log("SUKCES: Połączono z MongoDB Atlas"))
        .catch(err => console.error("BŁĄD POŁĄCZENIA Z BAZĄ:", err));
}

const Zone = mongoose.model('Zone', {
    id: Number,
    p1: Object,
    p2: Object,
    owners: Array
});

// --- KONFIGURACJA DISCORD ---
const CLIENT_ID = '1459649925485957266';
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = 'https://fsbc.onrender.com/auth/discord/callback';
const MY_GUILD_ID = '1416103818772484271';
const ADMIN_ROLE_ID = '1416117511237271552';

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID, 
    clientSecret: CLIENT_SECRET, 
    callbackURL: CALLBACK_URL,
    scope: ['identify', 'guilds', 'guilds.members.read']
}, (accessToken, refreshToken, profile, done) => {
    const options = {
        hostname: 'discord.com',
        path: `/api/users/@me/guilds/${MY_GUILD_ID}/member`,
        headers: { Authorization: `Bearer ${accessToken}` }
    };
    https.get(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const memberData = JSON.parse(data);
                profile.isAdmin = memberData.roles && memberData.roles.includes(ADMIN_ROLE_ID);
            } catch (e) { profile.isAdmin = false; }
            done(null, profile);
        });
    }).on('error', (err) => {
        console.error("Discord Auth Error:", err);
        done(err, null);
    });
}));

app.use(express.json());
app.use(session({ 
    secret: 'fsbc-super-secret', 
    resave: false, 
    saveUninitialized: false 
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

// --- API ---
app.get('/api/zones', async (req, res) => {
    try {
        const zones = await Zone.find({});
        res.json(zones);
    } catch (err) {
        res.status(500).json([]);
    }
});

app.post('/api/zones', async (req, res) => {
    if (!req.user) return res.status(401).send('Zaloguj się!');
    try {
        await Zone.deleteMany({});
        await Zone.insertMany(req.body);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/'));
app.get('/api/user', (req, res) => res.json(req.user || null));
app.get('/logout', (req, res) => { req.logout(() => res.redirect('/')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer wystartował na porcie ${PORT}`));
