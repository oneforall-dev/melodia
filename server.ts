import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from "vite";
import 'dotenv/config';

console.log('Server restarting... Loading routes with stats.');

import './server/passport'; // Register Passport Strategy
import { initDB } from './server/db';
import chartRoutes from './server/routes/chart';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Database
try {
  initDB();
} catch (err) {
  console.error("Failed to initialize database:", err);
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Trust Proxy
app.set('trust proxy', 1);

// --- Security Middleware ---

// Helmet - Secure HTTP Headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to allow Tailwind CDN and other external assets
  crossOriginEmbedderPolicy: false, // Often breaks external images/iframes
  crossOriginOpenerPolicy: false, // Required for OAuth popups to communicate with opener
  xFrameOptions: false, // Allow embedding in AI Studio iframe
}));

// CORS - Restrict to specific domains
const allowedOrigins = [
  process.env.APP_URL,
  process.env.SHARED_APP_URL,
  'https://ais-dev-zkcrhy2fpqhfyqtavyhydw-19211782405.us-east1.run.app',
  'https://ais-pre-zkcrhy2fpqhfyqtavyhydw-19211782405.us-east1.run.app',
  'http://localhost:3000'
].filter(Boolean) as string[];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Relaxed limit for dev/testing
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body Parsing & Cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Passport Initialization
app.use(passport.initialize());

// --- Routes ---

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// API Routes (Chart Logic)
app.use('/', chartRoutes);

// --- Frontend Serving (Vite) ---

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    app.use(express.static(path.resolve(__dirname, "dist")));
    
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  // --- Error Handling ---
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Melodia Chart Server running on http://localhost:${PORT}`);
  });
}

setupVite();
