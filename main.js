
const { spawn } = require("node:child_process");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");

// ======================================================
// 1. CONFIGURATION
// ======================================================
// Pass the playlist URL as a command-line argument.
// "https://www.youtube.com/playlist?list=PLK5U0tyd34tCW_i1rdy2uwHRxy2RkZ_GI"
// "https://www.youtube.com/playlist?list=PL1BztTYDF-QPfrzXwoC_6OSLs818uAqN2"
// "https://www.youtube.com/playlist?list=PLRAV69dS1uWQGDQoBYMZWKjzuhCaOnBpa"
// "https://www.youtube.com/playlist?list=PLBz0Y_rVMoZi4vEI7jecAXo5H4vHDa1kV"
// Example: node main.js "https://www.youtube.com/playlist?list=abcdefghijklmnopqrstuvwxyz"
const playlistOrVideoUrl = process.argv[2];

// Where downloaded videos will be stored.
const outputDir = path.join(
  os.homedir(),
  "Videos",
  "YouTube-Playlist",
  "angular"
);

// Location of yt-dlp.exe downloaded on Windows.
// Change this if you installed yt-dlp somewhere else.
// If yt-dlp is already in Windows PATH, use "yt-dlp".
const ytDlpPath = path.join(
  os.homedir(),
  "yt-dlp",
  "yt-dlp.exe"
);

// Optional: Set this to the folder containing ffmpeg.exe
// and ffprobe.exe if FFmpeg is not available in Windows PATH.
// Example: path.join(__dirname, "ffmpeg", "bin")
// Leave empty if FFmpeg is already in PATH.
const ffmpegLocation = "";

// ======================================================
// 2. INPUT VALIDATION
// ======================================================


// Validate that a URL was provided.
if (!playlistOrVideoUrl) {
  console.error(
    'Usage: node main.js "YOUTUBE_VIDEO_OR_PLAYLIST_URL"'
  );
  process.exit(1);
}

// Make sure yt-dlp executable exists.
if (
  ytDlpPath !== "yt-dlp" &&
  !fs.existsSync(ytDlpPath)
) {
  console.error("yt-dlp.exe not found at:", ytDlpPath);
  console.error("Update ytDlpPath or add yt-dlp to Windows PATH.");
  process.exit(1);
}

// ======================================================
// 3. CREATE OUTPUT DIRECTORY
// ======================================================

// Create the download folder automatically if it doesn't exist.
fs.mkdirSync(outputDir, { recursive: true });

// ======================================================
// 4. YT-DLP ARGUMENTS
// ======================================================

const args = [

  // ----------------------------------------------------
  // VIDEO AND AUDIO QUALITY
  // ----------------------------------------------------

  // Best video up to 1080p + best available audio.
  // If separate streams are unavailable, use the best
  // combined video/audio format up to 1080p.
  "--format",
  "bv[height<=1080]+ba/b[height<=1080]",

  // Force the final video container to MKV.
  // FFmpeg performs the merge/remux operation.
  "--merge-output-format",
  "mkv",

  // to delete the temporary video-only file after successfully merging video and audio using FFmpeg.
  "--no-keep-video",

  // Ensure the final output is MKV, including fallback formats.
  "--remux-video",
  "mkv",

  // ----------------------------------------------------
  // SUBTITLES
  // ----------------------------------------------------

  // Download manually uploaded subtitles when available.
  "--write-subs",

  // Also download automatically generated subtitles.
  "--write-auto-subs",

  // Download English and Hindi subtitles.
  "--sub-langs",
  "en.*,hi.*",

  // Convert downloaded subtitle files into SRT format.
  "--convert-subs",
  "srt",

  // ----------------------------------------------------
  // PLAYLIST HANDLING
  // ----------------------------------------------------

  // Continue downloading even if one video fails.
  "--ignore-errors",

  // Explicitly treat the URL as a playlist.
  "--yes-playlist",

  // Store downloaded video IDs in an archive file.
  // On the next run, already downloaded videos are skipped.
  "--download-archive",
  path.join(outputDir, "downloaded.txt"),

  // ----------------------------------------------------
  // FILE NAMING
  // ----------------------------------------------------

  // Prefix every video with its playlist position.
  // Example: 001 - Introduction.mkv
  "--output",
  "%(playlist_index)03d - %(title)s.%(ext)s",

  // Replace characters that Windows doesn't allow in filenames.
  "--windows-filenames",

  // Save videos and subtitles in the specified directory.
  "--paths",
  outputDir,

  // ----------------------------------------------------
  // DOWNLOAD PROGRESS
  // ----------------------------------------------------

  // Print progress on separate lines in the terminal.
  "--newline",

  // Display download errors and other useful messages.
  "--verbose"
];

// ======================================================
// 5. FFMPEG CONFIGURATION
// ======================================================

// Tell yt-dlp where FFmpeg is if it isn't already in PATH.
// This must point to the folder containing ffmpeg.exe.
if (ffmpegLocation) {
  args.push("--ffmpeg-location", ffmpegLocation);
}

// Add the playlist URL at the end of the arguments.
args.push(playlistOrVideoUrl);

// ======================================================
// 6. START DOWNLOAD
// ======================================================

console.log("==================================");
console.log("YouTube Playlist Downloader");
console.log("==================================");

console.log("Playlist URL:", playlistOrVideoUrl);
console.log("Download folder:", outputDir);
console.log("Starting download...\n");

// Start yt-dlp as a child process.
// stdio: inherit displays yt-dlp's progress directly
// in the current PowerShell terminal.
const downloader = spawn(ytDlpPath, args, {
  stdio: "inherit",
  windowsHide: true
});

// ======================================================
// 7. ERROR HANDLING
// ======================================================

// Handle errors when Windows cannot start yt-dlp.
downloader.on("error", (err) => {
  console.error("\nCould not start yt-dlp:", err.message);
  process.exitCode = 1;
});

// ======================================================
// 8. DOWNLOAD COMPLETION
// ======================================================

// Handle the process exit event.
downloader.on("close", (code) => {

  if (code === 0) {
    console.log("\nPlaylist download completed successfully!");
    console.log("Saved at:", outputDir);

  } else {
    console.error(
      `\nyt-dlp exited with code ${code}. Check the errors above.`
    );

    process.exitCode = code || 1;
  }
});
