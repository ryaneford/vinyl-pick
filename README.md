# Vinyl Pick 🎵

A simple web app that picks a random vinyl record from your Discogs collection.

![Vinyl Pick](https://yourdomain.com)

## Features

- Connect with your Discogs account via OAuth
- Randomly picks a vinyl record from your collection
- Shuffle without repeat (remembers what you've played)
- Dark mode (default) with light mode toggle
- Click to open any record on Discogs
- Reset history to start fresh

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

Create a `.env.local` file:

```env
DISCOGS_CONSUMER_KEY=your_consumer_key
DISCOGS_CONSUMER_SECRET=your_consumer_secret
NEXT_PUBLIC_OAUTH_CALLBACK=http://localhost:3000/api/oauth/callback
```

## Deployment

### Docker

```bash
# Build
docker build -t vinyl-pick .

# Run
docker run -d -p 3000:3000 \
  -e DISCOGS_CONSUMER_KEY=your_key \
  -e DISCOGS_CONSUMER_SECRET=your_secret \
  -e NEXT_PUBLIC_OAUTH_CALLBACK=https://yourdomain.com/api/oauth/callback \
  -e OAUTH_BASE_URL=https://yourdomain.com \
  vinyl-pick
```

### Docker Compose

```yaml
services:
  vinyl-pick:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DISCOGS_CONSUMER_KEY=your_consumer_key
      - DISCOGS_CONSUMER_SECRET=your_consumer_secret
      - NEXT_PUBLIC_OAUTH_CALLBACK=https://yourdomain.com/api/oauth/callback
      - OAUTH_BASE_URL=https://yourdomain.com
    restart: unless-stopped
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

## Technologies

- [Next.js 14](https://nextjs.org) - React framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Discogs API](https://www.discogs.com/developers) - Vinyl collection data
- OAuth 1.0a - Authentication

## License

MIT

## Credits

- Discogs logo from [Simple Icons](https://simpleicons.org)