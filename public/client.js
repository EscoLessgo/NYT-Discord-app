import { calculateScore } from './rules.js';
import { DiscordSDK } from "@discord/embedded-app-sdk";

console.log("Farkle Client Script Loaded");
const DISCORD_CLIENT_ID = '1317075677927768074';

class FarkleClient {
    constructor() {
        this.socket = io({
            reconnectionAttempts: 5
        });
        this.roomCode = null;
        this.playerId = null;
        this.gameState = null;
        this.discordSdk = null;
        this.playerName = null;

        // UI Elements
        this.ui = {
            app: document.getElementById('app'),
            diceContainer: document.getElementById('dice-container'),
            rollBtn: document.getElementById('roll-btn'),
            bankBtn: document.getElementById('bank-btn'),
            playerZonesContainer: document.getElementById('player-zones-container'),
            actionText: document.getElementById('action-text'),
            currentScoreDisplay: document.getElementById('current-score-display'),
            feedback: document.getElementById('feedback-message'),
            rulesBtn: document.getElementById('rules-btn'),
            rulesModal: document.getElementById('rules-modal'),
            setupModal: document.getElementById('setup-modal'),
            gameOverModal: document.getElementById('game-over-modal'),
            playerNameInput: document.getElementById('player-name-input'),
            roomCodeInput: document.getElementById('room-code-input'),
            winnerText: document.getElementById('winner-text'),
            endP1Name: document.getElementById('end-p1-name'),
            endP1Score: document.getElementById('end-p1-score'),
            endP2Name: document.getElementById('end-p2-name'),
            endP2Score: document.getElementById('end-p2-score'),
            restartBtn: document.getElementById('restart-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            diceThemeSelect: document.getElementById('dice-theme-select'),
            themeBtns: document.querySelectorAll('.theme-btn')
        };

        this.initListeners();
        this.initSettings();
        this.initBackgroundDice();
        this.initDiscordSafe();
        this.initSocketEvents();

        this.debugLog(`Client Init. Host: ${window.location.host}`);
    }

    debugLog(msg) {
        // console.log(`[Debug] ${msg}`);
    }

    // ... Settings omitted for brevity, keeping standard logic ...
    initSettings() {
        this.ui.settingsBtn.addEventListener('click', () => this.ui.settingsModal.classList.remove('hidden'));
        this.ui.settingsModal.querySelector('.close-modal').addEventListener('click', () => this.ui.settingsModal.classList.add('hidden'));

        this.ui.themeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                let color = '#0f3d24';
                if (theme === 'blue') color = '#0f172a';
                if (theme === 'red') color = '#450a0a';
                if (theme === 'purple') color = '#3b0764';

                document.body.style.setProperty('--felt-color', color);

                this.ui.themeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                localStorage.setItem('farkle-theme', theme);
            });
        });

        this.ui.diceThemeSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            document.body.setAttribute('data-dice-theme', val);
            localStorage.setItem('farkle-dice-theme', val);
        });

        const savedTheme = localStorage.getItem('farkle-theme');
        if (savedTheme) {
            const btn = document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`);
            if (btn) btn.click();
        }
        const savedDice = localStorage.getItem('farkle-dice-theme');
        if (savedDice) {
            this.ui.diceThemeSelect.value = savedDice;
            document.body.setAttribute('data-dice-theme', savedDice);
        }
    }

    initBackgroundDice() {
        const container = document.getElementById('bg-dice-container');
        if (!container) return;
        const dieChars = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        for (let i = 0; i < 15; i++) {
            const el = document.createElement('div');
            el.classList.add('bg-die');
            el.textContent = dieChars[Math.floor(Math.random() * 6)];
            el.style.left = Math.random() * 100 + '%';
            el.style.animationDuration = (20 + Math.random() * 30) + 's';
            el.style.animationDelay = (Math.random() * -30) + 's';
            el.style.fontSize = (24 + Math.random() * 40) + 'px';
            el.style.opacity = 0.1 + Math.random() * 0.1;
            container.appendChild(el);
        }
    }

    async initDiscordSafe() {
        try {
            this.discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
            await this.discordSdk.ready();

            const { code } = await this.discordSdk.commands.authorize({
                client_id: DISCORD_CLIENT_ID,
                response_type: "code",
                state: "",
                prompt: "none",
                scope: ["identify", "rpc.activities.write"],
            });

            const response = await fetch("/api/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const { access_token } = await response.json();

            const auth = await this.discordSdk.commands.authenticate({ access_token });
            if (auth == null) throw new Error("Authenticate command failed");

            console.log("Discord SDK Authenticated", auth);

            if (auth.user) {
                this.playerName = auth.user.global_name || auth.user.username;

                // Hide name input
                const inputGroup = this.ui.playerNameInput.closest('.input-group');
                if (inputGroup) inputGroup.style.display = 'none';

                this.ui.playerNameInput.value = this.playerName;
                this.showFeedback(`Welcome, ${this.playerName}!`, "success");
            }

        } catch (e) {
            console.warn("Discord SDK Init failed:", e);
        }
    }

    async updateDiscordPresence(details, state) {
        if (!this.discordSdk) return;
        try {
            await this.discordSdk.commands.setActivity({
                activity: {
                    details: details,
                    state: state,
                    assets: {
                        large_image: "farkle_icon",
                        large_text: "Farkle"
                    }
                }
            });
        } catch (e) { }
    }

    initListeners() {
        this.ui.rollBtn.addEventListener('click', () => {
            if (this.canInteract()) this.socket.emit('roll', { roomCode: this.roomCode });
        });

        this.ui.bankBtn.addEventListener('click', () => {
            if (this.canInteract()) this.socket.emit('bank', { roomCode: this.roomCode });
        });

        this.ui.diceContainer.addEventListener('click', (e) => {
            const dieEl = e.target.closest('.die');
            if (dieEl && this.canInteract()) {
                const id = dieEl.dataset.id;
                this.socket.emit('toggle_die', { roomCode: this.roomCode, dieId: id });
            }
        });

        this.ui.rulesBtn.addEventListener('click', () => this.ui.rulesModal.classList.remove('hidden'));
        this.ui.rulesModal.querySelector('.close-modal').addEventListener('click', () => this.ui.rulesModal.classList.add('hidden'));

        this.ui.restartBtn.addEventListener('click', () => {
            this.socket.emit('restart', { roomCode: this.roomCode });
            this.ui.gameOverModal.classList.add('hidden');
        });

        // Host Force Turn Listener
        document.body.addEventListener('click', (e) => {
            if (e.target.id === 'force-turn-btn') {
                if (confirm('Force skip current player?')) {
                    this.socket.emit('force_next_turn', { roomCode: this.roomCode });
                }
            }
        });
    }

    initSocketEvents() {
        this.socket.on('connect', () => {
            this.showFeedback("Connected!", "success");
            this.socket.emit('get_room_list');
            if (this.roomCode && this.playerName) {
                this.socket.emit('join_game', { roomCode: this.roomCode, playerName: this.playerName });
            }
        });

        this.socket.on('connect_error', (err) => {
            const container = document.getElementById('room-list-container');
            if (container && container.innerText.includes('Loading')) {
                container.innerHTML = `<p style="color:var(--danger)">Connection Failed. <button class="btn secondary" onclick="location.reload()">Retry</button></p>`;
            }
            this.showFeedback("Connection Error!", "error");
        });

        this.socket.on('room_list', (rooms) => this.renderRoomList(rooms));
        this.socket.on('disconnect', () => this.showFeedback("Connection Lost!", "error"));

        this.socket.on('joined', ({ playerId, state }) => {
            this.playerId = playerId;
            this.updateGameState(state);
            this.ui.setupModal.classList.add('hidden');
            this.showFeedback("Joined Room!", "success");
        });

        this.socket.on('game_state_update', (state) => this.updateGameState(state));
        this.socket.on('game_start', (state) => {
            this.updateGameState(state);
            this.showFeedback("Game Started!", "success");
        });

        this.socket.on('roll_result', (data) => {
            const diceToRoll = Array.isArray(data.dice) ? data.dice : [];
            this.animateRoll(diceToRoll).finally(() => {
                this.updateGameState(data.state);
                if (data.farkle) this.showFeedback("FARKLE!", "error");
                if (data.hotDice) this.showFeedback("HOT DICE!", "hot-dice");
            });
        });

        this.socket.on('message', (msg) => {
            if (msg.type === 'system') this.showFeedback(msg.text, 'info');
        });

        this.socket.on('error', (msg) => {
            if (msg.includes("Game not active") || msg.includes("Room")) {
                this.showFeedback(msg, "error");
            } else {
                alert(msg);
            }
        });
    }

    renderRoomList(rooms) {
        let container = document.getElementById('room-list-container');
        if (!container) {
            const parent = this.ui.setupModal.querySelector('.modal-content');
            container = document.createElement('div');
            container.id = 'room-list-container';
            container.className = 'room-grid';
            const existing = parent.querySelector('#room-list-container');
            if (existing) existing.replaceWith(container);
            else parent.appendChild(container);
        }

        container.innerHTML = '';
        rooms.forEach(room => {
            const card = document.createElement('div');
            card.className = `room-card ${room.count >= room.max ? 'full' : ''}`;
            card.innerHTML = `<h3>${room.name}</h3><div class="room-status">${room.count} / ${room.max} Players${room.status === 'playing' ? ' (In Progress)' : ''}</div>`;
            if (room.count < room.max || (room.count >= room.max && room.status === 'waiting')) {
                card.onclick = () => this.joinRoom(room.name);
            }
            container.appendChild(card);
        });
    }

    joinRoom(roomCode) {
        let name = this.playerName;
        if (!name) {
            name = this.ui.playerNameInput.value.trim() || 'Player ' + Math.floor(Math.random() * 1000);
        }
        this.roomCode = roomCode;
        this.playerName = name;
        this.socket.emit('join_game', { roomCode: roomCode, playerName: name });
    }

    canInteract() {
        if (!this.gameState || this.gameState.gameStatus !== 'playing' || !this.socket) return false;
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        return currentPlayer && currentPlayer.id === this.socket.id;
    }

    renderControls() {
        if (!this.gameState) return;

        // Force Turn Button
        let forceBtn = document.getElementById('force-turn-btn');
        const isHost = this.gameState.hostId === this.socket.id;

        if (isHost) {
            if (!forceBtn) {
                forceBtn = document.createElement('button');
                forceBtn.id = 'force-turn-btn';
                forceBtn.className = 'btn danger small';
                forceBtn.style.position = 'absolute';
                forceBtn.style.top = '10px';
                forceBtn.style.right = '10px';
                forceBtn.style.fontSize = '0.7rem';
                forceBtn.style.padding = '5px 10px';
                forceBtn.textContent = 'FORCE NEXT TURN';
                // Find header safely
                const header = document.querySelector('.game-header');
                if (header) header.appendChild(forceBtn);
            }
            forceBtn.style.display = 'block';
        } else if (forceBtn) {
            forceBtn.style.display = 'none';
        }

        // Waiting State
        if (this.gameState.gameStatus === 'waiting') {
            this.ui.currentScoreDisplay.textContent = "Waiting for players...";
            this.ui.rollBtn.style.display = 'none';
            this.ui.bankBtn.style.display = 'none';

            let startBtn = document.getElementById('lobby-start-btn');
            if (!startBtn) {
                startBtn = document.createElement('button');
                startBtn.id = 'lobby-start-btn';
                startBtn.className = 'btn primary';
                startBtn.textContent = 'Start Game';
                startBtn.onclick = () => this.socket.emit('start_game', { roomCode: this.roomCode });
                if (this.ui.rollBtn.parentElement) this.ui.rollBtn.parentElement.appendChild(startBtn);
            }

            if (this.gameState.players.length >= 2) {
                startBtn.style.display = 'block';
                startBtn.disabled = !isHost;
                this.ui.actionText.textContent = isHost ? "Ready to start!" : "Waiting for host...";
            } else {
                startBtn.style.display = 'block';
                startBtn.disabled = true;
                this.ui.actionText.textContent = `Need ${2 - this.gameState.players.length} more players`;
            }
            return;
        }

        // Playing State
        const startBtn = document.getElementById('lobby-start-btn');
        if (startBtn) startBtn.style.display = 'none';

        this.ui.rollBtn.style.display = 'inline-block';
        this.ui.bankBtn.style.display = 'inline-block';

        const isMyTurn = this.canInteract();
        const selectedDice = this.gameState.currentDice.filter(d => d.selected);
        const selectedScore = calculateScore(selectedDice.map(d => d.value));
        const totalRound = this.gameState.roundAccumulatedScore + selectedScore;

        this.ui.currentScoreDisplay.textContent = `Selection: ${selectedScore} (Round: ${totalRound})`;

        if (!isMyTurn) {
            this.ui.rollBtn.disabled = true;
            this.ui.bankBtn.disabled = true;
            const currentPlayerName = this.gameState.players[this.gameState.currentPlayerIndex]?.name || "Someone";
            this.ui.actionText.textContent = `Waiting for ${currentPlayerName}...`;
            this.ui.rollBtn.textContent = 'Roll';
        } else {
            this.ui.actionText.textContent = "Your turn";
            if (this.gameState.currentDice.length === 0) {
                this.ui.rollBtn.disabled = false;
                this.ui.rollBtn.textContent = "Roll Dice";
                this.ui.bankBtn.disabled = true;
            } else {
                const hasSelected = selectedDice.length > 0;
                if (hasSelected) {
                    this.ui.rollBtn.disabled = false;
                    this.ui.rollBtn.textContent = "Roll Remaining";
                    this.ui.bankBtn.disabled = false;
                } else {
                    this.ui.rollBtn.disabled = true;
                    this.ui.bankBtn.disabled = true;
                    if (this.gameState.currentDice.length === 6 && this.gameState.roundAccumulatedScore > 0) {
                        this.ui.actionText.textContent = "HOT DICE! Select scoring dice!";
                    } else {
                        this.ui.actionText.textContent = "Select dice to continue";
                    }
                }

                if (this.gameState.currentDice.length > 0 && selectedDice.length === this.gameState.currentDice.length) {
                    this.ui.rollBtn.textContent = "Roll Hot Dice!";
                }
            }
        }
    }

    renderPlayers() {
        if (!this.gameState || !this.gameState.players) return;
        const container = this.ui.playerZonesContainer;
        if (!container) return;
        container.innerHTML = '';

        this.gameState.players.forEach((player, index) => {
            const isCurrent = this.gameState.currentPlayerIndex === index && this.gameState.gameStatus === 'playing';
            const card = document.createElement('div');
            card.className = `player-card ${isCurrent ? 'active' : ''}`;
            if (!player.connected) card.style.opacity = "0.5";

            const info = document.createElement('div');
            info.className = 'player-info';
            const name = document.createElement('span');
            name.className = 'player-name';
            name.textContent = player.name;
            info.appendChild(name);

            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'total-score';
            scoreDiv.textContent = player.score;

            card.appendChild(info);
            card.appendChild(scoreDiv);
            container.appendChild(card);
        });
    }

    renderDice(dice) {
        this.ui.diceContainer.innerHTML = '';
        dice.forEach((d, index) => {
            if (!d) return;
            const die = document.createElement('div');
            die.className = `die ${d.selected ? 'selected' : ''}`;
            die.dataset.id = d.id;
            // Numeric indicator for clarity
            die.innerHTML = `
                <span style="font-size: 2.5rem">${this.getDieChar(d.value)}</span>
                <span class="die-value-indicator">${d.value}</span>
            `;
            die.style.animationDelay = `${index * 50}ms`;
            this.ui.diceContainer.appendChild(die);
        });
    }

    getDieChar(val) {
        const chars = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return chars[val - 1] || '🎲';
    }

    animateRoll(dice) {
        return new Promise(resolve => {
            this.ui.diceContainer.classList.add('rolling');
            this.ui.diceContainer.innerHTML = '';
            for (let i = 0; i < dice.length; i++) {
                const die = document.createElement('div');
                die.className = 'die rolling';
                die.textContent = '🎲';
                die.style.animationDuration = '0.5s';
                this.ui.diceContainer.appendChild(die);
            }
            setTimeout(() => {
                this.ui.diceContainer.classList.remove('rolling');
                resolve();
            }, 600);
        });
    }

    updateGameState(state) {
        this.gameState = state;
        this.renderPlayers();
        this.renderControls();
        this.renderDice(state.currentDice);
        this.checkGameOver(state);

        if (this.gameState.gameStatus === 'playing') {
            const myPlayer = this.gameState.players.find(p => p.id === this.socket.id);
            if (myPlayer) {
                const opponent = this.gameState.players.find(p => p.id !== this.socket.id);
                this.updateDiscordPresence(
                    `Score: ${myPlayer.score} vs ${opponent ? opponent.score : 0}`,
                    `Round: ${state.roundAccumulatedScore > 0 ? '+' + state.roundAccumulatedScore : 'Rolling'}`
                );
            }
        } else {
            this.updateDiscordPresence("In Lobby", "Waiting for game");
        }
    }

    checkGameOver(state) {
        if (state.gameStatus === 'finished') {
            this.ui.gameOverModal.classList.remove('hidden');
            const winner = state.winner;
            let title = "";
            if (winner === 'tie') title = "It's a Tie!";
            else if (winner) title = `${winner.name} Wins!`;
            this.ui.winnerText.textContent = title;
            const p1 = state.players[0];
            const p2 = state.players[1];
            if (p1) {
                this.ui.endP1Name.textContent = p1.name;
                this.ui.endP1Score.textContent = p1.score;
            }
            if (p2) {
                this.ui.endP2Name.textContent = p2.name;
                this.ui.endP2Score.textContent = p2.score;
            }
        } else {
            this.ui.gameOverModal.classList.add('hidden');
        }
    }

    showFeedback(text, type = "info") {
        this.ui.feedback.textContent = text;
        this.ui.feedback.className = `feedback-message ${type}`;
        this.ui.feedback.classList.remove('hidden');

        // Wait longer for hot-dice or farkle to be read
        const duration = (type === 'hot-dice' || type === 'error') ? 3000 : 1500;

        setTimeout(() => {
            this.ui.feedback.classList.add('hidden');
        }, duration);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FarkleClient();
});
