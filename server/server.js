import express from 'express';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import cors from 'cors';
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
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
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
