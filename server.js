const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

// Serve static assets from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint to download YouTube videos and stream them to the client
app.get('/api/download', (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  console.log(`[Server] Request received to download: ${videoUrl}`);

  // Step 1: Query yt-dlp for the video title first to set a nice file name
  const titleProcess = spawn('yt-dlp', [
    '--get-filename',
    '-o', '%(title)s.%(ext)s',
    '--no-check-certificate',
    videoUrl
  ]);

  let filename = 'video.mp4';
  let titleData = '';

  titleProcess.stdout.on('data', (data) => {
    titleData += data.toString();
  });

  titleProcess.on('close', () => {
    if (titleData.trim()) {
      filename = titleData.trim();
    }
    
    // Clean up filename: ensure it ends with .mp4 or similar extension
    if (!path.extname(filename)) {
      filename += '.mp4';
    }

    console.log(`[Server] Streaming file: ${filename}`);

    // Set HTTP Headers to trigger native download prompt in browser
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'video/mp4');

    // Step 2: Spawn yt-dlp to download and output to stdout ('-o -')
    // We request format 'b' (best single file format with video+audio merged) 
    // since we are streaming via pipe and cannot merge separate video/audio streams on-the-fly.
    const downloadProcess = spawn('yt-dlp', [
      '-o', '-',
      '-f', 'b',
      '--no-check-certificate',
      videoUrl
    ]);

    // Pipe the standard output stream of yt-dlp directly to the client's browser response
    downloadProcess.stdout.pipe(res);

    downloadProcess.stderr.on('data', (data) => {
      // Logs stderr (useful for debugging, yt-dlp progress, etc.)
      const logLine = data.toString().trim();
      if (logLine) {
        console.log(`[yt-dlp] ${logLine}`);
      }
    });

    downloadProcess.on('error', (err) => {
      console.error(`[Server] Error starting download process: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to start downloader backend' });
      }
    });

    // Clean up when the client cancels or closes the request connection
    req.on('close', () => {
      console.log('[Server] Client closed connection. Killing downloader process.');
      downloadProcess.kill('SIGINT');
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
