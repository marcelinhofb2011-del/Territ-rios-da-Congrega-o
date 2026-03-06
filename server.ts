import express from "express";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized");
    } catch (e) {
        console.error("Error parsing FIREBASE_SERVICE_ACCOUNT:", e);
    }
} else {
    console.warn("FIREBASE_SERVICE_ACCOUNT not found. Push notifications will not work.");
}

async function startServer() {
    const app = express();
    const PORT = 3000;

    app.use(express.json());

    // API Route to send push notification
    app.post("/api/send-notification", async (req, res) => {
        const { tokens, title, body, data } = req.body;

        if (!admin.apps.length) {
            return res.status(500).json({ error: "Firebase Admin not initialized" });
        }

        if (!tokens || !tokens.length) {
            return res.status(400).json({ error: "No tokens provided" });
        }

        try {
            const message = {
                notification: { title, body },
                data: data || {},
                tokens: tokens
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            res.json({ success: true, response });
        } catch (error) {
            console.error("Error sending notification:", error);
            res.status(500).json({ error: "Failed to send notification" });
        }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        app.use(express.static("dist"));
        app.get("*", (req, res) => {
            res.sendFile("dist/index.html", { root: "." });
        });
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();
