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

// Stockage temporaire en mémoire des utilisateurs en attente de validation (par e-mail)
const pendingUsers = new Map();

// --- CONFIGURATION NODEMAILER (Gmail) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'votre-email@gmail.com', // ⚠️ Mettez votre vraie adresse Gmail ici
        pass: 'votre-mot-de-passe-application' // ⚠️ Mettez votre mot de passe d'application Google à 16 caractères
    }
});

// --- ROUTES POUR AFFICHER LES PAGES HTML ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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

        // On stocke l'utilisateur en utilisant son e-mail comme clé
        pendingUsers.set(email, {
            name,
            email,
            password,
            code: verificationCode,
            createdAt: Date.now()
        });

        console.log(`[DEV EMAIL] Code pour ${email} -> ${verificationCode}`);

        // --- ENVOI DE L'E-MAIL DE CONFIRMATION VIA NODEMAILER ---
        const mailOptions = {
            from: '"TMA Network" <votre-email@gmail.com>',
            to: email,
            subject: 'Confirmez votre inscription - TMA Network',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
                    <h2 style="color: #38bdf8;">Bienvenue sur TMA Network, ${name} !</h2>
                    <p>Veuillez confirmer votre compte en entrant le code de validation ci-dessous :</p>
                    <h3 style="color: #4F46E5; font-size: 24px; background: #1e293b; padding: 10px; display: inline-block; border-radius: 8px; letter-spacing: 3px;">${verificationCode}</h3>
                    <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`E-mail de confirmation envoyé avec succès à ${email}`);

        return res.status(200).json({ 
            success: true, 
            message: 'Code généré et envoyé par e-mail avec succès.',
            email: email
        });

    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'e-mail :', error);
        return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'e-mail de confirmation.' });
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
            message: 'Compte vérifié avec succès ! Bienvenue sur TMA Network.' 
        });
    } else {
        return res.status(400).json({ error: 'Code de vérification incorrect.' });
    }
});


// --- LANCEMENT DU SERVEUR ---
app.listen(PORT, () => {
    console.log(`Serveur démarré et actif sur le port ${PORT}`);
});
