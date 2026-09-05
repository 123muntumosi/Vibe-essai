const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Permet de servir les fichiers statiques directement depuis le dossier principal
app.use(express.static(__dirname));

// Stockage temporaire en mémoire des utilisateurs en attente de validation (par numéro de téléphone)
const pendingUsers = new Map();

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
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
        return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }

    try {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // On stocke l'utilisateur en utilisant son numéro de téléphone comme clé
        pendingUsers.set(phone, {
            name,
            phone,
            password,
            code: verificationCode,
            createdAt: Date.now()
        });

        console.log(`[DEV WhatsApp] Code pour ${phone} -> ${verificationCode}`);

        // Ici, si vous connectez une API WhatsApp (comme Twilio ou autre), l'appel d'envoi se ferait ici.
        // Pour l'instant, le serveur génère le code et valide l'inscription.

        return res.status(200).json({ 
            success: true, 
            message: 'Code généré avec succès.',
            code: verificationCode // Renvoyé temporairement pour vos tests si besoin
        });

    } catch (error) {
        console.error('Erreur inscription :', error);
        return res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
});

app.post('/verify-code', (req, res) => {
    const { phone, code } = req.body;

    const userData = pendingUsers.get(phone);

    if (!userData) {
        return res.status(400).json({ error: "Session expirée ou numéro introuvable." });
    }

    if (userData.code === code) {
        console.log(`Utilisateur ${userData.name} (${phone}) vérifié avec succès !`);
        pendingUsers.delete(phone);

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
