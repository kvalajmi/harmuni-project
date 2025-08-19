# 🚀 Render Deployment Guide

## 📋 Pre-Deployment Checklist

✅ **Project Structure Ready**
- `project-root/frontend/` - React frontend with built `dist/` folder
- `project-root/backend/` - Express server with `index.js` entry point
- `project-root/package.json` - Root package.json for deployment
- Git repository initialized and committed

✅ **Server Configuration**
- Backend serves frontend from `../frontend/dist`
- All API routes prefixed with `/api`
- Single entry point: `backend/index.js`
- Production-ready security headers

## 🌐 Render Deployment Steps

### 1. Push to GitHub

```bash
# If not already done:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 2. Create Render Web Service

1. **Go to [Render Dashboard](https://dashboard.render.com/)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**

### 3. Render Configuration

| Setting | Value |
|---------|-------|
| **Name** | `whatsapp-bulk-messaging` |
| **Root Directory** | `backend` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node index.js` |
| **Instance Type** | `Free` (or higher) |

### 4. Environment Variables

Add these in Render Dashboard → Environment tab:

```env
NODE_ENV=production
PORT=10000
```

Optional (if needed):
```env
FRONTEND_URL=https://your-app-name.onrender.com
```

### 5. Deploy

- Click **"Create Web Service"**
- Render will automatically build and deploy
- First deployment takes 5-10 minutes

## 🔍 Verification

Once deployed, test these endpoints:

- **Frontend**: `https://your-app.onrender.com/`
- **Health Check**: `https://your-app.onrender.com/api/health`
- **API Status**: `https://your-app.onrender.com/api/status`

## 📱 WhatsApp Setup

1. **Open your deployed app**
2. **Click "Connect to WhatsApp"**
3. **Scan QR code with WhatsApp mobile app**
4. **Upload Excel file and start messaging**

## 🛠️ Local Testing

Test the production build locally:

```bash
cd project-root
npm run build  # Build frontend
cd backend
npm start      # Start production server
```

Visit: http://localhost:3000

## 🐛 Troubleshooting

### Build Fails
- Check `backend/package.json` has all dependencies
- Ensure Node.js version compatibility (18+)

### Frontend Not Loading
- Verify `frontend/dist/` exists and contains built files
- Check server logs for static file serving errors

### API Routes Not Working
- Ensure all API routes are prefixed with `/api`
- Check CORS configuration in production

### WhatsApp Connection Issues
- WhatsApp requires persistent sessions
- May need to reconnect after deployments

## 🔄 Redeployment

For updates:

```bash
# Make your changes
git add .
git commit -m "Update: your changes"
git push origin main
```

Render will automatically redeploy on push to main branch.

## 📊 Monitoring

- **Render Dashboard**: Monitor deployments and logs
- **Application Logs**: Check for WhatsApp connection status
- **Health Endpoint**: Monitor `/api/health` for uptime

## 🔒 Security Notes

- Environment variables are secure in Render
- HTTPS is automatically provided
- Security headers are enabled in production
- Rate limiting is active for API endpoints

## 📞 Support

If you encounter issues:

1. Check Render deployment logs
2. Verify environment variables
3. Test locally with production build
4. Check WhatsApp session persistence

---

**🎉 Your WhatsApp Bulk Messaging System is now ready for production use!**
