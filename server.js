const express = require('express');
const path = require('path');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION TWILIO ---
// Sur Render, vous pourrez stocker ces valeurs dans les "Environment Variables" 
// ou les mettre directement ici pour vos tests.
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'VOTRE_ACCOUNT_SID_TWILIO';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'VOTRE_AUTH_TOKEN_TWILIO';
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+1XXXXXXXXXX'; // Votre numéro Twilio

const client = twilio(accountSid, authToken);

// --- MIDDLEWARES ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Stockage temporaire en mémoire
const pendingUsers = new Map();

// --- ROUTES HTML ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/verify.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'verify.html'));
});

// --- API INSCRIPTION & ENVOI DU SMS ---
app.post('/register-action', async (req, res) => {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
        return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }

    try {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        pendingUsers.set(phone, {
            name,
            phone,
            password,
            code: verificationCode,
            createdAt: Date.now()
        });

        // ENVOI DU VRAI SMS VIA TWILIO
        await client.messages.create({
            body: `Votre code de verification TMA est : ${verificationCode}`,
            from: twilioPhoneNumber,
            to: phone // Numéro au format international (ex: +243...)
        });

        console.log(`[SMS Twilio Envoyé] Code ${verificationCode} envoyé à ${phone}`);

        return res.status(200).json({ 
            success: true, 
            message: 'SMS de vérification envoyé avec succès.' 
        });

    } catch (error) {
        console.error('Erreur Twilio :', error);
        return res.status(500).json({ error: "Erreur lors de l'envoi du SMS. Vérifiez le format du numéro." });
    }
});

// --- API VÉRIFICATION DU CODE ---
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
            message: 'Compte vérifié avec succès ! Bienvenue sur TMA.' 
        });
    } else {
        return res.status(400).json({ error: 'Code de vérification incorrect.' });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré et actif sur le port ${PORT}`);
});
    
