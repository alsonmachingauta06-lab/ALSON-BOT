FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    yt-dlp \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN YOUTUBE_DL_SKIP_DOWNLOAD=true npm install

COPY . .

RUN mkdir -p /app/tmp

CMD ["node", "--expose-gc", "index.js"]
