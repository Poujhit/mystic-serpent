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
    const dx = foodPos.x - head.x;
    const dy = foodPos.y - head.y;

    // Helper function to check if a position is safe
    const isSafePosition = (pos) => {
      return (
        pos.x >= 0 &&
        pos.x < this.gridWidth &&
        pos.y >= 0 &&
        pos.y < this.gridHeight &&
        !this.body.some((segment) => segment.x === pos.x && segment.y === pos.y)
      );
    };

    // Helper function to calculate distance to food
    const getDistanceToFood = (pos) => {
      return Math.abs(foodPos.x - pos.x) + Math.abs(foodPos.y - pos.y);
    };

    // Try all possible moves and pick the best valid one
    const possibleMoves = [
      { x: 1, y: 0 }, // Right
      { x: -1, y: 0 }, // Left
      { x: 0, y: 1 }, // Down
      { x: 0, y: -1 }, // Up
    ];

    // Score each possible move
    let bestMove = null;
    let bestScore = -Infinity;

    // Find a valid move that doesn't cause collision
    for (const move of possibleMoves) {
      const nextPos = {
        x: head.x + move.x,
        y: head.y + move.y,
      };

      if (!isSafePosition(nextPos)) {
        continue;
      }

      // Calculate score for this move
      let score = 0;

      // Higher score for moves that get us closer to food
      const currentDistance = getDistanceToFood(head);
      const newDistance = getDistanceToFood(nextPos);
      if (newDistance < currentDistance) {
        score += 2;
      }

      // Prioritize horizontal movement when food is more horizontal
      if (Math.abs(dx) > Math.abs(dy)) {
        if ((dx > 0 && move.x > 0) || (dx < 0 && move.x < 0)) {
          score += 1;
        }
      } else {
        // Prioritize vertical movement when food is more vertical
        if ((dy > 0 && move.y > 0) || (dy < 0 && move.y < 0)) {
          score += 1;
        }
      }

      // Update best move if this score is higher
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    // Return best move if found
    if (bestMove) return bestMove;

    // If no valid move found, try to find any safe move
    for (const move of possibleMoves) {
      const nextPos = {
        x: head.x + move.x,
        y: head.y + move.y,
      };

      if (isSafePosition(nextPos)) {
        return move;
      }
    }

    // If no safe move found, return current direction
    return this.direction;
  }

  update() {
    // If in auto-pilot, calculate path to food
    if (this.autoPilot && window.game) {
      const foodPos = window.game.food.position;
      // Only change direction if not going to collide
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
    this.randomize();
  }

  randomize() {
    this.position.x = Math.floor(Math.random() * this.gridWidth);
    this.position.y = Math.floor(Math.random() * this.gridHeight);

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
    this.baseSpeed = 150; // Changed from 200 to 150 for medium initial speed
    this.minSpeed = 60; // Changed from 70 to 60 for slightly faster max speed
    this.powerUps = {
      ghost: { active: false, timeLeft: 0 },
      invincible: { active: false, timeLeft: 0 },
      double: { active: false, timeLeft: 0 },
      ultimate: { active: false, timeLeft: 0 },
      cursed: { active: false, timeLeft: 0 },
    };
    this.lastTime = Date.now();
    this.paused = false;
    this.highScore = localStorage.getItem('snakeHighScore') || 0;
    document.getElementById('highScore').textContent = this.highScore;

    // Update the keydown event listener to prevent scrolling
    document.addEventListener('keydown', (e) => {
      // Prevent arrow keys from scrolling
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
          e.code
        )
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
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
          e.code
        )
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
      ArrowUp: () =>
        this.snake.direction.y !== 1 &&
        (this.snake.nextDirection = { x: 0, y: -1 }),
      ArrowDown: () =>
        this.snake.direction.y !== -1 &&
        (this.snake.nextDirection = { x: 0, y: 1 }),
      ArrowLeft: () =>
        this.snake.direction.x !== 1 &&
        (this.snake.nextDirection = { x: -1, y: 0 }),
      ArrowRight: () =>
        this.snake.direction.x !== -1 &&
        (this.snake.nextDirection = { x: 1, y: 0 }),
    };

    if (keyActions[event.code]) {
      keyActions[event.code]();
    }
  }

  getSpeed() {
    // Adjusted speed increase rate:
    // Now every 70 points, speed increases by 4ms
    const speedDecrease = Math.floor(this.score / 70) * 4;
    return Math.max(this.minSpeed, this.baseSpeed - speedDecrease);
  }

  update() {
    if (this.gameOver) return;

    // Update power-up timers
    this.updatePowerUps();

    // Update snake's ghost mode and invincibility status
    this.snake.ghostMode = this.powerUps.ghost.active;
    this.snake.invincible = this.powerUps.invincible.active;

    // Check collision result
    const updateResult = this.snake.update();

    // End game if collision occurs during cursed mode or when not invincible
    if (
      (!this.snake.invincible && !updateResult) ||
      (this.powerUps.cursed.active && !updateResult)
    ) {
      // End cursed mode immediately
      if (this.powerUps.cursed.active) {
        this.powerUps.cursed.active = false;
        this.powerUps.cursed.timeLeft = 0;
        document.body.classList.remove('cursed-mode');
        this.canvas.classList.remove('cursed');
      }

      this.gameOver = true;
      this.gameOverElement.classList.remove('hidden');
      this.handleGameOver();
      return;
    }

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
        if (power.timeLeft <= 0) {
          power.active = false;
          if (type === 'ghost') {
            this.snake.ghostMode = false;
          } else if (type === 'invincible') {
            this.snake.invincible = false;
          } else if (type === 'ultimate') {
            this.snake.autoPilot = false;
            this.snake.ghostMode = false;
          }
        }
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // If cursed mode is active, darken the entire website first
    if (this.powerUps.cursed.active) {
      document.body.classList.add('cursed-mode');
      // Hide canvas border during cursed mode
      this.canvas.classList.add('cursed');
    } else {
      document.body.classList.remove('cursed-mode');
      this.canvas.classList.remove('cursed');
    }

    // Draw auto-pilot countdown in background first
    if (this.powerUps.ultimate.active) {
      const timeLeft = Math.ceil(this.powerUps.ultimate.timeLeft / 1000);
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
      this.ctx.font = 'bold 120px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      this.ctx.shadowColor = 'rgba(255, 215, 0, 0.3)';
      this.ctx.shadowBlur = 20;
      this.ctx.fillText(timeLeft.toString(), centerX, centerY);
      this.ctx.restore();
    }

    // Draw snake and food first
    if (this.powerUps.ghost.active) {
      this.ctx.globalAlpha = 0.5;
    }
    if (this.powerUps.invincible.active) {
      this.snake.draw(this.ctx, '#ffd700');
    } else {
      this.snake.draw(this.ctx);
    }
    this.ctx.globalAlpha = 1;
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
}

// Start the game when the page loads
window.onload = () => (window.game = new Game());
