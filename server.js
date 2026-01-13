const express = require('express');const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();

const CLIENT_ID = '1459649925485957266';
const CLIENT_SECRET = process.env.CLIENT_SECRET; 
const CALLBACK_URL = 'https://fsbc.onrender.com/auth/discord/callback';
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
            done(null, profile);
        });
    }).on('error', () => { profile.isAdmin = false; done(null, profile); });
}));

app.use(express.json());
app.use(session({ secret: 'fsbc-multi-v1', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/'));
app.get('/api/user', (req, res) => res.json(req.user || null));
app.get('/logout', (req, res) => { req.logout(() => res.redirect('/')); });

app.get('/api/zones', (req, res) => {
    if (fs.existsSync(ZONES_FILE)) res.json(JSON.parse(fs.readFileSync(ZONES_FILE)));
    else res.json([]);
});

app.post('/api/zones', (req, res) => {
    if (!req.user) return res.status(401).send('Zaloguj się!');
    
    // Zabezpieczenie: jeśli nie admin, sprawdzamy czy tylko dopisuje się do listy
    if (!req.user.isAdmin && fs.existsSync(ZONES_FILE)) {
        const oldZones = JSON.parse(fs.readFileSync(ZONES_FILE));
        if (oldZones.length !== req.body.length) return res.status(403).send('Tylko admin dodaje strefy!');
    }

    fs.writeFileSync(ZONES_FILE, JSON.stringify(req.body, null, 2));
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
