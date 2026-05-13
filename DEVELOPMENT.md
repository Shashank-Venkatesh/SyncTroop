# Local Development Setup Guide

## Prerequisites

Ensure you have the following installed:
- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local) OR Docker (to run MongoDB in container)

## Option 1: Local MongoDB Setup (Recommended for Development)

### Install MongoDB Locally

**On macOS (with Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**On Ubuntu/Debian:**
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-5.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-5.0.list
apt-get update
apt-get install -y mongodb-org
sudo systemctl start mongod
```

**On Windows:**
Download and install from https://www.mongodb.com/try/download/community

### Start MongoDB

```bash
mongod --dbpath /path/to/data
# or use: brew services start mongodb-community (on macOS)
```

## Option 2: Docker MongoDB Setup

If you have Docker installed, run MongoDB in a container:

```bash
docker run -d \
  --name synctroop-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=synctroop \
  mongo:latest
```

To stop: `docker stop synctroop-mongo`
To remove: `docker rm synctroop-mongo`

## Environment Configuration

The `.env` files are already configured for local development:

### Server (.env)
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/synctroop
JWT_SECRET=Spidey-sense
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Client (.env)
```
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Starting the Application

### 1. Install Dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

### 2. Start MongoDB

Ensure MongoDB is running (either locally or via Docker):
```bash
mongod
# or
docker start synctroop-mongo
```

### 3. Start the Server

```bash
cd server
npm run dev
# or
node server.js
```

Expected output:
```
MongoDB successfully connected
Server is running on port 3000
```

### 4. Start the Client

In a new terminal:
```bash
cd client
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
```

## Testing the Application

1. Open http://localhost:5173 in your browser
2. Sign up with a new user account
3. Create a room (Group Mode)
4. Join the room from another browser/incognito window
5. Verify real-time updates and room data synchronization

## Troubleshooting

### Connection Refused on Port 3000

**Problem:** `ECONNREFUSED` errors when client tries to connect
**Solution:** Ensure the server is running on port 3000

```bash
lsof -i :3000  # Check if port is in use
```

### MongoDB Connection Failed

**Problem:** `MongooseError: connect ECONNREFUSED 127.0.0.1:27017`
**Solution:** Start MongoDB

```bash
# Check MongoDB status
ps aux | grep mongod

# Start if not running
mongod --dbpath /path/to/data
```

### CORS Errors

**Problem:** `Access to XMLHttpRequest blocked by CORS`
**Solution:** Ensure `CLIENT_URL` in server `.env` is set to `http://localhost:5173`

### Socket Connection Issues

**Problem:** WebSocket connection fails
**Solution:** 
- Verify server is running on port 3000
- Check that `VITE_SOCKET_URL` is set correctly in client
- Clear browser cache and hard refresh

## Database Reset (Development Only)

To reset the database and start fresh:

```bash
# Using MongoDB CLI
mongo
> use synctroop
> db.users.deleteMany({})
> db.rooms.deleteMany({})
```

Or via MongoDB Compass (GUI):
1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Select `synctroop` database
4. Delete collections as needed

## Production Deployment

When deploying to production:
- Update `.env` with production MongoDB Atlas URI
- Set `NODE_ENV=production`
- Use production URLs for `CLIENT_URL` and VITE environment variables
- Ensure JWT_SECRET is a strong, random string

See `.env.example` or production deployment docs for details.
