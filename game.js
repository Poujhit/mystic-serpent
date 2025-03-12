class Snake {
  constructor() {
    this.gridSize = 20;
    this.gridWidth = 30; // 600/20 = 30 cells wide
    this.gridHeight = 20; // 400/20 = 20 cells high
    this.reset();
    this.growthAnimation = null;
    this.lastTailPosition = null;
    this.autoPilot = false;
  }

  reset() {
    this.body = [{ x: 10, y: 10 }];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.grown = false;
    this.ghostMode = false;
    this.invincible = false;
    this.autoPilot = false;
  }

  calculatePathToFood(foodPos) {
    const head = this.body[0];

    // Helper function to check if a position is safe
    const isSafePosition = (pos) => {
      const validPosition =
        pos.x >= 0 &&
        pos.x < this.gridWidth &&
        pos.y >= 0 &&
        pos.y < this.gridHeight;

      // During auto-pilot, always check body collisions
      const noBodyCollision = !this.body.some(
        (segment) => segment.x === pos.x && segment.y === pos.y
      );

      return validPosition && noBodyCollision;
    };

    // Check if a move would create a dangerous pattern
    const isDangerousPattern = (nextPos) => {
      const bodyMap = new Set(this.body.map((pos) => `${pos.x},${pos.y}`));

      // Check surrounding positions
      const surroundingPositions = [
        { x: nextPos.x + 1, y: nextPos.y },
        { x: nextPos.x - 1, y: nextPos.y },
        { x: nextPos.x, y: nextPos.y + 1 },
        { x: nextPos.x, y: nextPos.y - 1 },
      ];

      // Count body parts and walls around the position
      let blockedCount = 0;
      for (const pos of surroundingPositions) {
        if (!isSafePosition(pos) || bodyMap.has(`${pos.x},${pos.y}`)) {
          blockedCount++;
        }
      }

      // Position is dangerous if it has more than 2 blocked sides
      return blockedCount > 2;
    };

    // Calculate available space using flood fill
    const getAvailableSpace = (startPos) => {
      let space = 0;
      const visited = new Set();

      const floodFill = (pos) => {
        const key = `${pos.x},${pos.y}`;
        if (visited.has(key)) return;
        if (!isSafePosition(pos)) return;

        visited.add(key);
        space++;

        const moves = [
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: -1, y: 0 },
          { x: 0, y: -1 },
        ];

        for (const move of moves) {
          floodFill({
            x: pos.x + move.x,
            y: pos.y + move.y,
          });
        }
      };

      floodFill(startPos);
      return space;
    };

    const findPath = () => {
      const possibleMoves = [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 0, y: -1 },
      ];

      const getDistance = (pos1, pos2) => {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
      };

      // Score a move based on various factors
      const scoreMovePosition = (pos, move) => {
        let score = 0;

        // Heavy penalty for dangerous patterns
        if (isDangerousPattern(pos)) {
          score -= 200;
        }

        // Distance to food
        const currentDistance = getDistance(head, foodPos);
        const newDistance = getDistance(pos, foodPos);
        if (newDistance < currentDistance) {
          score += 10;
        }

        // Available space after move - very important factor
        const availableSpace = getAvailableSpace(pos);
        const requiredSpace = this.body.length * 2;
        const spaceScore = (availableSpace / requiredSpace) * 40;
        score += spaceScore;

        // Heavily penalize moves that lead to very limited space
        if (availableSpace < this.body.length * 1.5) {
          score -= 300;
        }

        // Prefer moves away from walls
        const distanceToWall = Math.min(
          pos.x,
          this.gridWidth - 1 - pos.x,
          pos.y,
          this.gridHeight - 1 - pos.y
        );
        score += distanceToWall * 3;

        // Prefer continuing in same direction to avoid zigzagging
        if (move.x === this.direction.x && move.y === this.direction.y) {
          score += 8;
        }

        // Heavy penalty for immediate reversal
        if (move.x === -this.direction.x && move.y === -this.direction.y) {
          score -= 100;
        }

        return score;
      };

      let bestMove = null;
      let bestScore = -Infinity;

      // First try to find a move that doesn't decrease available space
      const currentSpace = getAvailableSpace(head);

      for (const move of possibleMoves) {
        const nextPos = {
          x: head.x + move.x,
          y: head.y + move.y,
        };

        if (!isSafePosition(nextPos)) continue;

        const newSpace = getAvailableSpace(nextPos);
        if (newSpace >= currentSpace * 0.8) {
          // Allow slight space reduction
          const score = scoreMovePosition(nextPos, move);
          if (score > bestScore) {
            bestScore = score;
            bestMove = move;
          }
        }
      }

      // If no good moves found, try any safe move
      if (!bestMove) {
        for (const move of possibleMoves) {
          const nextPos = {
            x: head.x + move.x,
            y: head.y + move.y,
          };
          if (isSafePosition(nextPos)) {
            bestMove = move;
            break;
          }
        }
      }

      return bestMove || this.direction;
    };

    return findPath();
  }

  update() {
    // If in auto-pilot, calculate path to food
    if (this.autoPilot && window.game) {
      const foodPos = window.game.food.position;
      const newDir = this.calculatePathToFood(foodPos);
      this.nextDirection = newDir;
    }

    this.direction = { ...this.nextDirection };
    const head = { ...this.body[0] };
    head.x += this.direction.x;
    head.y += this.direction.y;

    // Wall collision handling
    if (
      head.x < 0 ||
      head.x >= this.gridWidth ||
      head.y < 0 ||
      head.y >= this.gridHeight
    ) {
      if (this.invincible) {
        // Wrap around the board during invincibility
        head.x = (head.x + this.gridWidth) % this.gridWidth;
        head.y = (head.y + this.gridHeight) % this.gridHeight;
      } else {
        return false;
      }
    }

    // Self collision (skip if ghost mode or invincible)
    if (
      !this.ghostMode &&
      !this.invincible &&
      this.body.some((segment) => segment.x === head.x && segment.y === head.y)
    ) {
      return false;
    }

    this.body.unshift(head);
    if (!this.grown) {
      this.body.pop();
    }
    this.grown = false;
    return true;
  }

  grow() {
    this.grown = true;
    // Store the last tail position for animation
    this.lastTailPosition = { ...this.body[this.body.length - 1] };
  }

  shrink() {
    // Only shrink if length is > 5
    if (this.body.length > 5) {
      // Remove last five segments
      for (let i = 0; i < 5; i++) {
        this.body.pop();
      }
      return true;
    }
    return false;
  }

  draw(ctx, color = '#00ff00') {
    // Draw walls first
    ctx.strokeStyle = '#4ecca3'; // Matching arcade theme
    ctx.lineWidth = 2;
    ctx.shadowColor = '#4ecca3';
    ctx.shadowBlur = 10;
    ctx.strokeRect(
      0,
      0,
      this.gridWidth * this.gridSize,
      this.gridHeight * this.gridSize
    );
    ctx.shadowBlur = 0;

    const radius = this.gridSize / 3;

    // Draw growth animation if active
    if (this.lastTailPosition) {
      const growthProgress = (Date.now() - this.growthAnimation) / 200; // 200ms animation
      if (growthProgress <= 1) {
        const currentTail = this.body[this.body.length - 1];
        const x = currentTail.x * this.gridSize;
        const y = currentTail.y * this.gridSize;
        const lastX = this.lastTailPosition.x * this.gridSize;
        const lastY = this.lastTailPosition.y * this.gridSize;

        // Interpolate between last and current position
        const animX = lastX + (x - lastX) * growthProgress;
        const animY = lastY + (y - lastY) * growthProgress;

        ctx.fillStyle = color;
        ctx.globalAlpha = 1 - growthProgress;
        ctx.beginPath();
        ctx.roundRect(
          animX,
          animY,
          this.gridSize - 1,
          this.gridSize - 1,
          radius
        );
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        this.lastTailPosition = null;
        this.growthAnimation = null;
      }
    }

    const drawSegment = (x, y) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(
        x,
        y,
        this.gridSize - 1,
        this.gridSize - 1,
        this.gridSize / 3
      );
      ctx.fill();
    };

    // Draw body segments with wrapped positions
    for (let i = this.body.length - 1; i >= 0; i--) {
      const segment = this.body[i];

      // Main position
      const x = segment.x * this.gridSize + (this.gridSize - this.gridSize) / 2;
      const y = segment.y * this.gridSize + (this.gridSize - this.gridSize) / 2;
      drawSegment(x, y);

      // Draw wrapped positions if near edges
      if (segment.x === 0) {
        drawSegment(x + this.gridWidth * this.gridSize, y); // Right wrap
      } else if (segment.x === this.gridWidth - 1) {
        drawSegment(x - this.gridWidth * this.gridSize, y); // Left wrap
      }

      if (segment.y === 0) {
        drawSegment(x, y + this.gridHeight * this.gridSize); // Bottom wrap
      } else if (segment.y === this.gridHeight - 1) {
        drawSegment(x, y - this.gridHeight * this.gridSize); // Top wrap
      }
    }

    // Draw snake head
    const head = this.body[0];
    const headX = head.x * this.gridSize + (this.gridSize - this.gridSize) / 2;
    const headY = head.y * this.gridSize + (this.gridSize - this.gridSize) / 2;

    // Create gradient for head
    const headGradient = ctx.createLinearGradient(
      headX,
      headY,
      headX + this.gridSize,
      headY + this.gridSize
    );
    headGradient.addColorStop(0, '#008000'); // Medium green
    headGradient.addColorStop(1, color); // Light green

    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.roundRect(
      headX,
      headY,
      this.gridSize - 1,
      this.gridSize - 1,
      this.gridSize / 3
    );
    ctx.fill();

    // Draw eyes
    ctx.fillStyle = '#fff'; // White background for eyes
    const eyeSize = this.gridSize / 4;
    const eyeOffset = this.gridSize / 6;
    const pupilSize = eyeSize / 2;

    // Position eyes based on direction
    if (this.direction.x !== 0) {
      // Horizontal movement
      this.drawEye(
        ctx,
        headX + this.gridSize / 2 - eyeSize - eyeOffset,
        headY + eyeOffset,
        eyeSize,
        pupilSize,
        this.direction.x
      );
      this.drawEye(
        ctx,
        headX + this.gridSize / 2 - eyeSize - eyeOffset,
        headY + this.gridSize - eyeSize - eyeOffset,
        eyeSize,
        pupilSize,
        this.direction.x
      );
    } else {
      // Vertical movement
      this.drawEye(
        ctx,
        headX + eyeOffset,
        headY + this.gridSize / 2 - eyeSize - eyeOffset,
        eyeSize,
        pupilSize,
        0,
        this.direction.y
      );
      this.drawEye(
        ctx,
        headX + this.gridSize - eyeSize - eyeOffset,
        headY + this.gridSize / 2 - eyeSize - eyeOffset,
        eyeSize,
        pupilSize,
        0,
        this.direction.y
      );
    }
  }

  drawEye(ctx, x, y, size, pupilSize, dirX = 0, dirY = 0) {
    // Draw white of eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, size / 2);
    ctx.fill();

    // Draw pupil
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(
      x + size / 2 + dirX * (size / 4),
      y + size / 2 + dirY * (size / 4),
      pupilSize,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

class Food {
  constructor() {
    this.gridSize = 20;
    this.gridWidth = 30;
    this.gridHeight = 20;
    this.position = { x: 0, y: 0 };
    this.type = 'normal';
    this.powerUpChance = 0.3;
    this.lastShrinkTime = 0;
    this.shrinkCooldown = 60000; // 1 minute cooldown
    this.spawnTime = Date.now(); // Track when food was spawned
    this.respawnDelay = 10000; // 10 seconds before respawning
    this.randomize();
  }

  randomize() {
    this.position.x = Math.floor(Math.random() * this.gridWidth);
    this.position.y = Math.floor(Math.random() * this.gridHeight);
    this.spawnTime = Date.now(); // Reset spawn time when new food is created

    // Get current snake length from game instance
    const snakeLength = window.game?.snake?.body?.length || 1;

    // Calculate shrink spawn probability based on snake length
    const shouldTryShrink = () => {
      // Don't spawn shrink if snake is too short or if it's on cooldown
      if (
        snakeLength <= 5 ||
        Date.now() - this.lastShrinkTime < this.shrinkCooldown
      ) {
        return false;
      }

      // Increase probability as snake gets longer
      const baseProb = snakeLength > 25 ? 0.8 : Math.min(0.4, snakeLength / 25);
      return Math.random() < baseProb;
    };

    // 30% chance to spawn a power food
    if (Math.random() < this.powerUpChance) {
      // First check if we should spawn shrink power-up
      if (shouldTryShrink()) {
        this.type = 'shrink';
      } else {
        // Get all power types including cursed
        const powerTypes = [
          'ghost',
          'invincible',
          'double',
          'ultimate',
          'cursed',
          'shrink',
        ];
        this.type = powerTypes[Math.floor(Math.random() * powerTypes.length)];
      }
    } else {
      this.type = 'normal';
    }
  }

  // Check if food needs to be respawned
  checkRespawn() {
    const currentTime = Date.now();
    if (currentTime - this.spawnTime > this.respawnDelay) {
      // Create a fade-out effect for the old food
      if (window.game) {
        window.game.createFoodTimeoutEffect(this.position);
      }
      this.randomize();
      return true;
    }
    return false;
  }

  draw(ctx) {
    const x = this.position.x * this.gridSize;
    const y = this.position.y * this.gridSize;
    const halfSize = this.gridSize / 2;

    ctx.save();
    ctx.translate(x + halfSize, y + halfSize);
    ctx.font = `${this.gridSize - 2}px Arial`; // Slightly smaller font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add slight glow effect for power-ups
    if (this.type !== 'normal') {
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 10;
    }

    // Calculate time remaining and add visual indicator
    const timeRemaining =
      (this.respawnDelay - (Date.now() - this.spawnTime)) / 1000;
    if (timeRemaining < 3) {
      // Make food blink when about to disappear
      if (Math.floor(Date.now() / 250) % 2 === 0) {
        ctx.globalAlpha = 0.5;
      }
    }

    switch (this.type) {
      case 'normal':
        ctx.fillText('🍎', 0, 0);
        break;
      case 'ghost':
        ctx.fillText('🔮', 0, 0);
        break;
      case 'invincible':
        ctx.fillText('⭐', 0, 0);
        break;
      case 'double':
        ctx.fillText('💎', 0, 0);
        break;
      case 'ultimate':
        ctx.fillText('👑', 0, 0);
        break;
      case 'shrink':
        ctx.fillText('✂️', 0, 0); // Scissors emoji - represents cutting/reducing
        break;
      case 'cursed':
        ctx.fillText('💀', 0, 0);
        break;
    }

    ctx.restore();
  }
}

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.canvas.width = 600; // Increase width from 400 to 600
    this.canvas.height = 400; // Back to original height
    this.ctx = this.canvas.getContext('2d');
    this.snake = new Snake();
    this.food = new Food();
    this.score = 0;
    this.gameOver = false;
    this.gameOverElement = document.getElementById('gameOver');
    this.scoreElement = document.getElementById('score');
    this.baseSpeed = 150;
    this.minSpeed = 60;
    this.autoEndingSpeed = 300;
    this.waitingForInput = false;
    this.lastValidDirection = null;
    this.powerUps = {
      ghost: { active: false, timeLeft: 0 },
      invincible: { active: false, timeLeft: 0 },
      double: { active: false, timeLeft: 0 },
      cursed: { active: false, timeLeft: 0 },
      ultimate: { active: false, timeLeft: 0 },
    };
    this.autoPilotInvincibilityExtension = 5000; // 5 seconds extension
    this.lastTime = Date.now();
    this.paused = false;
    this.highScore = localStorage.getItem('snakeHighScore') || 0;
    document.getElementById('highScore').textContent = this.highScore;

    // Update the keydown event listener to prevent scrolling
    document.addEventListener('keydown', (e) => {
      // Prevent arrow keys and WASD from scrolling
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Space',
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
        ].includes(e.code)
      ) {
        e.preventDefault();
      }

      if (e.code === 'KeyP') {
        this.togglePause();
      }
    });

    // Update the main key handler to prevent scrolling
    document.addEventListener('keydown', (e) => {
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Space',
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
        ].includes(e.code)
      ) {
        e.preventDefault();
        this.handleKeyPress(e);
      }
    });

    document.getElementById('restartButton').addEventListener('click', () => {
      this.restart();
    });

    // Add event listener for power-ups guide link
    document
      .getElementById('powerUpsGuideLink')
      .addEventListener('click', (e) => {
        // Pause the game when guide is opened
        if (!this.gameOver) {
          this.togglePause();
        }
      });

    this.gameLoop();
  }

  handleKeyPress(event) {
    if (this.gameOver && event.code === 'Space') {
      this.restart();
      return;
    }

    const keyActions = {
      ArrowUp: () => ({ x: 0, y: -1 }),
      ArrowDown: () => ({ x: 0, y: 1 }),
      ArrowLeft: () => ({ x: -1, y: 0 }),
      ArrowRight: () => ({ x: 1, y: 0 }),
      KeyW: () => ({ x: 0, y: -1 }),
      KeyS: () => ({ x: 0, y: 1 }),
      KeyA: () => ({ x: -1, y: 0 }),
      KeyD: () => ({ x: 1, y: 0 }),
    };

    // Handle input after auto-pilot ends
    if (this.waitingForInput && keyActions[event.code]) {
      const newDirection = keyActions[event.code]();

      // Check if the new direction is valid (not opposite to last valid direction)
      if (
        !(
          this.lastValidDirection &&
          newDirection.x === -this.lastValidDirection.x &&
          newDirection.y === -this.lastValidDirection.y
        )
      ) {
        this.waitingForInput = false;
        this.snake.nextDirection = newDirection;
        this.snake.direction = { ...this.lastValidDirection }; // Keep current direction until next update
        this.lastValidDirection = null;
      }
      return;
    }

    // Normal direction changes
    if (keyActions[event.code]) {
      const newDir = keyActions[event.code]();
      if (
        !(
          this.snake.direction.x === -newDir.x &&
          this.snake.direction.y === -newDir.y
        )
      ) {
        this.snake.nextDirection = newDir;
      }
    }
  }

  getSpeed() {
    // If in ending phase of auto-pilot, use slower speed
    if (
      this.powerUps.ultimate.active &&
      this.powerUps.ultimate.timeLeft < 3000
    ) {
      return this.autoEndingSpeed;
    }

    // If waiting for input and snake is stopped, use normal speed but don't move
    if (
      this.waitingForInput &&
      this.lastValidDirection.x === 0 &&
      this.lastValidDirection.y === 0
    ) {
      return this.baseSpeed; // Keep normal update speed but snake won't move
    }

    // Normal speed calculation
    const speedDecrease = Math.floor(this.score / 70) * 4;
    return Math.max(this.minSpeed, this.baseSpeed - speedDecrease);
  }

  update() {
    if (this.gameOver) return;

    // Update power-up timers
    this.updatePowerUps();

    // Check if food needs to be respawned
    this.food.checkRespawn();

    // Update snake's ghost mode and invincibility status
    this.snake.ghostMode = this.powerUps.ghost.active;
    this.snake.invincible = this.powerUps.invincible.active;

    const updateResult = this.snake.update();

    // End game if collision occurs during cursed mode or when not invincible
    if (
      (!this.snake.invincible && !updateResult) ||
      (this.powerUps.cursed.active && !updateResult) // This ensures cursed mode ends game on any collision
    ) {
      // End cursed mode immediately
      if (this.powerUps.cursed.active) {
        this.powerUps.cursed.active = false;
        this.powerUps.cursed.timeLeft = 0;
        document.body.classList.remove('cursed-mode');
        this.canvas.classList.remove('cursed');
      }

      this.handleGameOver();
      return;
    }

    // Check for food collection
    const head = this.snake.body[0];
    if (head.x === this.food.position.x && head.y === this.food.position.y) {
      this.snake.grow();
      this.handleFoodCollection();
      this.food.randomize();
    }
  }

  handleFoodCollection() {
    let points = 0;
    const foodPos = {
      x: this.food.position.x * this.snake.gridSize + this.snake.gridSize / 2,
      y: this.food.position.y * this.snake.gridSize + this.snake.gridSize / 2,
    };

    // Create food collection animation without affecting game timing
    requestAnimationFrame(() => {
      this.createFoodCollectionEffect(foodPos, this.food.type);
    });

    switch (this.food.type) {
      case 'normal':
        points = 10;
        break;
      case 'ghost':
        points = 15;
        this.activatePowerUp('ghost', 10000);
        break;
      case 'invincible':
        points = 15;
        this.activatePowerUp('invincible', 10000);
        break;
      case 'double':
        points = 20;
        this.activatePowerUp('double', 8000);
        break;
      case 'ultimate':
        points = 25;
        // Only activate autopilot if not already in autopilot mode
        if (!this.snake.autoPilot) {
          this.snake.autoPilot = true;
          this.activatePowerUp('ultimate', 20000);
        }
        break;
      case 'shrink':
        if (this.snake.body.length > 5 && this.snake.shrink()) {
          points = 25; // Higher points for successful shrink
          this.food.lastShrinkTime = Date.now(); // Start cooldown
        }
        break;
      case 'cursed':
        points = 200;
        this.activatePowerUp('cursed', 5000); // 5 seconds of dark mode
        break;
    }

    if (this.powerUps.double.active) {
      points *= 2;
    }

    this.score += points;
    this.scoreElement.textContent = this.score;

    // Only call grow once and set animation time
    this.snake.growthAnimation = Date.now();
    this.food.randomize();

    // If ultimate (auto-pilot) power-up is collected, also activate invincibility and ghost mode
    if (this.food.type === 'ultimate') {
      this.activatePowerUp('ultimate', 15000);
      this.activatePowerUp('invincible', 15000); // Same duration as auto-pilot
      this.activatePowerUp('ghost', 15000); // Add ghost mode
      this.snake.autoPilot = true;

      // Add visual indication for auto-pilot mode
      this.canvas.classList.add('auto-pilot-mode');
    }
  }

  createFoodCollectionEffect(pos, foodType) {
    const particles = [];
    const particleCount = 8; // Reduced particle count for minimalism
    const colors = {
      normal: ['#ff4444'], // Single crisp color for each type
      ghost: ['#6666ff'],
      invincible: ['#ffcc00'],
      double: ['#00ff88'],
      ultimate: ['#ff00ff'],
    };

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const color = colors[foodType][0];
      const speed = 4; // Fixed speed for consistent animation
      particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4, // Fixed size for consistency
        life: 1,
        color: color,
      });
    }

    let lastTime = performance.now();
    const animate = (currentTime) => {
      const allParticlesDead = particles.every((p) => p.life <= 0);
      if (allParticlesDead) return;

      const deltaTime = (currentTime - lastTime) / 16;
      lastTime = currentTime;

      this.ctx.save();
      particles.forEach((p) => {
        if (p.life > 0) {
          p.x += p.vx * deltaTime;
          p.y += p.vy * deltaTime;
          p.life -= 0.04 * deltaTime; // Faster fade out

          // Draw particle with minimal glow
          this.ctx.shadowColor = p.color;
          this.ctx.shadowBlur = 4;
          this.ctx.fillStyle = p.color;
          this.ctx.globalAlpha = p.life;

          // Draw as small circle for clean look
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      });
      this.ctx.restore();

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    // Flash effect
    this.ctx.save();
    this.ctx.fillStyle = colors[foodType][0];
    this.ctx.globalAlpha = 0.3;
    this.ctx.shadowColor = colors[foodType][0];
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, this.snake.gridSize, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  activatePowerUp(type, duration) {
    this.powerUps[type].active = true;
    this.powerUps[type].timeLeft = duration;
  }

  updatePowerUps() {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    for (const [type, power] of Object.entries(this.powerUps)) {
      if (power.active) {
        power.timeLeft -= deltaTime;

        // Special handling for ultimate (auto-pilot) power-up ending
        if (type === 'ultimate' && power.timeLeft <= 3000) {
          // Find safe position in last 3 seconds
          this.findSafePosition();
        }

        if (power.timeLeft <= 0) {
          power.active = false;
          if (type === 'ghost') {
            this.snake.ghostMode = false;
          } else if (type === 'invincible') {
            this.snake.invincible = false;
          } else if (type === 'ultimate') {
            // Remove auto-pilot visual indication
            this.canvas.classList.remove('auto-pilot-mode');

            // Store the last valid direction before stopping
            this.lastValidDirection = { ...this.snake.direction };
            this.snake.autoPilot = false;
            this.snake.ghostMode = false; // Disable ghost mode
            this.waitingForInput = true;
            this.showAutoEndMessage();
            // Keep the snake moving in the last valid direction
            this.snake.direction = { ...this.lastValidDirection };
            this.snake.nextDirection = { ...this.lastValidDirection };

            // Extend invincibility for 5 more seconds
            this.powerUps.invincible.timeLeft =
              this.autoPilotInvincibilityExtension;
            this.powerUps.invincible.active = true;
            this.snake.invincible = true;
          }
        }
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw board border
    this.ctx.strokeStyle = this.snake.autoPilot ? '#00ffff' : '#2ecc71';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw snake with special styling during auto-pilot
    this.ctx.save();
    if (this.snake.autoPilot) {
      // Add a glow effect for auto-pilot mode
      this.ctx.shadowColor = '#00ffff'; // Cyan glow
      this.ctx.shadowBlur = 15;
    }

    // Draw snake body
    this.ctx.fillStyle = this.snake.autoPilot ? '#00ffff' : '#2ecc71';
    this.snake.body.forEach((segment, index) => {
      const x = segment.x * this.snake.gridSize;
      const y = segment.y * this.snake.gridSize;
      const size = this.snake.gridSize;

      // Different rendering for head and body
      if (index === 0) {
        // Head with rounded corners and eyes
        this.ctx.fillStyle = this.snake.autoPilot ? '#00ffff' : '#2ecc71';
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size, size, [5]);
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = 'black';
        const eyeSize = size / 5;
        const eyeOffset = size / 4;

        // Determine eye direction
        if (this.snake.direction.x === 1) {
          // Looking right
          this.ctx.fillRect(
            x + size - eyeOffset,
            y + eyeOffset,
            eyeSize,
            eyeSize
          );
          this.ctx.fillRect(
            x + size - eyeOffset,
            y + size - eyeOffset * 2,
            eyeSize,
            eyeSize
          );
        } else if (this.snake.direction.x === -1) {
          // Looking left
          this.ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
          this.ctx.fillRect(
            x + eyeOffset,
            y + size - eyeOffset * 2,
            eyeSize,
            eyeSize
          );
        } else if (this.snake.direction.y === 1) {
          // Looking down
          this.ctx.fillRect(
            x + eyeOffset,
            y + size - eyeOffset,
            eyeSize,
            eyeSize
          );
          this.ctx.fillRect(
            x + size - eyeOffset * 2,
            y + size - eyeOffset,
            eyeSize,
            eyeSize
          );
        } else {
          // Looking up
          this.ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
          this.ctx.fillRect(
            x + size - eyeOffset * 2,
            y + eyeOffset,
            eyeSize,
            eyeSize
          );
        }
      } else {
        // Body segments with rounded corners
        this.ctx.fillStyle = this.snake.autoPilot ? '#00a0a0' : '#27ae60';
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size, size, [3]);
        this.ctx.fill();
      }
    });

    this.ctx.restore();

    // Draw food
    this.food.draw(this.ctx);

    // Create dark overlay if cursed mode is active
    if (this.powerUps.cursed.active) {
      // Draw dark overlay
      this.ctx.fillStyle = 'rgba(0, 0, 0, 1)'; // Completely black
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Create a light circle around snake head
      const head = this.snake.body[0];
      const centerX = head.x * this.snake.gridSize + this.snake.gridSize / 2;
      const centerY = head.y * this.snake.gridSize + this.snake.gridSize / 2;
      const radius = this.snake.gridSize * 2.5; // Slightly larger visible area

      // Create radial gradient for smooth light effect
      const gradient = this.ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');

      // Create light circle by clearing the dark overlay
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      // Redraw the snake and food in the visible area with eerie effect
      const visibleArea = new Path2D();
      visibleArea.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.save();
      this.ctx.clip(visibleArea);
      this.snake.draw(this.ctx, '#660000');
      this.food.draw(this.ctx);
      this.ctx.restore();

      // Draw cursed timer in the visible area
      const timeLeft = Math.ceil(this.powerUps.cursed.timeLeft / 1000);
      this.ctx.save();
      this.ctx.font = 'bold 24px Arial';
      this.ctx.fillStyle = '#ff0000';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(`${timeLeft}s`, centerX, centerY - radius);
      this.ctx.restore();
    }

    this.drawPowerUpIndicators();
  }

  drawPowerUpIndicators() {
    const container = document.getElementById('activePowerUps');
    container.innerHTML = '';

    for (const [type, power] of Object.entries(this.powerUps)) {
      if (power.active) {
        const timeLeft = Math.ceil(power.timeLeft / 1000);
        const indicator = document.createElement('div');
        indicator.className = `power-up-indicator ${type}`;

        // Special formatting for ultimate power-up
        if (type === 'ultimate') {
          indicator.innerHTML = `
            <div>🎮 AUTO-PILOT ACTIVE 🎮</div>
            <div style="font-size: 1.2em; margin-top: 5px;">${timeLeft}s</div>
          `;
        } else {
          indicator.textContent = `${type.toUpperCase()}: ${timeLeft}s`;
        }
        container.appendChild(indicator);
      }
    }
  }

  restart() {
    this.snake.reset();
    this.food.randomize();
    this.score = 0;
    this.scoreElement.textContent = this.score;
    this.gameOver = false;
    this.gameOverElement.classList.add('hidden');
  }

  togglePause() {
    this.paused = !this.paused;
    document
      .getElementById('pauseOverlay')
      .classList.toggle('hidden', !this.paused);
  }

  handleGameOver() {
    this.gameOver = true;
    document.getElementById('finalScore').textContent = this.score;
    document.getElementById('gameOver').classList.remove('hidden');

    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('snakeHighScore', this.highScore);
      document.getElementById('highScore').textContent = this.highScore;
    }
  }

  gameLoop() {
    if (!this.paused) {
      this.update();
      this.draw();
    }
    setTimeout(
      () => requestAnimationFrame(this.gameLoop.bind(this)),
      this.getSpeed()
    );
  }

  // Add this method to the Game class
  createFoodTimeoutEffect(position) {
    const x = position.x * this.snake.gridSize + this.snake.gridSize / 2;
    const y = position.y * this.snake.gridSize + this.snake.gridSize / 2;

    // Create particles for timeout effect
    const particles = [];
    const particleCount = 6;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        size: 3,
        life: 1,
        color: '#ff6666', // Red color for timeout
      });
    }

    let lastTime = performance.now();
    const animate = (currentTime) => {
      const allParticlesDead = particles.every((p) => p.life <= 0);
      if (allParticlesDead) return;

      const deltaTime = (currentTime - lastTime) / 16;
      lastTime = currentTime;

      this.ctx.save();
      particles.forEach((p) => {
        if (p.life > 0) {
          p.x += p.vx * deltaTime;
          p.y += p.vy * deltaTime;
          p.life -= 0.05 * deltaTime;

          this.ctx.shadowColor = p.color;
          this.ctx.shadowBlur = 4;
          this.ctx.fillStyle = p.color;
          this.ctx.globalAlpha = p.life;

          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          this.ctx.fill();
        }
      });
      this.ctx.restore();

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  // New method to find a safe position for the snake
  findSafePosition() {
    if (!this.snake.autoPilot) return;

    const head = this.snake.body[0];
    const possibleMoves = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
    ];

    // Try to move snake to center of the grid if possible
    const centerX = Math.floor(this.snake.gridWidth / 2);
    const centerY = Math.floor(this.snake.gridHeight / 2);

    // Calculate distances from edges
    const distanceFromEdges = Math.min(
      head.x,
      this.snake.gridWidth - head.x,
      head.y,
      this.snake.gridHeight - head.y
    );

    // If close to edge, try to move towards center
    if (distanceFromEdges < 3) {
      const dx = centerX - head.x;
      const dy = centerY - head.y;

      // Prioritize the larger distance to get away from the closer edge
      if (Math.abs(dx) > Math.abs(dy)) {
        this.snake.nextDirection = { x: Math.sign(dx), y: 0 };
      } else {
        this.snake.nextDirection = { x: 0, y: Math.sign(dy) };
      }
    }
  }

  // New method to show message when auto-pilot is ending
  showAutoEndMessage() {
    const container = document.getElementById('activePowerUps');
    const message = document.createElement('div');
    message.className = 'power-up-indicator ultimate ending';
    message.innerHTML = `
      <div>🎮 AUTO-PILOT ENDED 🎮</div>
      <div style="font-size: 0.8em; margin-top: 5px;">Press a direction key to resume</div>
      <div style="font-size: 0.7em; color: #ffff00;">Invincibility: 5s</div>
    `;
    container.appendChild(message);

    // Keep message visible until user input
    const checkAndRemove = setInterval(() => {
      if (!this.waitingForInput && message.parentNode === container) {
        container.removeChild(message);
        clearInterval(checkAndRemove);
      }
    }, 100);
  }
}

// Start the game when the page loads
window.onload = () => (window.game = new Game());
