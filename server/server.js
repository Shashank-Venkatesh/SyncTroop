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
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const backendUrl = process.env.BACKEND_URL_PROD || 'http://localhost:3000';
  
  const origins = [
    clientUrl,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  
  if (process.env.NODE_ENV === 'production') {
    return [clientUrl]; // Only allow configured client URL in production
  }
  
  return origins; // Allow multiple origins in development
};

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const httpServer = createServer(app);

const io = initializeSocket(httpServer, { 
  origin: allowedOrigins,
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
