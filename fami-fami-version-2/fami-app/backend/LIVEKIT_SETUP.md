# LiveKit Setup Guide

## Required Environment Variables

Add these three variables to your `.env` file in the `backend` directory:

```env
# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key-here
LIVEKIT_API_SECRET=your-api-secret-here
```

## Where to Get LiveKit Credentials

1. **If using LiveKit Cloud:**
   - Sign up at https://cloud.livekit.io
   - Create a project
   - Get your URL, API Key, and API Secret from the project settings

2. **If self-hosting LiveKit:**
   - Install LiveKit server
   - Generate keys using: `livekit-server generate-keys`
   - Use your server's WebSocket URL (usually `wss://your-domain.com`)

## Verification Steps

1. **Check your .env file** - Make sure all three variables are set:
   - `LIVEKIT_URL` (should start with `wss://` or `ws://`)
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`

2. **Restart the backend server** - Environment variables are loaded on startup

3. **Test the configuration** - The server will log errors if LiveKit is not configured correctly

## Testing

After restarting, try creating a video call. If you see errors about "LiveKit not configured", check:
- All three variables are in the .env file
- No typos in variable names
- Server was restarted after adding variables
- .env file is in the `backend` directory (not root)
