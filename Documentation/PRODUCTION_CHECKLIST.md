# Production Code Quality Checklist

Use this checklist before every deployment to ensure your code is production-ready.

## Environment & Configuration

- [ ] **Development environment** uses `.env.local` or `.env`
- [ ] **Production environment** uses `.env.production`
- [ ] **NODE_ENV** correctly set to `development` or `production`
- [ ] **JWT_SECRET** is strong (32+ characters) and unique
- [ ] **MONGO_URI** uses MongoDB Atlas, not local MongoDB
- [ ] **CORS origins** match deployed frontend domain
- [ ] **API_URL** variables use HTTPS in production
- [ ] **Socket.IO URL** matches backend domain exactly

## Frontend Code

- [ ] **No hardcoded localhost URLs** in source code
  - Search: `localhost:3000` or `localhost:5173`
  - Should only exist in comments or `.env` files
- [ ] **No API keys or secrets** in code or `.env` files tracked in git
- [ ] **Error handling** doesn't expose server details
- [ ] **Network requests** include proper error handling
- [ ] **Console logs** are removed (Vite terser removes them automatically)
- [ ] **Build output** is minified and optimized
- [ ] **No development-only imports** in production build

## Backend Code

- [ ] **No hardcoded URLs** pointing to localhost
- [ ] **CORS origin** dynamically configured, not hardcoded
- [ ] **Error messages** are generic in production
- [ ] **Console logs** are sent to server logs, not exposed to client
- [ ] **Database operations** have timeouts
- [ ] **Authentication middleware** validates all requests
- [ ] **No sensitive data** in JSON responses
- [ ] **Rate limiting** considered for production

## Database

- [ ] **MongoDB Atlas** connection string is correct
- [ ] **Network access** is properly configured (IP whitelist)
- [ ] **Database backups** are enabled
- [ ] **Connection pooling** is configured
- [ ] **Indexes** are created for performance

## Socket.IO

- [ ] **CORS origins** configured correctly
- [ ] **Transports** include both 'websocket' and 'polling'
- [ ] **Authentication** validates token before connection
- [ ] **Reconnection settings** are configured
- [ ] **Connection timeouts** are appropriate for network
- [ ] **Event handlers** have error handling

## Security

- [ ] **HTTPS enforced** everywhere
- [ ] **Cookies use secure flag** in production
- [ ] **Cookies use httpOnly flag**
- [ ] **Cookies use sameSite flag**
- [ ] **CORS** only allows production domain
- [ ] **Authentication** requires valid JWT
- [ ] **Password hashing** uses bcrypt
- [ ] **No SQL/NoSQL injection** vulnerabilities

## Performance

- [ ] **Frontend build** is minified
- [ ] **Frontend** has code splitting
- [ ] **Frontend** images are optimized
- [ ] **Backend** uses proper indexes
- [ ] **Database queries** are optimized
- [ ] **Socket.IO** connection limits are considered
- [ ] **CDN caching** is configured (if applicable)

## Testing

- [ ] **Authentication** tested (signup, login, logout)
- [ ] **API endpoints** tested and working
- [ ] **Socket.IO** connection tested
- [ ] **Real-time features** verified (room sync, messages)
- [ ] **Database operations** verified
- [ ] **Error cases** handled gracefully
- [ ] **Responsive design** tested on mobile
- [ ] **No console errors** in DevTools

## Monitoring & Logging

- [ ] **Server logs** capture important events
- [ ] **Error tracking** is configured
- [ ] **Database performance** can be monitored
- [ ] **Socket.IO events** are logged
- [ ] **API response times** can be measured
- [ ] **Login failures** are logged
- [ ] **No sensitive data** in logs

## Build & Deployment

- [ ] **Build succeeds** without warnings
- [ ] **No runtime errors** on production deployment
- [ ] **All environment variables** are set
- [ ] **Database migrations** are applied
- [ ] **Assets are served correctly** (JS, CSS, fonts)
- [ ] **Static files** are properly configured
- [ ] **API routes** are correctly prefixed with `/api`

## Post-Deployment (After Deploying)

- [ ] **Homepage loads** without errors
- [ ] **Sign up works** end-to-end
- [ ] **Login works** end-to-end
- [ ] **Logout works** and clears data
- [ ] **API calls** succeed (check Network tab)
- [ ] **Socket.IO connects** (check console)
- [ ] **Real-time updates** sync correctly
- [ ] **Tasks** can be created and completed
- [ ] **Chat messages** send and receive
- [ ] **Room creation/joining** works
- [ ] **User authentication** is enforced
- [ ] **CORS errors** don't appear
- [ ] **Mixed content** warnings don't appear
- [ ] **Browser DevTools** console is clean

## Files to Verify

Before committing:
- [ ] `.env` is in `.gitignore`
- [ ] `.env.*.local` is in `.gitignore`
- [ ] `node_modules` is in `.gitignore`
- [ ] `.env.example` is tracked (no secrets)
- [ ] `.env.production` is correct format
- [ ] `package.json` build command is correct
- [ ] `package.json` start command is correct

## Deployment Verification

- [ ] Render dashboard shows "live" status
- [ ] Render logs show no errors during startup
- [ ] Backend is accepting connections
- [ ] Frontend loads from correct URL
- [ ] API calls use correct base URL
- [ ] Socket.IO connects without errors
- [ ] Database operations work (CRUD)

## Team Handoff

If handing off to another developer:
- [ ] Deployment guide is clear and complete
- [ ] Environment variables are documented
- [ ] Common issues are documented
- [ ] Emergency rollback process is known
- [ ] Monitoring setup is explained
- [ ] Contact person for issues is assigned

## Performance Baseline (For Monitoring)

Record these metrics before deploying:
- [ ] Frontend bundle size: ___ KB
- [ ] API response time: ___ ms average
- [ ] Socket.IO connection time: ___ ms
- [ ] Database query time: ___ ms average
- [ ] Page load time: ___ seconds

---

## Quick Production Validation Script

```bash
# Run locally before deployment

# Frontend
cd client
npm run build  # Should succeed with no errors
npm run preview  # Test production build locally

# Backend
cd ../server
npm start  # Should start without errors

# Test API
curl http://localhost:3000/api/auth/login

# If all ✅, safe to deploy
```

## Daily Production Checks

Schedule these for production environment:
- [ ] Morning: Check Render logs for errors
- [ ] Midday: Spot check authentication works
- [ ] Evening: Verify database connectivity
- [ ] Weekly: Check for security updates
- [ ] Monthly: Review performance metrics

---

**Revision:** v1.0
**Last Updated:** 2026-05-17
**Status:** Ready for Production

For questions or issues, refer to:
- `PRODUCTION_DEPLOYMENT.md` - Full deployment guide
- `PRODUCTION_FIXES.md` - What was fixed
- `DEPLOY_QUICK_START.md` - Quick reference
