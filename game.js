class Snake {
  constructor() {
    this.gridSize = 20;
    this.gridWidth = 30; // 600/20 = 30 cells wide
    this.gridHeight = 20; // 400/20 = 20 cells high
    this.reset();
  }

  reset() {
    this.body = [{ x: 10, y: 10 }];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.grown = false;
    this.ghostMode = false;
    this.invincible = false;
  }

  update() {
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
  }

  draw(ctx, color = '#00ff00') {
    const radius = this.gridSize / 3;

    // Draw body segments with rounded corners
    for (let i = this.body.length - 1; i >= 0; i--) {
      const segment = this.body[i];
      const x = segment.x * this.gridSize;
      const y = segment.y * this.gridSize;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, this.gridSize - 1, this.gridSize - 1, radius);
      ctx.fill();

      // Add segment connection if not last segment
      if (i < this.body.length - 1) {
        const nextSegment = this.body[i + 1];
        const midX = ((segment.x + nextSegment.x) * this.gridSize) / 2;
        const midY = ((segment.y + nextSegment.y) * this.gridSize) / 2;
        ctx.fillRect(
          Math.min(x, midX),
          Math.min(y, midY),
          Math.abs(x - midX) || this.gridSize - 1,
          Math.abs(y - midY) || this.gridSize - 1
        );
      }
    }

    // Draw snake head with eyes
    const head = this.body[0];
    const headX = head.x * this.gridSize;
    const headY = head.y * this.gridSize;

    // Draw eyes
    ctx.fillStyle = '#000';
    const eyeSize = 3;
    const eyeOffset = 5;

    // Position eyes based on direction
    if (this.direction.x === 1) {
      // Right
      ctx.fillRect(
        headX + this.gridSize - eyeOffset,
        headY + eyeOffset,
        eyeSize,
        eyeSize
      );
      ctx.fillRect(
        headX + this.gridSize - eyeOffset,
        headY + this.gridSize - eyeOffset - eyeSize,
        eyeSize,
        eyeSize
      );
    } else if (this.direction.x === -1) {
      // Left
      ctx.fillRect(
        headX + eyeOffset - eyeSize,
        headY + eyeOffset,
        eyeSize,
        eyeSize
      );
      ctx.fillRect(
        headX + eyeOffset - eyeSize,
        headY + this.gridSize - eyeOffset - eyeSize,
        eyeSize,
        eyeSize
      );
    } else if (this.direction.y === 1) {
      // Down
      ctx.fillRect(
        headX + eyeOffset,
        headY + this.gridSize - eyeOffset,
        eyeSize,
        eyeSize
      );
      ctx.fillRect(
        headX + this.gridSize - eyeOffset - eyeSize,
        headY + this.gridSize - eyeOffset,
        eyeSize,
        eyeSize
      );
    } else {
      // Up
      ctx.fillRect(
        headX + eyeOffset,
        headY + eyeOffset - eyeSize,
        eyeSize,
        eyeSize
      );
      ctx.fillRect(
        headX + this.gridSize - eyeOffset - eyeSize,
        headY + eyeOffset - eyeSize,
        eyeSize,
        eyeSize
      );
    }
  }
}

class Food {
  constructor() {
    this.gridSize = 20;
    this.gridWidth = 30; // Match Snake's grid dimensions
    this.gridHeight = 20;
    this.position = { x: 0, y: 0 };
    this.type = 'normal';
    this.randomize();
  }

  randomize() {
    this.position.x = Math.floor(Math.random() * this.gridWidth);
    this.position.y = Math.floor(Math.random() * this.gridHeight);
    // 20% chance to spawn a power food
    if (Math.random() < 0.2) {
      this.type = this.getRandomPowerType();
    } else {
      this.type = 'normal';
    }
  }

  getRandomPowerType() {
    const powerTypes = ['ghost', 'invincible', 'double'];
    return powerTypes[Math.floor(Math.random() * powerTypes.length)];
  }

  draw(ctx) {
    const x = this.position.x * this.gridSize;
    const y = this.position.y * this.gridSize;
    const size = this.gridSize - 1;
    const halfSize = size / 2;
    const quarterSize = size / 4;

    ctx.save();
    ctx.translate(x + halfSize, y + halfSize);

    switch (this.type) {
      case 'normal':
        // Draw an apple
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, quarterSize * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Stem
        ctx.fillStyle = '#553311';
        ctx.fillRect(-2, -quarterSize * 1.5, 4, 6);

        // Leaf
        ctx.fillStyle = '#00aa00';
        ctx.beginPath();
        ctx.ellipse(4, -quarterSize * 1.5, 6, 3, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'ghost':
        // Draw a glowing orb
        const gradient = ctx.createRadialGradient(
          0,
          0,
          0,
          0,
          0,
          quarterSize * 2
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#88ccff');
        gradient.addColorStop(1, '#4488ff');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, quarterSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'invincible':
        // Draw a star
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const radius = i === 0 ? quarterSize * 2 : quarterSize;
          ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.fill();
        break;

      case 'double':
        // Draw a gem
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.moveTo(-quarterSize, 0);
        ctx.lineTo(0, -quarterSize * 1.5);
        ctx.lineTo(quarterSize, 0);
        ctx.lineTo(0, quarterSize * 1.5);
        ctx.closePath();
        ctx.fill();

        // Add shine
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-quarterSize / 2, -quarterSize / 2);
        ctx.lineTo(0, -quarterSize);
        ctx.stroke();
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

    // Always call snake.update() and only check return value if not invincible
    const updateResult = this.snake.update();
    if (!this.snake.invincible && !updateResult) {
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
    switch (this.food.type) {
      case 'normal':
        this.score += 10;
        break;
      case 'ghost':
        this.score += 15;
        this.activatePowerUp('ghost', 10000); // 10 seconds of ghost mode
        break;
      case 'invincible':
        this.score += 15;
        this.activatePowerUp('invincible', 5000); // 5 seconds of invincibility
        break;
      case 'double':
        this.score += 20;
        this.activatePowerUp('double', 8000); // 8 seconds of double points
        break;
    }
    this.scoreElement.textContent = this.score;
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
          }
        }
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw snake with effects
    if (this.powerUps.ghost.active) {
      this.ctx.globalAlpha = 0.5;
    }
    if (this.powerUps.invincible.active) {
      this.snake.draw(this.ctx, '#ffd700'); // Gold color for invincibility
    } else {
      this.snake.draw(this.ctx);
    }
    this.ctx.globalAlpha = 1;

    this.food.draw(this.ctx);
    this.drawPowerUpIndicators();
  }

  drawPowerUpIndicators() {
    const container = document.getElementById('activePowerUps');
    container.innerHTML = '';

    for (const [type, power] of Object.entries(this.powerUps)) {
      if (power.active) {
        const timeLeft = Math.ceil(power.timeLeft / 1000);
        const indicator = document.createElement('div');
        indicator.className = 'power-up-indicator';
        indicator.textContent = `${type.toUpperCase()}: ${timeLeft}s`;
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
window.onload = () => new Game();
