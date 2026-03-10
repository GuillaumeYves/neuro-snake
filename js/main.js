let snake = [];
let last_direction = "right";
let game_container = document.getElementById("game-container");
const snake_size = 50;
const container_size = [
  game_container.offsetWidth,
  game_container.offsetHeight,
];

setInterval(loop_game, 300);
start_game();

function start_game() {
  reset_game();
}

function reset_snake() {
  for (let part of snake) {
    part.remove();
  }
  snake = [];
  const snake_head = document.createElement("div");
  snake_head.classList.add("snake-part", "snake-head");
  snake_head.style.left = "0px";
  snake_head.style.top = "0px";
  game_container.appendChild(snake_head);
  snake.push(snake_head);
  last_direction = "right";
}

function reset_game() {
  reset_snake();
  reset_apple();
}

function reset_apple() {
  const apples = [...document.getElementsByClassName("apple")];
  for (let apple of apples) {
    apple.remove();
  }
  generate_apple();
}

function loop_game() {
  move_snake(last_direction);
  check_eat_apple();
  if (collide_with_wall() || collide_with_self()) {
    game_over();
  }
}

document.addEventListener("keydown", function (event) {
  switch (event.key) {
    case "ArrowLeft":
      save_direction("left");
      break;
    case "ArrowRight":
      save_direction("right");
      break;
    case "ArrowUp":
      save_direction("up");
      break;
    case "ArrowDown":
      save_direction("down");
      break;
  }
});

function save_direction(direction) {
  last_direction = direction;
}

function move_snake(direction) {
  for (let i = snake.length - 1; i > 0; i--) {
    snake[i].style.left = snake[i - 1].style.left;
    snake[i].style.top = snake[i - 1].style.top;
  }
  let head = snake[0];
  if (direction === "left")
    head.style.left = parseInt(head.style.left) - snake_size + "px";
  if (direction === "right")
    head.style.left = parseInt(head.style.left) + snake_size + "px";
  if (direction === "up")
    head.style.top = parseInt(head.style.top) - snake_size + "px";
  if (direction === "down")
    head.style.top = parseInt(head.style.top) + snake_size + "px";
}

function collide_with_wall() {
  const snake_rect = snake[0].getBoundingClientRect();
  const container_rect = game_container.getBoundingClientRect();
  return (
    snake_rect.left < container_rect.left ||
    snake_rect.right > container_rect.right ||
    snake_rect.top < container_rect.top ||
    snake_rect.bottom > container_rect.bottom
  );
}

function collide_with_self() {
  let head_left = parseInt(snake[0].style.left);
  let head_top = parseInt(snake[0].style.top);
  for (let i = 1; i < snake.length; i++) {
    let part_left = parseInt(snake[i].style.left);
    let part_top = parseInt(snake[i].style.top);
    if (head_left === part_left && head_top === part_top) {
      return true;
    }
  }
  return false;
}

function game_over() {
  alert("Game Over!");
  reset_game();
}

function generate_apple() {
  const apple = document.createElement("div");
  apple.classList.add("apple");
  apple.style.left =
    Math.floor(Math.random() * (container_size[0] / snake_size)) * snake_size +
    "px";
  apple.style.top =
    Math.floor(Math.random() * (container_size[1] / snake_size)) * snake_size +
    "px";
  game_container.appendChild(apple);
}

function check_eat_apple() {
  const snake_rect = snake[0].getBoundingClientRect();
  const apples = [...document.getElementsByClassName("apple")];
  for (let apple of apples) {
    const apple_rect = apple.getBoundingClientRect();
    if (
      snake_rect.left < apple_rect.right &&
      snake_rect.right > apple_rect.left &&
      snake_rect.top < apple_rect.bottom &&
      snake_rect.bottom > apple_rect.top
    ) {
      apple.remove();
      grow_snake();
      generate_apple();
    }
  }
}

function grow_snake() {
  const last_part = snake[snake.length - 1];
  const new_part = document.createElement("div");
  new_part.classList.add("snake-part");
  new_part.style.left = parseInt(last_part.style.left) - snake_size + "px";
  new_part.style.top = last_part.style.top;
  game_container.appendChild(new_part);
  snake.push(new_part);
}
