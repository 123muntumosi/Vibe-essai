const express = require('express');
const path = require('path');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

// Remplace par ta vraie clé API Resend (obtenue gratuitement sur resend.com)
const resend = new Resend('re_ta_cle_api_ici'); 

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const pendingUsers = new Map();

// --- ROUTES HTML ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/verify.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'verify.html'));
});

// --- API INSCRIPTION ---
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

        // Envoi de l'e-mail via Resend (fonctionne parfaitement sur Render)
        const { error } = await resend.emails.send({
            from: 'TMA Network <onboarding@resend.dev>',
            to: [email],
            subject: 'Confirmez votre inscription - TMA Network',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
                    <h2 style="color: #38bdf8;">Bienvenue sur TMA Network, ${name} !</h2>
                    <p>Voici votre code de validation :</p>
                    <h3 style="color: #4F46E5; font-size: 24px; background: #1e293b; padding: 10px; display: inline-block; border-radius: 8px; letter-spacing: 3px;">${verificationCode}</h3>
                </div>
            `
        });

        if (error) {
            console.error('Erreur Resend :', error);
            return res.status(500).json({ error: "Erreur lors de l'envoi de l'e-mail." });
        }

        console.log(`E-mail envoyé avec succès à ${email}`);
        return res.status(200).json({ success: true, email: email });

    } catch (err) {
        console.error('Erreur serveur :', err);
        return res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
});

// --- API VÉRIFICATION ---
app.post('/verify-code', (req, res) => {
    const { email, code } = req.body;
    const userData = pendingUsers.get(email);

    if (!userData) {
        return res.status(400).json({ error: "Session expirée ou e-mail introuvable." });
    }

    if (userData.code === code) {
        console.log(`Utilisateur ${userData.name} (${email}) vérifié avec succès !`);
        pendingUsers.delete(email);
        return res.status(200).json({ success: true, message: 'Compte vérifié avec succès ! Bienvenue.' });
    } else {
        return res.status(400).json({ error: 'Code de vérification incorrect.' });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré et actif sur le port ${PORT}`);
});
