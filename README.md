# What is Pomodoro?

The Pomodoro Technique is a time-management method that breaks work into focused intervals, usually 25 minutes long, separated by short breaks. After several focus cycles, you take a longer break. The idea is simple: work with intention, rest on purpose, and repeat.

SyncTroop builds on that idea by giving you two ways to work:

- Solo mode for personal focus sessions
- Group mode for shared rooms with live timer sync, tasks, presence, and chat

# SyncTroop

SyncTroop is a collaborative Pomodoro app built with React, Vite, Node.js, Express, MongoDB, and Socket.IO. It combines a polished focus timer with realtime room coordination so individuals and teams can stay aligned around the same session.

## Features

### Solo mode

- Classic Pomodoro reverse countdown
- Adjustable focus, short break, and long break durations
- Automatic phase changes after each session
- Optional white noise
- Browser notifications for phase updates
- Local task list for personal planning

### Group mode

- Create or join a shared focus room with a room code
- Realtime synced timer for everyone in the room
- Shared task board with creator-controlled task assignment
- Live member presence and status updates
- Realtime room chat
- Socket-authenticated room access

### App experience

- Landing page with a clear Solo / Group entry point
- Global settings modal for timer preferences
- Responsive UI designed for desktop and mobile

## Tech Stack

- Frontend: React, Vite, React Router, Axios, Socket.IO client
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO
- Styling: Tailwind CSS

## Project Structure

```text
SyncTroop/
├── client/                # React + Vite frontend
├── server/                # Express + Socket.IO backend
├── Documentation/         # Setup, deployment, and troubleshooting notes
├── render.yaml            # Render deployment configuration
└── README.md              # Project overview and setup guide
```

## Prerequisites

- Node.js 18+ recommended
- npm
- MongoDB locally or a MongoDB Atlas connection string

## Local Setup

### 1. Install dependencies

From the repository root:

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure environment variables

The app is split into backend and frontend env files.

#### `server/.env`

```dotenv
PORT=3000
MONGO_URI=mongodb://localhost:27017/synctroop
JWT_SECRET=replace-with-a-strong-random-secret
CLIENT_URL=http://localhost:5173
CLIENT_URLS=http://localhost:5173
```

`CLIENT_URL` and `CLIENT_URLS` control which browser origins the backend accepts for CORS.

#### `client/.env`

```dotenv
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

These values point the frontend to the API and Socket.IO server during local development.

### 3. Start MongoDB

Run MongoDB locally, or point `MONGO_URI` to MongoDB Atlas.

### 4. Start the backend

```bash
cd server
npm run dev
```

### 5. Start the frontend

In a second terminal:

```bash
cd client
npm run dev
```

Open the app at the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Available Scripts

### Backend

From `server/`:

- `npm run dev` - start the backend with nodemon
- `npm start` - start the backend in production mode

### Frontend

From `client/`:

- `npm run dev` - start the Vite dev server
- `npm run build` - build the frontend for production
- `npm run preview` - preview the production build locally
- `npm run lint` - run ESLint

## Environment Variables

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | Yes | Port used by the Express and Socket.IO server |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign and verify auth tokens |
| `CLIENT_URL` | Yes | Primary frontend origin allowed by CORS |
| `CLIENT_URLS` | No | Additional comma- or space-separated frontend origins |
| `FRONTEND_URL` | No | Alternative single-origin CORS value supported by the code |
| `FRONTEND_URLS` | No | Alternative multi-origin CORS value supported by the code |

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | No | Backend API base URL |
| `VITE_SOCKET_URL` | No | Backend Socket.IO URL |

If `VITE_API_URL` and `VITE_SOCKET_URL` are omitted, the frontend falls back to the current origin in production and `http://localhost:3000` in development.

## How It Works

### Authentication

Users sign up or log in through the backend, which issues JWT-backed auth cookies and also returns a token for client-side storage.

### Solo flow

The solo page uses a local Pomodoro timer, local task state, and browser notifications to support individual focus sessions.

### Group flow

Group rooms are created through the REST API, then synchronized through Socket.IO so the timer, members, tasks, and chat stay in sync across participants.

## Deployment

The repository includes [render.yaml](render.yaml) for Render deployment.

### Backend deployment values

- `NODE_ENV=production`
- `PORT=3000`
- `MONGO_URI` pointing to MongoDB Atlas
- `JWT_SECRET` set to a strong random value
- `CLIENT_URL` set to the deployed frontend origin

### Frontend deployment values

- `VITE_API_URL` set to the deployed backend URL
- `VITE_SOCKET_URL` set to the deployed backend URL

## Troubleshooting

### CORS issues

Make sure the frontend origin is included in `CLIENT_URL` or `CLIENT_URLS` in the backend env file.

### Socket connection failures

- Confirm the backend is running
- Verify `VITE_SOCKET_URL` points to the backend
- Check that the auth token is available in the browser storage after login

### MongoDB connection issues

- Confirm `MONGO_URI` is valid
- Check that MongoDB is reachable from the machine or hosting provider

## Production Links

- Backend: https://synctroop.onrender.com
- Frontend: https://synctroop.vercel.app/

## License

No license has been specified in the repository yet.