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

// Allow multiple origins for development and production flexibility
const getAllowedOrigins = () => {
  const clientUrl = (process.env.CLIENT_URL || 'https://synctroop.vercel.app').replace(/\/$/, '');
  
  const origins = [
    clientUrl,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  
  return origins;
};

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin: (origin, callback) => {
    // If no origin (e.g. server-to-server or postman requests), allow it
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, '');

    // Allow exact match in allowed origins list
    if (allowedOrigins.includes(normalizedOrigin)) {
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
