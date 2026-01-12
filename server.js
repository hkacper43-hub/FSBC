const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();

// --- KONFIGURACJA ---
// Na hostingu (np. Render) te dane ustawia się w zakładce "Environment Variables"
const CLIENT_ID = '1459649925485957266';
const CLIENT_SECRET = process.env.CLIENT_SECRET; // Render sam tu wstawi klucz z zakładki Environment
const CALLBACK_URL = 'https://fsbc.onrender.com/auth/discord/callback'; // Zmień na swój adres po publikacji
const MY_GUILD_ID = '1416103818772484271';
const ADMIN_ROLE_ID = '1416117511237271552';

const ZONES_FILE = path.join(__dirname, 'strefy.json');

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
            return done(null, profile);
        });
    }).on('error', (err) => {
        profile.isAdmin = false;
        return done(null, profile);
    });
}));

// Middleware
app.use(express.json());
app.use(session({ 
    secret: 'fsbc-secret-key-super-safe', 
    resave: false, 
    saveUninitialized: false 
}));
app.use(passport.initialize());
app.use(passport.session());

// Serwowanie plików strony
app.use(express.static(path.join(__dirname, 'public')));

// --- TRASY (ROUTES) ---

// Logowanie
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', { 
    failureRedirect: '/' 
}), (req, res) => {
    res.redirect('/');
});

app.get('/api/user', (req, res) => {
    res.json(req.user || null);
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

// Zarządzanie strefami
app.get('/api/zones', (req, res) => {
    if (fs.existsSync(ZONES_FILE)) {
        const data = fs.readFileSync(ZONES_FILE);
        res.json(JSON.parse(data));
    } else {
        res.json([]);
    }
});

app.post('/api/zones', (req, res) => {
    if (req.user && req.user.isAdmin) {
        fs.writeFileSync(ZONES_FILE, JSON.stringify(req.body, null, 2));
        res.sendStatus(200);
    } else {
        res.status(403).send('Brak uprawnień admina');
    }
});

// --- URUCHOMIENIE SERWERA ---
// process.env.PORT pozwoli serwerowi (np. Render) samemu wybrać port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Serwer FSBC działa na porcie: ${PORT}`);
    if (PORT === 3000) {
        console.log(`👉 Lokalny adres: http://localhost:3000`);
    }

});

