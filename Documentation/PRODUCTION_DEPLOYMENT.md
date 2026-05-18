# Production Deployment Guide - SyncTroop

## Overview
This guide covers deploying the SyncTroop MERN application to Render with proper configuration for production environments.

## Pre-Deployment Checklist

### 1. Environment Variables Setup

**Backend (.env or Render environment variables):**
```
PORT=3000
NODE_ENV=production
MONGO_URI=mongodb+srv://[username]:[password]@cluster.mongodb.net/?appName=Cluster0
JWT_SECRET=your-secure-jwt-secret-change-this
CLIENT_URL=https://synctroopfrontend.onrender.com  # Your deployed frontend URL
BACKEND_URL_PROD=https://synctroops.onrender.com    # Your deployed backend URL
```

**Frontend (.env.production):**
```
VITE_API_URL=https://synctroops.onrender.com
VITE_SOCKET_URL=https://synctroops.onrender.com
```

### 2. MongoDB Atlas Configuration
- Ensure your MongoDB connection string includes the correct username and password
- Add Render's IP addresses to MongoDB Atlas IP whitelist (or allow all: 0.0.0.0/0 for testing)
- Test connection before deployment

### 3. JWT Secret
- Generate a secure JWT secret (minimum 32 characters)
- Store it in Render's environment variables, NOT in git

## Deployment Steps

### Option A: Using Render.yaml (Recommended)

1. **Commit your changes:**
```bash
git add .
git commit -m "Production deployment configuration"
git push origin main
```

2. **Deploy via Render:**
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`
   - Create the services as specified

### Option B: Manual Deployment on Render

#### Backend Deployment:
1. Create a new Web Service on Render
2. Connect your GitHub repo
3. Configure:
   - **Name:** synctroops-backend
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:** Set all variables from section 1
   - **Region:** Choose closest to your users

#### Frontend Deployment:
1. Create a new Web Service on Render
2. Configure:
   - **Name:** synctroops-frontend
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run preview`
   - **Environment Variables:** Set production URLs
   - **Public Path:** `dist`

## Troubleshooting Common Deployment Issues

### 1. API Calls Failing (404 errors)
**Symptom:** Frontend can't reach backend
**Cause:** Incorrect API base URL
**Fix:** 
- Verify `VITE_API_URL` environment variable is set in frontend
- Ensure backend `CLIENT_URL` matches frontend domain
- Check CORS configuration in backend

### 2. Socket.IO Connection Failing
**Symptom:** Real-time features don't work, Socket events not firing
**Cause:** Socket.IO CORS misconfiguration
**Fix:**
- Verify `VITE_SOCKET_URL` matches backend URL
- Check `CLIENT_URL` in backend matches frontend domain
- Ensure both use HTTPS in production

### 3. Authentication Issues
**Symptom:** Login/signup works locally but not in production
**Cause:** Cookie settings or JWT issues
**Fix:**
- Verify `secure: true` for cookies in production
- Check `httpOnly: true` setting
- Ensure JWT_SECRET is consistent across deployments
- Clear browser cookies and try again

### 4. Database Connection Timeout
**Symptom:** MongoDB connection errors
**Cause:** IP whitelist or connection string issues
**Fix:**
- Add Render's IP to MongoDB Atlas whitelist
- Verify MONGO_URI is correct
- Check network connectivity

### 5. Mixed Content (HTTPS/HTTP)
**Symptom:** Browser security warnings
**Cause:** Using HTTP URLs in HTTPS site
**Fix:**
- Ensure all environment URLs use HTTPS in production
- Verify socket transport configuration

## Environment Variable Reference

### Backend Variables
| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `NODE_ENV` | Yes | `production` | Must be 'production' for production |
| `PORT` | Yes | `3000` | Port for backend server |
| `MONGO_URI` | Yes | `mongodb+srv://...` | MongoDB connection string |
| `JWT_SECRET` | Yes | `secure-random-string` | Must be >32 chars |
| `CLIENT_URL` | Yes | `https://frontend.onrender.com` | Frontend domain for CORS |
| `BACKEND_URL_PROD` | No | `https://backend.onrender.com` | Backend domain (informational) |

### Frontend Variables
| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `VITE_API_URL` | Yes | `https://backend.onrender.com` | Backend API base URL |
| `VITE_SOCKET_URL` | Yes | `https://backend.onrender.com` | Socket.IO server URL |

## Post-Deployment Verification

1. **Test Authentication:**
   - Sign up with test account
   - Verify JWT cookie is set
   - Test login with new account

2. **Test API Connectivity:**
   - Check browser DevTools Network tab
   - Verify API calls succeed (200 status)
   - Check response data is correct

3. **Test Real-time Features:**
   - Check Socket.IO connection in DevTools
   - Create a room and verify members sync in real-time
   - Test task assignments and chat

4. **Test Database:**
   - Verify data persists after page refresh
   - Check MongoDB Atlas shows data

5. **Performance Check:**
   - Monitor backend logs for errors
   - Check response times
   - Verify no console errors

## Security Checklist

- [ ] `NODE_ENV=production` in backend
- [ ] JWT_SECRET is strong and unique
- [ ] Database credentials not in git
- [ ] CORS properly configured for production domain
- [ ] Cookies set to `secure: true` and `httpOnly: true`
- [ ] MongoDB IP whitelist includes Render's IPs
- [ ] No hardcoded localhost URLs in code
- [ ] HTTPS enforced on frontend
- [ ] Environment variables use HTTPS URLs

## Maintenance

### Logs
- Access Render logs from the dashboard
- Monitor for connection errors and timeouts

### Database Backups
- Configure MongoDB Atlas backups
- Regularly verify backups are working

### Updates
- Keep dependencies updated
- Test updates locally before deploying
- Monitor for security vulnerabilities

## Reverting a Deployment

If deployment fails:
1. Push previous working commit
2. Render will automatically redeploy
3. Or manually trigger redeploy from dashboard

## Support

- Check browser DevTools Console for errors
- Check Render dashboard logs
- Verify environment variables are set correctly
- Test locally first before production changes
