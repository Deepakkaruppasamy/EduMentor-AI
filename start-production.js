const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

console.log("Starting ChromaDB...");

// Create data directory
if (!fs.existsSync('/app/chromadb_data')) {
  fs.mkdirSync('/app/chromadb_data', { recursive: true });
}

// Start ChromaDB process
const chroma = spawn('python3', [
  '-m', 'chromadb.cli.cli', 'run',
  '--host', '127.0.0.1',
  '--port', '8000',
  '--path', '/app/chromadb_data'
]);

chroma.stdout.on('data', (data) => {
  console.log(`[ChromaDB] ${data.toString().trim()}`);
});

chroma.stderr.on('data', (data) => {
  console.error(`[ChromaDB Error] ${data.toString().trim()}`);
});

chroma.on('close', (code) => {
  console.log(`[ChromaDB] Process exited with code ${code}`);
  if (code !== 0 && code !== null) {
    process.exit(code);
  }
});

// Function to check ChromaDB heartbeat
function checkHeartbeat(retries = 30) {
  if (retries === 0) {
    console.error("❌ ChromaDB failed to start (heartbeat timeout).");
    process.exit(1);
  }

  http.get('http://127.0.0.1:8000/api/v1/heartbeat', (res) => {
    if (res.statusCode === 200) {
      console.log("ChromaDB is up!");
      startExpress();
    } else {
      setTimeout(() => checkHeartbeat(retries - 1), 1000);
    }
  }).on('error', () => {
    setTimeout(() => checkHeartbeat(retries - 1), 1000);
  });
}

console.log("Waiting for ChromaDB to start...");
checkHeartbeat();

function startExpress() {
  console.log("Starting EduMentor Express backend...");
  const expressProc = spawn('node', ['backend/dist/server.js'], {
    stdio: 'inherit'
  });

  expressProc.on('close', (code) => {
    console.log(`[Express] Process exited with code ${code}`);
    process.exit(code);
  });
}
