// Elements
const loadingDiv = document.getElementById('loading');
const startBtn = document.getElementById('start');
const gameDiv = document.getElementById('game');
const canvas = document.getElementById('canvas');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearButton = document.getElementById('clearButton');
const guessInput = document.getElementById('guessInput');
const submitGuess = document.getElementById('submitGuess');
const playerList = document.getElementById('playerList');
const timer = document.getElementById('timer');

// Drawing state
let drawing = false, prevX = 0, prevY = 0;
let color = colorPicker.value;
let size = parseInt(brushSize.value, 10);

// Game state
let word = "", words = [], score = 0, timeLeft = 30, timerInterval;
let peer = null, peerId = null, connections = [];
let currentPlayers = [];

// ---- PeerJS Setup ----
peer = new Peer(undefined, {
    host: 'peerjs.com',
    port: 9000,
    path: '/peerjs',
    secure: true
});
peer.on('open', id => {
    peerId = id;
    startBtn.textContent = `Start as ${id}`;
    startBtn.disabled = false;
});

startBtn.onclick = startGame;

function startGame() {
    loadingDiv.classList.add('hidden');
    gameDiv.classList.remove('hidden');
    // Fetch random words
    fetch('https://random-word-api.herokuapp.com/word?number=10')
    .then(res => res.json())
    .then(data => {
        words = data;
        nextRound();
    });
    // Try to connect to other peers
    peer.listAllPeers(peerIds => {
        for (const id of peerIds) {
            if (id !== peerId) connectToPeer(id);
        }
    });
}

function connectToPeer(id) {
    const conn = peer.connect(id);
    connections.push(conn);
    conn.on('open', () => {
        conn.send({type: 'join', from: peerId});
    });
    // Add further handling for multiplayer expansion if needed
}

// ---- Drawing ----
canvas.width = canvas.offsetWidth;
canvas.height = 400;
const ctx = canvas.getContext('2d');

canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    [prevX, prevY] = [e.offsetX, e.offsetY];
});
canvas.addEventListener('mouseup', () => drawing = false);
canvas.addEventListener('mouseleave', () => drawing = false);
canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.stroke();
    [prevX, prevY] = [e.offsetX, e.offsetY];
});

colorPicker.oninput = e => color = e.target.value;
brushSize.oninput = e => size = parseInt(e.target.value, 10);
clearButton.onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

// ---- Timer, Rounds, & Score ----
function nextRound() {
    if (words.length === 0) return endGame();
    word = words.pop();
    guessInput.value = "";
    timeLeft = 30;
    timer.textContent = `Time: ${timeLeft}`;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timer.textContent = `Time: ${timeLeft}`;
        if (timeLeft <= 0) nextRound();
    }, 1000);
}

// ---- Guess Handling ----
submitGuess.onclick = () => {
    if (guessInput.value.trim().toLowerCase() === word) {
        score += 10;
        nextRound();
    } else if (guessInput.value.trim().toLowerCase() === "reveal the egg") {
        alert("🥚 You found the Easter egg! 🥚");
    } else {
        alert('Incorrect!');
    }
}

// ---- Player List (basic offline for now) ----
function updatePlayers() {
    playerList.innerHTML = `<li>Player: ${peerId}</li>`;
}
setInterval(updatePlayers, 2000);

// ---- End Game ----
function endGame() {
    clearInterval(timerInterval);
    alert(`Game Over! Final Score: ${score}`);
    gameDiv.classList.add('hidden');
    loadingDiv.classList.remove('hidden');
    guessInput.value = "";
}

window.onload = () => {
    updatePlayers();
};
