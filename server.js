const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8080;

// Create temp directory for buffering downloads if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Serve static assets from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint to download YouTube videos with format and quality options
app.get('/api/download', async (req, res) => {
  const videoUrl = req.query.url;
  const format = req.query.format || 'mp4';
  const quality = req.query.quality || 'best';

  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  console.log(`[Server] Request received to download (${format}, ${quality}p): ${videoUrl}`);

  // Step 1: Query yt-dlp for the video title first to set a nice file name
  const titleProcess = spawn('yt-dlp', [
    '--get-filename',
    '-o', '%(title)s.%(ext)s',
    '--no-check-certificate',
    videoUrl
  ]);

  let rawTitle = 'video';
  let titleData = '';

  titleProcess.stdout.on('data', (data) => {
    titleData += data.toString();
  });

  titleProcess.on('close', () => {
    if (titleData.trim()) {
      rawTitle = titleData.trim();
    }
    
    // Determine target output extension and file name
    let finalExtension = format === 'mp3' ? '.mp3' : '.mp4';
    let cleanTitle = path.basename(rawTitle, path.extname(rawTitle));
    let finalFilename = `${cleanTitle}${finalExtension}`;

    // Generate a unique temporary path prefix
    const tempFilenamePrefix = `temp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const tempOutputPathTemplate = path.join(tempDir, `${tempFilenamePrefix}.%(ext)s`);

    console.log(`[Server] Resolving download file: ${finalFilename}`);

    // Build quality / format specific yt-dlp arguments
    let ytdlArgs = ['--no-check-certificate', '-o', tempOutputPathTemplate];

    if (format === 'mp3') {
      // Audio download conversion arguments
      ytdlArgs.push('-f', 'ba', '-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else {
      // Video quality capping arguments
      let formatSelector = 'bv*+ba/b'; // default 'best'
      
      if (quality === '1080') {
        formatSelector = 'bv*[height<=1080]+ba/b[height<=1080]';
      } else if (quality === '720') {
        formatSelector = 'bv*[height<=720]+ba/b[height<=720]';
      } else if (quality === '480') {
        formatSelector = 'bv*[height<=480]+ba/b[height<=480]';
      } else if (quality === '360') {
        formatSelector = 'bv*[height<=360]+ba/b[height<=360]';
      }
      
      ytdlArgs.push('-f', formatSelector);
    }

    ytdlArgs.push(videoUrl);

    // Step 2: Spawn yt-dlp process to download the file to the temp folder
    console.log(`[Server] Spawning download process: yt-dlp ${ytdlArgs.join(' ')}`);
    const downloadProcess = spawn('yt-dlp', ytdlArgs);

    downloadProcess.stderr.on('data', (data) => {
      const logLine = data.toString().trim();
      if (logLine) {
        console.log(`[yt-dlp] ${logLine}`);
      }
    });

    downloadProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Server] yt-dlp exited with error code: ${code}`);
        if (!res.headersSent) {
          return res.status(500).json({ error: 'Download process failed on server.' });
        }
      }

      // Step 3: Find the completed file in the temp directory matching the prefix
      try {
        const files = fs.readdirSync(tempDir);
        const actualTempFile = files.find(f => f.startsWith(tempFilenamePrefix));

        if (!actualTempFile) {
          throw new Error('Download file was not created by backend');
        }

        const actualTempFilePath = path.join(tempDir, actualTempFile);

        // Adjust filename if yt-dlp created a format different than expected
        const actualExt = path.extname(actualTempFile);
        if (actualExt && actualExt !== finalExtension) {
          finalFilename = `${cleanTitle}${actualExt}`;
        }

        console.log(`[Server] Download complete. Streaming file to client: ${actualTempFilePath}`);

        // Set response headers
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFilename)}"`);
        
        let contentType = 'video/mp4';
        if (actualExt === '.mp3') contentType = 'audio/mpeg';
        else if (actualExt === '.webm') contentType = 'video/webm';
        res.setHeader('Content-Type', contentType);

        // Stream the completed file from disk and delete it immediately after
        res.sendFile(actualTempFilePath, (err) => {
          if (err) {
            console.error(`[Server] Error transferring file: ${err.message}`);
          }
          
          // Cleanup file from disk
          fs.unlink(actualTempFilePath, (unlinkErr) => {
            if (unlinkErr) console.error(`[Server] Failed to delete temp file: ${unlinkErr.message}`);
            else console.log(`[Server] Cleaned up temporary file: ${actualTempFilePath}`);
          });
        });

      } catch (err) {
        console.error(`[Server] File resolution error: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: 'File formatting error' });
        }
      }
    });

    downloadProcess.on('error', (err) => {
      console.error(`[Server] Error starting download: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to start downloader backend' });
      }
    });

    // Clean up if user closes the connection early
    req.on('close', () => {
      // If the process is still running, kill it
      if (downloadProcess.exitCode === null) {
        console.log('[Server] Client cancelled connection. Terminating process.');
        downloadProcess.kill('SIGINT');
      }
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
