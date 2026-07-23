import express from 'express';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import { createRoomRouter } from './routes/roomRoutes.js'
import { initializeSocket } from './socket.js';

dotenv.config();

// Fail fast if required secrets are missing instead of limping along with
// undefined values that would silently break auth / DB connectivity.
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'MONGO_URI'];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(`[Startup] Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.warn('[Startup] JWT_SECRET is shorter than 32 characters. Use a longer, random secret in production.');
}

const app = express();

// Render/Vercel/most PaaS providers terminate TLS at a proxy in front of
// the app. Trusting the proxy ensures secure cookies, req.protocol, and
// the rate limiter's IP detection behave correctly in production.
app.set('trust proxy', 1);

const normalizeOrigin = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\/$/, '').toLowerCase();
};

const parseOriginList = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return value
    .split(/[\s,]+/)
    .map(normalizeOrigin)
    .filter(Boolean);
};

// Allow the configured frontend origins used by local dev, Vercel, and Render.
const getAllowedOrigins = () => {
  const origins = new Set([
    ...parseOriginList(process.env.CLIENT_URL),
    ...parseOriginList(process.env.CLIENT_URLS),
    ...parseOriginList(process.env.FRONTEND_URL),
    ...parseOriginList(process.env.FRONTEND_URLS),
    'https://synctroop.vercel.app',
    'https://synctroops-frontend.onrender.com',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
    'http://localhost:3001',
  ]);

  return origins;
};

const allowedOrigins = getAllowedOrigins();

const isHostedFrontendOrigin = (value) => {
  try {
    const parsedUrl = new URL(value);

    return (
      parsedUrl.protocol === 'https:' &&
      (parsedUrl.hostname.endsWith('.vercel.app') || parsedUrl.hostname.endsWith('.onrender.com'))
    );
  } catch {
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    // If no origin (e.g. server-to-server or postman requests), allow it
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);

    // Allow exact match in allowed origins list
    if (allowedOrigins.has(normalizedOrigin) || isHostedFrontendOrigin(normalizedOrigin)) {
      return callback(null, true);
    }

    // Allow any Vercel subdomain/preview deployment dynamically
    if (
      normalizedOrigin.startsWith('https://') &&
      (normalizedOrigin.endsWith('.vercel.app') || normalizedOrigin.includes('.vercel.app:'))
    ) {
      return callback(null, true);
    }

    console.warn(`[CORS] Rejected origin: ${origin}`);
    callback(null, false); // Clean rejection without throwing a server-crashing Error
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const httpServer = createServer(app);

const io = initializeSocket(httpServer, { 
  origin: corsOptions.origin, // Share the same robust CORS matching function
  credentials: true,
})

// Middleware
app.use(helmet({
  // The API only ever serves JSON, so a strict default-src CSP isn't
  // needed here and would only get in the way of the separately-hosted
  // frontend. crossOriginResourcePolicy is relaxed so the frontend origin
  // can consume responses.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Basic brute-force protection on auth endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

// A looser limiter for the rest of the API.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/room', apiLimiter, createRoomRouter(io))

// Simple health check for uptime monitors / Render's health checks.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Fallback error handler so an unexpected thrown error in a route never
// leaks a stack trace to the client and never crashes the process.
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled request error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

// Database Connection
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
})
  .then(() => console.log('MongoDB successfully connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

mongoose.connection.on('disconnected', () => {
  console.warn('[Mongo] Connection lost. Mongoose will attempt to reconnect automatically.');
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Prevent unhandled async errors from silently killing the process, and
// shut down cleanly on deploy restarts (SIGTERM from Render/Docker/etc.).
process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught exception:', err);
});

function shutdown(signal) {
  console.log(`[Process] Received ${signal}, shutting down gracefully...`);
  httpServer.close(() => {
    mongoose.connection.close(false).finally(() => {
      console.log('[Process] Shutdown complete.');
      process.exit(0);
    });
  });

  // Force-exit if shutdown hangs.
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
