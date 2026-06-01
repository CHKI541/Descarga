# Use official Node.js runtime as parent image
FROM node:20-slim

# Install system dependencies: Python3, Curl, and FFmpeg (required by yt-dlp)
RUN apt-get update && \
    apt-get install -y python3 curl ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Download and install the latest yt-dlp release binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Set working directory inside the container
WORKDIR /app

# Copy dependency manifest files first for caching layers
COPY package*.json ./

# Install npm production dependencies
RUN npm ci --only=production

# Copy application source files
COPY . .

# Expose port 8080 (standard for cloud platforms like Render)
EXPOSE 8080

# Environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Start application server
CMD ["npm", "start"]
