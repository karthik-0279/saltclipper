# ==========================================
# AutoClip AI - Multi-Stage Production Dockerfile
# Installs Node.js, FFmpeg, and yt-dlp on Linux
# ==========================================

FROM node:20-bookworm-slim

# Install system dependencies: FFmpeg, Python3 (for yt-dlp), and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production and build dependencies
RUN npm ci

# Copy application source code
COPY . .

# Build React production bundle
RUN npm run build

# Create temporary clips directory
RUN mkdir -p temp_clips

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=8080
ENV FFMPEG_PATH=ffmpeg
ENV YTDLP_PATH=/usr/local/bin/yt-dlp

EXPOSE 8080

CMD ["node", "server.js"]
