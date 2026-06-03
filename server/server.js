import express from 'express';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import { createRoomRouter } from './routes/roomRoutes.js'
import { initializeSocket } from './socket.js';

dotenv.config();

const app = express();

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

const isOriginAllowed = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  const normalizedOrigin = normalizeOrigin(value);

  if (allowedOrigins.has(normalizedOrigin) || isHostedFrontendOrigin(normalizedOrigin)) {
    return true;
  }

  if (
    normalizedOrigin.startsWith('https://') &&
    (normalizedOrigin.endsWith('.vercel.app') || normalizedOrigin.includes('.vercel.app:'))
  ) {
    return true;
  }

  if (normalizedOrigin.startsWith('https://') && normalizedOrigin.endsWith('.onrender.com')) {
    return true;
  }

  return false;
};

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

    // Allow exact match in allowed origins list
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Rejected origin: ${origin}`);
    callback(null, false); // Clean rejection without throwing a server-crashing Error
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const applyCorsHeaders = (req, res, next) => {
  const origin = req.headers.origin;

  if (typeof origin === 'string' && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(','));

    const requestedHeaders = req.headers['access-control-request-headers'];
    res.setHeader(
      'Access-Control-Allow-Headers',
      typeof requestedHeaders === 'string' && requestedHeaders.trim()
        ? requestedHeaders
        : corsOptions.allowedHeaders.join(','),
    );
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
};

const httpServer = createServer(app);

const io = initializeSocket(httpServer, { 
  origin: corsOptions.origin, // Share the same robust CORS matching function
  credentials: true,
})

// Middleware
app.use(applyCorsHeaders);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/room', createRoomRouter(io))

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB successfully connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
