import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { calculateScore, hasPossibleMoves, isScoringSelection, SCORING_RULES } from './public/rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for Discord Activity & Testing
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});

app.use(express.json());
// Serve static files
app.use(express.static(join(__dirname, 'public')));

app.post('/api/token', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).send('No code provided');

        const response = await fetch(`https://discord.com/api/oauth2/token`, {
            method: 'POST',
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID || '1317075677927768074',
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Discord OAuth Error:', text);
            return res.status(response.status).send(text);
        }

        const data = await response.json();
        res.json({ access_token: data.access_token });
    } catch (error) {
        console.error('Token Exchange Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

class GameState {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.players = []; // { id, name, score, connected }
        this.currentPlayerIndex = 0;

        // Turn State
        this.roundAccumulatedScore = 0;
        this.diceCountToRoll = 6;
        this.currentDice = []; // { id, value, selected }
        this.isFinalRound = false;
        this.finalRoundTriggeredBy = null;

        this.gameStatus = 'waiting'; // waiting, playing, finished
        this.winner = null;
    }

    reset() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.roundAccumulatedScore = 0;
        this.diceCountToRoll = 6;
        this.currentDice = [];
        this.isFinalRound = false;
        this.finalRoundTriggeredBy = null;
        this.gameStatus = 'waiting';
        this.winner = null;
        this.hostId = null;
    }

    addPlayer(id, name) {
        if (this.players.length >= 5) return false;
        this.players.push({ id, name, score: 0, connected: true });
        if (!this.hostId) this.hostId = id;
        return true;
    }

    removePlayer(id) {
        const idx = this.players.findIndex(p => p.id === id);
        if (idx === -1) return false;

        const wasCurrentTurn = (idx === this.currentPlayerIndex);

        // Remove player
        this.players.splice(idx, 1);

        // Adjust index
        if (idx < this.currentPlayerIndex) {
            this.currentPlayerIndex--;
        } else if (idx === this.currentPlayerIndex) {
            // We removed the current player. The index now points to the *next* player (because array shifted left).
            // We just need to wrap it if it went out of bounds.
            if (this.currentPlayerIndex >= this.players.length) {
                this.currentPlayerIndex = 0;
            }

            // If the game was playing, we need to reset the round state for the "new" current player
            if (this.gameStatus === 'playing' && this.players.length > 0) {
                this.resetRound();
            }
        }

        // Host Migration
        if (this.hostId === id) {
            this.hostId = this.players.length > 0 ? this.players[0].id : null;
        }

        return wasCurrentTurn; // Return true if we need to notify about turn change
    }

    start() {
        if (this.players.length >= 2) {
            this.gameStatus = 'playing';
            this.currentPlayerIndex = 0;
            this.resetRound();
            return true;
        }
        return false;
    }

    forceNextTurn() {
        this.roundAccumulatedScore = 0;
        this.nextTurn();
    }

    // ... existing resetRound ... 
    resetRound() {
        this.roundAccumulatedScore = 0;
        this.diceCountToRoll = 6;
        this.currentDice = [];
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    // ... existing roll ...
    roll(playerId) {
        if (this.gameStatus !== 'playing') return { error: "Game not active" };
        if (this.getCurrentPlayer().id !== playerId) return { error: "Not your turn" };

        let scoreFromSelection = 0;
        if (this.currentDice.length > 0) {
            const selected = this.currentDice.filter(d => d.selected);
            if (selected.length === 0) return { error: "Must select dice to re-roll" };

            // Validate selection
            const values = selected.map(d => d.value);
            if (!isScoringSelection(values)) return { error: "Invalid selection" };

            scoreFromSelection = calculateScore(values);
            this.roundAccumulatedScore += scoreFromSelection;

            const remaining = this.currentDice.length - selected.length;
            if (remaining === 0) {
                this.diceCountToRoll = 6;
            } else {
                this.diceCountToRoll = remaining;
            }
        } else {
            if (this.currentDice.length === 0) this.diceCountToRoll = 6;
        }

        // Perform Roll
        const newDice = [];
        for (let i = 0; i < this.diceCountToRoll; i++) {
            newDice.push({
                id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                value: Math.floor(Math.random() * 6) + 1,
                selected: false
            });
        }
        this.currentDice = newDice;

        // Check Farkle
        const rolledValues = newDice.map(d => d.value);
        let farkle = false;
        if (!hasPossibleMoves(rolledValues)) {
            farkle = true;
        }

        return {
            success: true,
            dice: newDice,
            farkle,
            roundScore: this.roundAccumulatedScore,
            hotDice: (scoreFromSelection > 0 && this.diceCountToRoll === 6)
        };
    }

    // ... existing toggleSelection ...
    toggleSelection(playerId, dieId) {
        if (this.gameStatus !== 'playing') return;
        if (this.getCurrentPlayer().id !== playerId) return;

        const die = this.currentDice.find(d => d.id == dieId);
        if (die) {
            die.selected = !die.selected;
        }
        return true;
    }

    // ... existing bank ...
    bank(playerId) {
        if (this.gameStatus !== 'playing') return;
        if (this.getCurrentPlayer().id !== playerId) return;

        const selected = this.currentDice.filter(d => d.selected);
        const values = selected.map(d => d.value);

        let scoreToAdd = 0;
        if (selected.length > 0) {
            if (isScoringSelection(values)) {
                scoreToAdd = calculateScore(values);
            } else {
                return { error: "Invalid selection" };
            }
        } else if (this.currentDice.length > 0 && this.roundAccumulatedScore === 0) {
            return { error: "Cannot bank 0" };
        }

        this.roundAccumulatedScore += scoreToAdd;
        this.players[this.currentPlayerIndex].score += this.roundAccumulatedScore;

        this.checkWinCondition();

        if (this.gameStatus !== 'finished') {
            this.nextTurn();
        }

        return { success: true };
    }

    // ... existing farkle ...
    farkle() {
        this.roundAccumulatedScore = 0;
        this.nextTurn();
    }

    // ... existing nextTurn ...
    nextTurn() {
        if (this.players.length === 0) return;
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.resetRound();

        if (this.isFinalRound) {
            if (this.currentPlayerIndex === this.finalRoundTriggeredBy) {
                this.endGame();
            }
        }
    }

    checkWinCondition() {
        const p = this.players[this.currentPlayerIndex];
        if (p.score >= 10000 && !this.isFinalRound) {
            this.isFinalRound = true;
            this.finalRoundTriggeredBy = this.currentPlayerIndex;
        }
    }

    endGame() {
        this.gameStatus = 'finished';
        // Simple winner determination
        const sorted = [...this.players].sort((a, b) => b.score - a.score);
        this.winner = sorted[0];
        // Handle ties? 
        if (sorted.length > 1 && sorted[0].score === sorted[1].score) {
            this.winner = 'tie';
        }
    }

    getState() {
        return {
            roomCode: this.roomCode,
            players: this.players,
            currentPlayerIndex: this.currentPlayerIndex,
            roundAccumulatedScore: this.roundAccumulatedScore,
            diceCountToRoll: this.diceCountToRoll,
            currentDice: this.currentDice,
            gameStatus: this.gameStatus,
            winner: this.winner,
            isFinalRound: this.isFinalRound,
            hostId: this.hostId
        };
    }
}

// Initialize 5 fixed rooms
const games = new Map();
const ROOM_NAMES = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5'];

ROOM_NAMES.forEach(name => {
    games.set(name, new GameState(name));
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial room list
    socket.emit('room_list', getRoomList());

    socket.on('get_room_list', () => {
        socket.emit('room_list', getRoomList());
    });

    socket.on('join_game', ({ roomCode, playerName }) => {
        let game = games.get(roomCode);

        if (!game) {
            socket.emit('error', 'Invalid Room');
            return;
        }

        // Reconnect logic or new player
        let existingPlayer = game.players.find(p => p.name === playerName);

        // Strict: If name exists, reject it unless it's a true reconnect (which we don't have distinct auth for yet)
        // With Discord Names, collisions should be rare unless same user
        // Simplified Logic: Just add new player unless room full.

        if (game.players.length >= 5) {
            socket.emit('error', 'Room Full');
            return;
        }

        if (existingPlayer) {
            // If player exists, we update their ID to the new socket (reconnect)
            existingPlayer.id = socket.id;
            existingPlayer.connected = true;
        } else {
            if (!game.addPlayer(socket.id, playerName)) {
                socket.emit('error', 'Room Full');
                return;
            }
        }

        socket.join(roomCode);
        socket.emit('joined', { playerId: socket.id, state: game.getState() });
        io.to(roomCode).emit('game_state_update', game.getState());

        // Broadcast updated room list to everyone in lobby
        io.emit('room_list', getRoomList());
    });

    // FORCE NEXT TURN
    socket.on('force_next_turn', ({ roomCode }) => {
        const game = games.get(roomCode);
        if (!game) return;

        if (game.hostId !== socket.id) {
            socket.emit('error', 'Only the host can force a turn skip.');
            return;
        }

        game.forceNextTurn();
        io.to(roomCode).emit('game_state_update', game.getState());
        io.to(roomCode).emit('message', { type: 'system', text: 'Host forced next turn.' });
    });

    socket.on('start_game', ({ roomCode }) => {
        const game = games.get(roomCode);
        if (game && game.players.length >= 2) {
            game.start();
            io.to(roomCode).emit('game_start', game.getState());
            io.emit('room_list', getRoomList());
        }
    });

    socket.on('leave_game', () => {
        handleDisconnect(socket);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        handleDisconnect(socket);
    });

    // START: Roll/Bank/Toggle events (These were correct, just ensuring they use the class methods)
    socket.on('roll', ({ roomCode }) => {
        const game = games.get(roomCode);
        if (!game) return;
        const result = game.roll(socket.id);
        if (result.error) {
            socket.emit('error', result.error);
        } else {
            io.to(roomCode).emit('roll_result', {
                dice: result.dice,
                farkle: result.farkle,
                hotDice: result.hotDice,
                state: game.getState()
            });
            if (result.farkle) {
                setTimeout(() => {
                    game.farkle();
                    io.to(roomCode).emit('game_state_update', game.getState());
                }, 2000);
            }
        }
    });

    socket.on('toggle_die', ({ roomCode, dieId }) => {
        const game = games.get(roomCode);
        if (game) {
            game.toggleSelection(socket.id, dieId);
            io.to(roomCode).emit('game_state_update', game.getState());
        }
    });

    socket.on('bank', ({ roomCode }) => {
        const game = games.get(roomCode);
        if (game) {
            const res = game.bank(socket.id);
            if (!res || res.error) {
                socket.emit('error', res ? res.error : 'Bank failed');
            } else {
                io.to(roomCode).emit('game_state_update', game.getState());
            }
        }
    });

    socket.on('restart', ({ roomCode }) => {
        const game = games.get(roomCode);
        if (game && game.gameStatus === 'finished') {
            // Reset logic needs to be a method to be clean, but existing listener inline was fine.
            // Let's use the game state logic.
            game.reset(); // Wait, reset empties players. We just want to restart match.
            // Custom restart logic:
            game.gameStatus = 'playing';
            game.players.forEach(p => p.score = 0);
            game.currentPlayerIndex = 0;
            game.resetRound();
            game.isFinalRound = false;
            game.winner = null;
            io.to(roomCode).emit('game_start', game.getState());
        }
    });
});

function handleDisconnect(socket) {
    for (const game of games.values()) {
        if (game.removePlayer(socket.id)) {
            // If removePlayer returned true, it means the turn changed or something significant happened
            io.to(game.roomCode).emit('game_state_update', game.getState());
        } else {
            // Just a regular update if a non-active player left
            io.to(game.roomCode).emit('game_state_update', game.getState());
        }

        socket.leave(game.roomCode);

        if (game.players.length === 0) {
            game.reset();
        }
    }
    io.emit('room_list', getRoomList());
}

function getRoomList() {
    return Array.from(games.values()).map(g => ({
        name: g.roomCode,
        count: g.players.filter(p => p.connected).length,
        max: 5,
        status: g.gameStatus
    }));
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
