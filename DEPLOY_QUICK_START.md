# Quick Start - Production Deployment

## Pre-Deployment Checklist (5 minutes)

### 1. Update Render Environment Variables

**Backend Service:**
```
PORT=3000
NODE_ENV=production
MONGO_URI=mongodb+srv://shashankvenkatesh7906_db_user:synctroop@cluster0.mi30vny.mongodb.net/?appName=Cluster0
JWT_SECRET=<generate-secure-random-string>
CLIENT_URL=https://synctroopfrontend.onrender.com  # UPDATE THIS
BACKEND_URL_PROD=https://synctroops.onrender.com
```

**Frontend Service:**
```
VITE_API_URL=https://synctroops.onrender.com
VITE_SOCKET_URL=https://synctroops.onrender.com
```

### 2. Verify MongoDB Atlas

- [ ] Connection string is correct
- [ ] Username/password are correct
- [ ] Render IPs are whitelisted in MongoDB Atlas

### 3. Deploy

**Option A: Using render.yaml**
```bash
git add .
git commit -m "Production deployment configuration"
git push origin main
# Render will auto-detect render.yaml
```

**Option B: Manual**
- Go to render.com dashboard
- Create Web Service for backend and frontend
- Set environment variables
- Click Deploy

### 4. Wait for Build

Frontend: 2-3 minutes
Backend: 1-2 minutes

### 5. Test

1. **Frontend:** Visit https://synctroopfrontend.onrender.com
2. **Sign Up:** Create a test account
3. **Auth:** Verify login/logout works
4. **Room:** Create a room and join it
5. **Real-time:** Verify Socket.IO connects
6. **Tasks:** Create and assign tasks
7. **Chat:** Send a message

## Common Issues & Quick Fixes

### "Cannot POST /api/auth/signup"
- ✅ Check `VITE_API_URL` environment variable
- ✅ Verify backend `NODE_ENV=production`
- ✅ Check CORS in server.js

### "Socket.IO connection failed"
- ✅ Check `VITE_SOCKET_URL` environment variable
- ✅ Verify `CLIENT_URL` matches frontend domain
- ✅ Check browser console for CORS errors

### "Invalid JWT Secret"
- ✅ Ensure `JWT_SECRET` is set (not empty)
- ✅ Use same secret in both deployments

### "MongoDB connection timeout"
- ✅ Add Render IP to MongoDB whitelist
- ✅ Verify `MONGO_URI` is correct
- ✅ Check network connectivity

## Render Dashboard Links

- Backend: https://dashboard.render.com/services/synctroops-backend
- Frontend: https://dashboard.render.com/services/synctroops-frontend
- Logs: https://dashboard.render.com/services/[service-id]/events

## Commands for Testing

```bash
# Build frontend
npm run build

# Preview production build locally
npm run preview

# Check API connectivity (replace with your URL)
curl https://synctroops.onrender.com/api/auth/login

# Check logs
npm start (in server directory)
```

## Environment Variable Names Reference

| Purpose | Variable | Value |
|---------|----------|-------|
| Frontend API URL | `VITE_API_URL` | Backend URL with https |
| Frontend Socket | `VITE_SOCKET_URL` | Backend URL with https |
| Backend Client | `CLIENT_URL` | Frontend URL with https |
| Backend Auth | `JWT_SECRET` | Secure random 32+ chars |
| Backend Port | `PORT` | 3000 |
| Backend Env | `NODE_ENV` | production |
| Backend DB | `MONGO_URI` | MongoDB connection string |

## Final Verification

After deployment, run through this 2-minute test:

1. **Homepage loads?** ✅ / ❌
2. **Sign up works?** ✅ / ❌
3. **Login works?** ✅ / ❌
4. **Create room works?** ✅ / ❌
5. **Join room works?** ✅ / ❌
6. **Timer starts?** ✅ / ❌
7. **Message sends?** ✅ / ❌
8. **Real-time sync?** ✅ / ❌

If any ❌, check the troubleshooting section in `PRODUCTION_DEPLOYMENT.md`.

## Rollback

If something breaks:
```bash
git revert HEAD
git push origin main
# Render auto-deploys from new commit
```

## Need Help?

1. Check browser DevTools Console
2. Check Render logs: Dashboard → Service → Logs
3. Check Network tab for API calls
4. Verify environment variables match this guide
5. Test locally with same environment first

---

**Status:** ✅ All production fixes applied and documented
**Next Step:** Update Render environment variables and deploy
