const TRAITS = [
  { name: 'Быстрое', icon: '🦶', defense: 1, diet: 'herbivore', points: 0 },
  { name: 'Защитное', icon: '🛡️', defense: 2, diet: 'herbivore', points: 0 },
  { name: 'Стадное', icon: '👥', defense: 0, diet: 'herbivore', points: 1 },
  { name: 'Хищник', icon: '🍖', defense: 0, diet: 'predator', points: 0 },
  { name: 'Травоядное', icon: '🍃', defense: 0, diet: 'herbivore', points: 0 },
  { name: 'Ночное', icon: '🌙', defense: 1, diet: 'predator', points: 0 }
];

const ANIMALS = ['🦎', '🦊', '🐗', '🦓', '🦉', '🐘', '🦬', '🦈'];

const state = {
  round: 0,
  foodPool: 0,
  turn: 0,
  gameStarted: false,
  players: []
};

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const startGameBtn = document.getElementById('startGame');
const nextRoundBtn = document.getElementById('nextRound');

startGameBtn.addEventListener('click', initGame);
nextRoundBtn.addEventListener('click', nextRound);

function initGame() {
  const p1 = document.getElementById('player1').value.trim() || 'Игрок 1';
  const p2 = document.getElementById('player2').value.trim() || 'Игрок 2';

  state.players = [createPlayer(p1, 1), createPlayer(p2, 2)];
  state.round = 0;
  state.gameStarted = true;
  nextRound();
  nextRoundBtn.disabled = false;
}

function createPlayer(name, seed) {
  return {
    name,
    score: 0,
    species: Array.from({ length: 3 }, (_, idx) => createSpecies(seed * 10 + idx))
  };
}

function createSpecies(seed) {
  const trait = TRAITS[seed % TRAITS.length];
  const dietNeeds = trait.diet === 'predator' ? 2 : 1;
  return {
    id: crypto.randomUUID(),
    name: `Вид ${seed % 100}`,
    animal: ANIMALS[seed % ANIMALS.length],
    trait,
    foodEaten: 0,
    foodNeed: dietNeeds,
    fed: false
  };
}

function nextRound() {
  if (!state.gameStarted) return;

  state.round += 1;
  state.turn = 0;
  state.foodPool = 6 + Math.floor(Math.random() * 6);

  state.players.forEach((player, index) => {
    player.species.forEach((sp) => {
      sp.foodEaten = 0;
      sp.fed = false;
    });

    if (state.round % 2 === 0) {
      player.species.push(createSpecies(state.round * 10 + index));
    }
  });

  setStatus(`Раунд ${state.round}: в кормовой базе ${state.foodPool} еды.`);
  render();
}

function feedSpecies(playerIdx, speciesId) {
  const player = state.players[playerIdx];
  const species = player.species.find((sp) => sp.id === speciesId);
  if (!species || species.fed) return;

  if (species.trait.diet === 'predator') {
    setStatus(`${species.name} — хищник. Используйте кнопку «Атаковать».`);
    return;
  }

  if (state.foodPool <= 0) {
    setStatus('Корм закончился!');
    return;
  }

  state.foodPool -= 1;
  species.foodEaten += 1;
  species.fed = species.foodEaten >= species.foodNeed;

  setStatus(`${player.name} кормит ${species.name}. Остаток еды: ${state.foodPool}.`);
  maybeFinishRound();
  render();
}

function predatorAttack(playerIdx, speciesId) {
  const attackerPlayer = state.players[playerIdx];
  const defenderPlayer = state.players[(playerIdx + 1) % state.players.length];
  const attacker = attackerPlayer.species.find((sp) => sp.id === speciesId);

  if (!attacker || attacker.fed || attacker.trait.diet !== 'predator') return;

  const candidates = defenderPlayer.species.filter((sp) => sp.trait.defense < 2);
  if (!candidates.length) {
    setStatus(`У ${defenderPlayer.name} нет уязвимых видов для атаки.`);
    return;
  }

  const target = candidates[Math.floor(Math.random() * candidates.length)];
  defenderPlayer.species = defenderPlayer.species.filter((sp) => sp.id !== target.id);

  attacker.foodEaten += 2;
  attacker.fed = true;
  setStatus(`${attackerPlayer.name}: ${attacker.name} съедает ${target.name} у ${defenderPlayer.name}!`);

  maybeFinishRound();
  render();
}

function maybeFinishRound() {
  const everyoneFed = state.players.every((player) => player.species.every((sp) => sp.fed));
  if (!everyoneFed && state.foodPool > 0) return;

  state.players.forEach((player) => {
    const roundPoints = player.species.reduce((sum, sp) => {
      const feedPoint = sp.fed ? 2 : 0;
      return sum + feedPoint + sp.trait.points;
    }, 0);
    player.score += roundPoints;
  });

  setStatus(`Раунд ${state.round} завершён. Нажмите «Новый раунд».`);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function render() {
  boardEl.innerHTML = '';

  state.players.forEach((player, idx) => {
    const zone = document.createElement('section');
    zone.className = 'player-zone';

    zone.innerHTML = `
      <h2>${player.name}</h2>
      <div class="player-meta">
        <span>Очки: <strong>${player.score}</strong></span>
        <span>Виды: <strong>${player.species.length}</strong></span>
        <span>Корм в базе: <strong>${state.foodPool}</strong></span>
      </div>
      <div class="species-row"></div>
    `;

    const row = zone.querySelector('.species-row');
    player.species.forEach((species) => {
      const card = renderSpeciesCard(species, idx);
      row.append(card);
    });

    boardEl.append(zone);
  });
}

function renderSpeciesCard(species, playerIdx) {
  const template = document.getElementById('speciesTemplate');
  const card = template.content.firstElementChild.cloneNode(true);
  card.querySelector('h3').textContent = species.name;
  card.querySelector('.art').textContent = species.animal;
  card.querySelector('.trait').textContent = `${species.trait.icon} ${species.trait.name}`;
  card.querySelector('.food').textContent = `Питание: ${species.foodEaten}/${species.foodNeed}`;

  const feedBtn = card.querySelector('.feedBtn');
  const attackBtn = card.querySelector('.attackBtn');

  feedBtn.disabled = species.fed || species.trait.diet === 'predator';
  attackBtn.disabled = species.fed || species.trait.diet !== 'predator';

  feedBtn.addEventListener('click', () => feedSpecies(playerIdx, species.id));
  attackBtn.addEventListener('click', () => predatorAttack(playerIdx, species.id));

  return card;
}
