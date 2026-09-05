const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Permet de servir les fichiers statiques directement depuis le dossier principal
app.use(express.static(__dirname));

// Stockage temporaire en mémoire des utilisateurs en attente de validation
const pendingUsers = new Map();

// --- CONFIGURATION NODEMAILER (Optionnel pour l'envoi d'e-mails) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'votre-email@gmail.com',         
        pass: 'votre-mot-de-passe-d-application' 
    }
});


// --- ROUTES POUR AFFICHER LES PAGES HTML ---

// Route pour la page d'inscription (Accueil)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route pour la page de vérification
app.get('/verify.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'verify.html'));
});


// --- ROUTES POUR TRAITER LES ACTIONS (API) ---

app.post('/register-action', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }

    try {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        pendingUsers.set(email, {
            name,
            email,
            password,
            code: verificationCode,
            createdAt: Date.now()
        });

        console.log(`[DEV] Code envoyé à ${email} -> ${verificationCode}`);

        return res.status(200).json({ 
            success: true, 
            message: 'Code envoyé avec succès.' 
        });

    } catch (error) {
        console.error('Erreur inscription :', error);
        return res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
});

app.post('/verify-code', (req, res) => {
    const { email, code } = req.body;

    const userData = pendingUsers.get(email);

    if (!userData) {
        return res.status(400).json({ error: "Session expirée ou e-mail introuvable." });
    }

    if (userData.code === code) {
        console.log(`Utilisateur ${userData.name} (${email}) vérifié avec succès !`);
        pendingUsers.delete(email);

        return res.status(200).json({ 
            success: true, 
            message: 'Compte vérifié avec succès ! Bienvenue sur Vibe.' 
        });
    } else {
        return res.status(400).json({ error: 'Code de vérification incorrect.' });
    }
});


// --- LANCEMENT DU SERVEUR ---
app.listen(PORT, () => {
    console.log(`Serveur démarré et actif sur le port ${PORT}`);
});
