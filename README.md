# Vinyl Pick 🎵

A simple web app that picks a random vinyl record from your Discogs collection.

<p align="center">
  <img src="/screenshot.png" alt="Vinyl Pick Screenshot" width="600" />
</p>

## Features

- Connect with your Discogs account via OAuth
- Randomly picks a vinyl record from your collection
- Shuffle without repeat (remembers what you've played)
- Dark mode only
- Click to open any record on Discogs
- Music service links (Spotify, Apple Music, Tidal, YouTube Music)
- Favorites system
- Listening history with navigation
- Genre and decade filters
- Keyboard shortcuts (Space=Pick, S=Skip, R=Reset)
- Stats and FAQ modals
- Docker deployment ready

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (optional, for containerized deployment)
- A Discogs account

### Running Locally

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

The app will be available at `http://localhost:3000`

### Discogs OAuth Setup

To use the app, you need to create a Discogs application:

1. Go to [Discogs Developers](https://www.discogs.com/settings/developers)
2. Click "Create An Application"
3. Fill in the details:
   - **App Name**: Vinyl Pick (or your choice)
   - **Callback URL**: `http://localhost:3000/api/oauth/callback` (for local) or your production URL
4. Copy the **Consumer Key** and **Consumer Key**

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCOGS_CONSUMER_KEY` | Yes | Your Discogs application consumer key |
| `DISCOGS_CONSUMER_SECRET` | Yes | Your Discogs application consumer secret |
| `NEXT_PUBLIC_OAUTH_CALLBACK` | Yes | OAuth callback URL (e.g., `https://yourdomain.com/api/oauth/callback`) |
| `OAUTH_BASE_URL` | Yes | Your app's base URL for OAuth redirect (e.g., `https://yourdomain.com`) |

For local development, create a `.env.local` file:

```env
DISCOGS_CONSUMER_KEY=your_consumer_key
DISCOGS_CONSUMER_SECRET=your_consumer_secret
NEXT_PUBLIC_OAUTH_CALLBACK=http://localhost:3000/api/oauth/callback
OAUTH_BASE_URL=http://localhost:3000
```

## Deployment

### Docker (Recommended)

```bash
docker run -d -p 3000:3000 \
  -e DISCOGS_CONSUMER_KEY=your_consumer_key \
  -e DISCOGS_CONSUMER_SECRET=your_consumer_secret \
  -e NEXT_PUBLIC_OAUTH_CALLBACK=https://yourdomain.com/api/oauth/callback \
  -e OAUTH_BASE_URL=https://yourdomain.com \
  --restart unless-stopped \
  ryaneford/vinyl-pick
```

### Docker Compose

```yaml
services:
  vinyl-pick:
    image: ryaneford/vinyl-pick
    ports:
      - "3000:3000"
    environment:
      - DISCOGS_CONSUMER_KEY=your_consumer_key
      - DISCOGS_CONSUMER_SECRET=your_consumer_secret
      - NEXT_PUBLIC_OAUTH_CALLBACK=https://yourdomain.com/api/oauth/callback
      - OAUTH_BASE_URL=https://yourdomain.com
    restart: unless-stopped
```

### Build Locally (Alternative)

```bash
docker build -t vinyl-pick .
docker run -d -p 3000:3000 \
  -e DISCOGS_CONSUMER_KEY=your_key \
  -e DISCOGS_CONSUMER_SECRET=your_secret \
  -e NEXT_PUBLIC_OAUTH_CALLBACK=https://yourdomain.com/api/oauth/callback \
  -e OAUTH_BASE_URL=https://yourdomain.com \
  vinyl-pick
```

### Production Notes

For production deployment:

1. Update the callback URL in your Discogs app settings to your production URL
2. Set `OAUTH_BASE_URL` to your production domain
3. Use HTTPS

## How It Works

1. User clicks "Connect with Discogs"
2. App redirects to Discogs OAuth authorization
3. User authorizes the app
4. Discogs redirects back with verifier
5. App exchanges verifier for access token
6. App fetches user's vinyl collection
7. User clicks "Pick Another" for random selection

## Screenshots
<img width="800" height="1500" alt="vinylpickerscreenshot" src="https://github.com/user-attachments/assets/515252e3-4a3f-450e-8833-29b0350641d7" />



## Technologies

- [Next.js 14](https://nextjs.org) - React framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Discogs API](https://www.discogs.com/developers) - Vinyl collection data
- OAuth 1.0a - Authentication

## License

MIT

## Credits

- Service icons from [Simple Icons](https://simpleicons.org) — Discogs, Spotify, Apple Music, Tidal, YouTube Music

---

*Vinyl Pick was built entirely with AI agents. The creator has zero coding experience — every line of code, from OAuth flow to Docker deployment, was written collaboratively with [opencode](https://github.com/anomalyco/opencode). If you're curious what AI-assisted development looks like in practice, this project is it.*
