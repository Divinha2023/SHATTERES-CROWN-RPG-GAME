const GAME_DATA = {
  assets: {
    knight: "assets/crown-knight.png",
    mage: "assets/crimson-arcanist.png",
    ranger: "assets/silver-ranger.png",
    warlord: "assets/obsidian-warlord.png",
    orc: "assets/orc-warrior.png",
    monster: "assets/monster-ogre.png",
  },
  skillKeys: ["strength", "agility", "attack", "defence", "vitality", "charisma", "stamina", "magicka"],
  skillLabels: {
    strength: "strength",
    agility: "agility",
    attack: "attack",
    defence: "defence",
    vitality: "vitality",
    charisma: "charisma",
    stamina: "stamina",
    magicka: "magicka",
  },
  champions: [
    {
      id: "knight",
      name: "Cavaleiro da Coroa",
      role: "Espada e escudo",
      img: "assets/crown-knight.png",
      bonus: { strength: 1, defence: 1 },
    },
    {
      id: "mage",
      name: "Arcanista Rubra",
      role: "Fogo e risco",
      img: "assets/crimson-arcanist.png",
      bonus: { magicka: 2 },
    },
    {
      id: "ranger",
      name: "Patrulheira Prateada",
      role: "Rapidez e critico",
      img: "assets/silver-ranger.png",
      bonus: { agility: 1, attack: 1 },
    },
    {
      id: "warlord",
      name: "Regente Obsidiano",
      role: "Forca e dominio",
      img: "assets/obsidian-warlord.png",
      bonus: { strength: 1, vitality: 1 },
    },
  ],
  opponents: [
    {
      id: "orc",
      name: "Orc da Arena",
      role: "Inimigo inicial",
      img: "assets/orc-warrior.png",
      skills: { strength: 2, agility: 1, attack: 2, defence: 1, vitality: 2, charisma: 1, stamina: 1, magicka: 1 },
      rewardGold: 35,
      rewardXp: 45,
    },
    {
      id: "orc-guard",
      name: "Guarda Orc",
      role: "Orc veterano",
      img: "assets/orc-warrior.png",
      skills: { strength: 3, agility: 1, attack: 3, defence: 2, vitality: 3, charisma: 1, stamina: 2, magicka: 1 },
      rewardGold: 45,
      rewardXp: 55,
    },
    {
      id: "ogre",
      name: "Ogro de Ferro",
      role: "Monstro medieval",
      img: "assets/monster-ogre.png",
      skills: { strength: 5, agility: 2, attack: 5, defence: 4, vitality: 5, charisma: 2, stamina: 3, magicka: 2 },
      rewardGold: 80,
      rewardXp: 90,
    },
  ],
  shopItems: [
    { id: "ironBlade", name: "Lamina de Ferro", price: 45, skill: "attack", amount: 1 },
    { id: "oathArmor", name: "Armadura Jurada", price: 55, skill: "defence", amount: 1 },
    { id: "emberCharm", name: "Amuleto de Brasa", price: 60, skill: "magicka", amount: 1 },
    { id: "arenaRations", name: "Racoes da Arena", price: 35, skill: "vitality", amount: 1 },
  ],
};

const ACTION_COSTS = { quick: 10, heavy: 24, skill: 20, taunt: 4, guard: 0, rest: 0 };
const SCREEN_LABELS = {
  creator: "Create your gladiator",
  hub: "Arena Hall",
  shop: "Market",
  train: "Training Grounds",
  battle: "Arena Battle",
};

class GameModel {
  constructor(data) {
    this.data = data;
    this.creation = {
      selectedId: "knight",
      points: 9,
      skills: this.baseSkills(),
    };
    this.state = {
      screen: "creator",
      round: 1,
      busy: false,
      phase: "battle",
      gold: 0,
      xp: 0,
      level: 1,
      statPoints: 0,
      arenaIndex: 0,
      player: null,
      enemy: null,
    };
  }

  baseSkills() {
    return Object.fromEntries(this.data.skillKeys.map((key) => [key, 1]));
  }

  emptyTrainingAllocations() {
    return Object.fromEntries(this.data.skillKeys.map((key) => [key, 0]));
  }

  selectedTemplate() {
    return this.data.champions.find((template) => template.id === this.creation.selectedId) || this.data.champions[0];
  }

  activeThemeId() {
    return this.state.player?.id || this.creation.selectedId || "knight";
  }

  totalSkillValue(skills, key) {
    return skills[key] + (this.selectedTemplate().bonus[key] || 0);
  }

  setScreen(screen) {
    this.state.screen = screen;
  }

  setSelectedChampion(id) {
    if (!this.data.champions.some((template) => template.id === id)) return;
    this.creation.selectedId = id;
  }

  changeCreationSkill(key, delta) {
    if (!this.data.skillKeys.includes(key)) return false;
    if (delta > 0 && this.creation.points <= 0) return false;
    if (delta < 0 && this.creation.skills[key] <= 1) return false;
    this.creation.skills[key] += delta;
    this.creation.points -= delta;
    return true;
  }

  randomizeCreation() {
    this.creation.selectedId = this.data.champions[this.roll(0, this.data.champions.length - 1)].id;
    this.creation.skills = this.baseSkills();
    this.creation.points = 9;
    for (let i = 0; i < 9; i += 1) {
      const key = this.data.skillKeys[this.roll(0, this.data.skillKeys.length - 1)];
      this.creation.skills[key] += 1;
      this.creation.points -= 1;
    }
  }

  makePlayer(name) {
    const template = this.selectedTemplate();
    const skills = { ...this.creation.skills };
    for (const [key, value] of Object.entries(template.bonus)) {
      skills[key] += value;
    }
    const player = {
      id: template.id,
      name: name.trim() || "Sem Nome",
      title: template.name,
      role: template.role,
      img: template.img,
      skills,
      inventory: [],
      training: this.emptyTrainingAllocations(),
      guarded: false,
      rattled: 0,
      wins: 0,
    };
    this.syncVitals(player, true);
    return player;
  }

  startGame(playerName) {
    this.state.player = this.makePlayer(playerName);
    this.state.gold = 25;
    this.state.xp = 0;
    this.state.level = 1;
    this.state.statPoints = 0;
    this.state.arenaIndex = 0;
    this.setScreen("hub");
  }

  startBattle() {
    this.state.round = 1;
    this.state.phase = "battle";
    this.state.enemy = this.makeEnemy(this.state.arenaIndex);
    this.syncVitals(this.state.player, true);
    this.setScreen("battle");
  }

  makeEnemy(index) {
    const base = this.data.opponents[index % this.data.opponents.length];
    const cycle = Math.floor(index / this.data.opponents.length);
    const enemy = {
      ...base,
      id: `${base.id}-${index}`,
      baseId: base.id,
      skills: Object.fromEntries(Object.entries(base.skills).map(([key, value]) => [key, value + cycle])),
      guarded: false,
      rattled: 0,
      rewardGold: base.rewardGold + cycle * 25,
      rewardXp: base.rewardXp + cycle * 30,
    };
    this.syncVitals(enemy, true);
    return enemy;
  }

  buyItem(id) {
    const item = this.data.shopItems.find((entry) => entry.id === id);
    if (!item || !this.state.player || this.state.gold < item.price) return false;
    this.state.gold -= item.price;
    this.state.player.skills[item.skill] += item.amount;
    this.state.player.inventory.push(item.id);
    this.syncVitals(this.state.player, true);
    return true;
  }

  trainSkill(key, delta) {
    const player = this.state.player;
    if (!player || !this.data.skillKeys.includes(key)) return false;
    player.training ||= this.emptyTrainingAllocations();

    if (delta > 0) {
      if (this.state.statPoints <= 0) return false;
      player.skills[key] += 1;
      player.training[key] += 1;
      this.state.statPoints -= 1;
    }

    if (delta < 0) {
      if ((player.training[key] || 0) <= 0) return false;
      player.skills[key] -= 1;
      player.training[key] -= 1;
      this.state.statPoints += 1;
    }

    this.syncVitals(player, true);
    return true;
  }

  syncVitals(unit, refill = false) {
    unit.maxHp = 82 + unit.skills.vitality * 14 + unit.skills.defence * 4;
    unit.maxStamina = 48 + unit.skills.stamina * 10 + unit.skills.strength * 3;
    unit.strength = unit.skills.strength + Math.ceil(unit.skills.attack / 2);
    unit.agility = unit.skills.agility;
    unit.armor = unit.skills.defence;
    unit.will = unit.skills.magicka + Math.ceil(unit.skills.charisma / 2);
    unit.skill = unit.skills.magicka > unit.skills.attack ? "Selo Arcano" : "Golpe da Coroa";
    if (refill || unit.hp == null) unit.hp = unit.maxHp;
    if (refill || unit.stamina == null) unit.stamina = unit.maxStamina;
    unit.hp = this.clamp(unit.hp, 0, unit.maxHp);
    unit.stamina = this.clamp(unit.stamina, 0, unit.maxStamina);
  }

  setBusy(isBusy) {
    this.state.busy = isBusy;
  }

  canAct(action) {
    return !this.state.busy && this.state.phase === "battle" && this.state.player?.stamina >= ACTION_COSTS[action];
  }

  spendStamina(unit, amount) {
    unit.stamina = this.clamp(unit.stamina - amount, 0, unit.maxStamina);
  }

  restoreStamina(unit, amount) {
    unit.stamina = this.clamp(unit.stamina + amount, 0, unit.maxStamina);
  }

  applyDamage(target, amount) {
    target.hp = this.clamp(target.hp - amount, 0, target.maxHp);
  }

  accuracy(attacker, defender, action) {
    const base = action === "heavy" ? 0.62 : action === "skill" ? 0.72 : 0.84;
    const agilitySwing = (attacker.agility - defender.agility) * 0.018;
    const fatigue = attacker.stamina < 18 ? -0.16 : 0;
    const rattled = attacker.rattled ? -0.08 : 0;
    return this.clamp(base + agilitySwing + fatigue + rattled, 0.22, 0.96);
  }

  damageAmount(attacker, defender, action) {
    const actionPower = {
      quick: [5, 11, 1],
      heavy: [12, 23, 1.35],
      skill: [10, 20, 1.15],
    }[action];
    const stat = action === "skill" ? attacker.will : attacker.strength;
    const raw = Math.round(stat * actionPower[2] + this.roll(actionPower[0], actionPower[1]));
    const block = defender.guarded ? defender.armor * 1.35 : defender.armor * 0.72;
    const critChance = this.clamp(0.08 + attacker.agility * 0.008, 0.08, 0.28);
    const critical = this.chance(critChance);
    const finalDamage = Math.max(2, Math.round((raw - block) * (critical ? 1.65 : 1)));
    return { finalDamage, critical };
  }

  trainingPointsReward() {
    return this.state.player.wins % 2 === 0 ? 1 : 0;
  }

  completeVictory() {
    const { player, enemy } = this.state;
    player.wins += 1;
    this.state.phase = "victory";
    const earnedPoints = this.trainingPointsReward();
    this.state.gold += enemy.rewardGold;
    this.state.xp += enemy.rewardXp;
    this.state.statPoints += earnedPoints;
    const result = {
      rewardGold: enemy.rewardGold,
      rewardXp: enemy.rewardXp,
      earnedPoints,
      levels: [],
    };
    while (this.state.xp >= this.xpToNextLevel()) {
      this.state.xp -= this.xpToNextLevel();
      this.state.level += 1;
      result.levels.push(this.state.level);
    }
    this.state.arenaIndex += 1;
    return result;
  }

  markDefeat() {
    this.state.phase = "defeat";
  }

  nextRound() {
    this.state.round += 1;
  }

  xpToNextLevel() {
    return 80 + (this.state.level - 1) * 55;
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  roll(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  chance(value) {
    return Math.random() < value;
  }
}

class GameView {
  constructor(model) {
    this.model = model;
    this.dom = {
      screens: {
        creator: document.querySelector("#creatorScreen"),
        hub: document.querySelector("#hubScreen"),
        shop: document.querySelector("#shopScreen"),
        train: document.querySelector("#trainScreen"),
        battle: document.querySelector("#battleScreen"),
      },
      screenEyebrow: document.querySelector("#screenEyebrow"),
      playerNameInput: document.querySelector("#playerName"),
      creatorChoices: document.querySelector("#creatorChoices"),
      creatorSkills: document.querySelector("#creatorSkills"),
      creationPoints: document.querySelector("#creationPoints"),
      creatorPreview: document.querySelector("#creatorPreview"),
      startGameButton: document.querySelector("#startGameButton"),
      randomizeButton: document.querySelector("#randomizeButton"),
      hubStats: document.querySelector("#hubStats"),
      shopStats: document.querySelector("#shopStats"),
      trainStats: document.querySelector("#trainStats"),
      hubCharacter: document.querySelector("#hubCharacter"),
      shopCharacter: document.querySelector("#shopCharacter"),
      trainCharacter: document.querySelector("#trainCharacter"),
      shopItems: document.querySelector("#shopItems"),
      trainSkills: document.querySelector("#trainSkills"),
      allyTeam: document.querySelector("#allyTeam"),
      enemyTeam: document.querySelector("#enemyTeam"),
      battleLog: document.querySelector("#battleLog"),
      actions: document.querySelector("#actions"),
      roundCounter: document.querySelector("#roundCounter"),
      goldCounter: document.querySelector("#goldCounter"),
      levelCounter: document.querySelector("#levelCounter"),
      turnHint: document.querySelector("#turnHint"),
      resetButton: document.querySelector("#resetButton"),
      slashEffect: document.querySelector("#slashEffect"),
      battlefield: document.querySelector(".battlefield"),
    };
  }

  get playerName() {
    return this.dom.playerNameInput.value;
  }

  applyTheme(id = this.model.activeThemeId()) {
    document.body.dataset.theme = id;
  }

  syncScreen() {
    const { screen } = this.model.state;
    document.body.dataset.screen = screen;
    this.applyTheme();
    Object.entries(this.dom.screens).forEach(([key, el]) => el.classList.toggle("active", key === screen));
    this.dom.screenEyebrow.textContent = SCREEN_LABELS[screen];
  }

  render() {
    this.syncScreen();
    this.renderTopStats();
    if (this.model.state.screen === "creator") this.renderCreator();
    if (this.model.state.screen === "hub") this.renderHub();
    if (this.model.state.screen === "shop") this.renderShop();
    if (this.model.state.screen === "train") this.renderTrain();
    if (this.model.state.screen === "battle") this.renderBattle();
  }

  renderTopStats() {
    const { state } = this.model;
    this.dom.roundCounter.textContent = state.screen === "battle" ? state.round : "-";
    this.dom.goldCounter.textContent = state.gold;
    this.dom.levelCounter.textContent = state.level;
  }

  renderCreator() {
    const { creation, data } = this.model;
    this.applyTheme(creation.selectedId);
    this.dom.creatorChoices.replaceChildren(
      ...data.champions.map((template) => {
        const button = document.createElement("button");
        button.className = "choice-button";
        button.type = "button";
        button.dataset.champion = template.id;
        if (template.id === creation.selectedId) button.classList.add("active");
        button.innerHTML = `
          <img src="${template.img}" alt="">
          <span><b>${template.name}</b><small>${template.role}</small></span>
          <strong>${Object.entries(template.bonus)
            .map(([key, value]) => `+${value} ${data.skillLabels[key]}`)
            .join(" ")}</strong>
        `;
        return button;
      }),
    );
    this.dom.creatorSkills.replaceChildren(...data.skillKeys.map((key) => this.skillControl(key, creation.skills, "creator")));
    this.dom.creationPoints.textContent = creation.points;
    this.dom.creatorPreview.src = this.model.selectedTemplate().img;
  }

  skillControl(key, skills, mode) {
    const { state, data } = this.model;
    const row = document.createElement("div");
    row.className = "skill-row";
    const value = mode === "creator" ? this.model.totalSkillValue(skills, key) : skills[key];
    row.innerHTML = `
      <span>${data.skillLabels[key]}</span>
      <strong>${value}</strong>
      <button type="button" data-skill="${key}" data-delta="-1">-</button>
      <button type="button" data-skill="${key}" data-delta="1">+</button>
    `;

    const [minus, plus] = row.querySelectorAll("button");
    if (mode === "creator") {
      minus.disabled = this.model.creation.skills[key] <= 1;
      plus.disabled = this.model.creation.points <= 0;
    } else {
      minus.disabled = (state.player.training?.[key] || 0) <= 0;
      plus.disabled = state.statPoints <= 0;
    }
    return row;
  }

  renderStatsCard(target) {
    const { player } = this.model.state;
    if (!player) return;
    target.innerHTML = `
      <h2>${player.name}</h2>
      <p>${player.title}</p>
      <div class="mini-stat"><span>HP</span><strong>${player.hp}/${player.maxHp}</strong></div>
      <div class="mini-stat"><span>Folego</span><strong>${player.stamina}/${player.maxStamina}</strong></div>
      ${this.model.data.skillKeys.map((key) => `<div class="mini-stat"><span>${this.model.data.skillLabels[key]}</span><strong>${player.skills[key]}</strong></div>`).join("")}
      <p>XP ${this.model.state.xp}/${this.model.xpToNextLevel()} | Pontos ${this.model.state.statPoints}</p>
    `;
  }

  renderHub() {
    const { player } = this.model.state;
    if (!player) return;
    this.renderStatsCard(this.dom.hubStats);
    this.dom.hubCharacter.src = player.img;
  }

  renderShop() {
    const { state, data } = this.model;
    if (!state.player) return;
    this.renderStatsCard(this.dom.shopStats);
    this.dom.shopCharacter.src = state.player.img;
    this.dom.shopItems.replaceChildren(
      ...data.shopItems.map((item) => {
        const row = document.createElement("div");
        row.className = "shop-item";
        row.innerHTML = `
          <div><b>${item.name}</b><span>+${item.amount} ${data.skillLabels[item.skill]} | ${item.price} ouro</span></div>
          <button type="button" data-buy="${item.id}" ${state.gold < item.price ? "disabled" : ""}>Comprar</button>
        `;
        return row;
      }),
    );
  }

  renderTrain() {
    const { player } = this.model.state;
    if (!player) return;
    this.renderStatsCard(this.dom.trainStats);
    this.dom.trainCharacter.src = player.img;
    this.dom.trainSkills.replaceChildren(...this.model.data.skillKeys.map((key) => this.skillControl(key, player.skills, "train")));
  }

  renderBattle() {
    const { player, enemy, phase, busy } = this.model.state;
    if (!player || !enemy) return;
    document.body.dataset.battleScene = enemy.baseId === "ogre" ? "dungeon" : "coliseum";
    this.dom.turnHint.textContent =
      phase === "battle"
        ? `${player.name} contra ${enemy.name}`
        : phase === "victory"
          ? "Vitoria na arena. Volte ao menu para treinar, comprar ou lutar de novo."
          : "Derrota. Volte ao menu e tente outra estrategia.";
    this.dom.allyTeam.replaceChildren(this.combatantCard(player, "ally"));
    this.dom.enemyTeam.replaceChildren(this.combatantCard(enemy, "enemy"));
    this.setActionButtons(busy);
  }

  combatantCard(unit, side) {
    const button = document.createElement("button");
    button.className = `combatant ${side}`;
    button.dataset.unit = unit.id;
    button.type = "button";
    button.ariaLabel = `${unit.name}, ${unit.hp} pontos de vida`;
    if (unit.hp <= 0) button.classList.add("defeated");
    button.innerHTML = `
      <img src="${unit.img}" alt="${unit.name}">
      <div class="plate">
        <strong>${unit.name}</strong>
        <div class="bar hp"><span style="--value:${this.percent(unit.hp, unit.maxHp)}"></span></div>
        <div class="bar mana"><span style="--value:${this.percent(unit.stamina, unit.maxStamina)}"></span></div>
        <div class="meter-labels"><span>vida</span><span>folego</span></div>
      </div>
    `;
    return button;
  }

  setActionButtons(isBusy) {
    this.dom.actions.querySelectorAll("button").forEach((button) => {
      button.disabled = isBusy || this.model.state.phase !== "battle";
    });
  }

  clearBattleLog() {
    this.dom.battleLog?.replaceChildren();
  }

  logLine(text) {
    if (!this.dom.battleLog) return;
    const p = document.createElement("p");
    p.textContent = text;
    this.dom.battleLog.prepend(p);
    while (this.dom.battleLog.children.length > 8) this.dom.battleLog.lastChild.remove();
  }

  getCombatantElement(id) {
    return document.querySelector(`[data-unit="${id}"]`);
  }

  flashClass(element, className, duration = 520) {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    window.setTimeout(() => element.classList.remove(className), duration);
  }

  showDamage(targetId, amount, label = null) {
    const target = this.getCombatantElement(targetId);
    if (!target || !this.dom.battlefield) return;
    const targetRect = target.getBoundingClientRect();
    const fieldRect = this.dom.battlefield.getBoundingClientRect();
    const pop = document.createElement("div");
    pop.className = "damage-pop";
    pop.textContent = label || (amount > 0 ? `-${amount}` : "erro");
    pop.style.left = `${targetRect.left - fieldRect.left + targetRect.width * 0.42}px`;
    pop.style.top = `${targetRect.top - fieldRect.top + targetRect.height * 0.25}px`;
    this.dom.battlefield.appendChild(pop);
    window.setTimeout(() => pop.remove(), 900);
  }

  playSlash(targetId, action) {
    const target = this.getCombatantElement(targetId);
    if (!target) return;
    const targetRect = target.getBoundingClientRect();
    const fieldRect = this.dom.battlefield.getBoundingClientRect();
    this.dom.slashEffect.style.left = `${targetRect.left - fieldRect.left + targetRect.width * 0.34}px`;
    this.dom.slashEffect.style.top = `${targetRect.top - fieldRect.top + targetRect.height * 0.23}px`;
    this.dom.slashEffect.classList.remove("play", "quick");
    void this.dom.slashEffect.offsetWidth;
    if (action === "quick") this.dom.slashEffect.classList.add("quick");
    this.dom.slashEffect.classList.add("play");
  }

  percent(current, max) {
    return `${Math.max(0, Math.min(100, Math.round((current / max) * 100)))}%`;
  }
}

class GameController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.bindEvents();
  }

  bindEvents() {
    const { dom } = this.view;

    dom.creatorChoices.addEventListener("click", (event) => {
      const championId = event.target.closest("[data-champion]")?.dataset.champion;
      if (!championId) return;
      this.model.setSelectedChampion(championId);
      this.view.renderCreator();
    });

    dom.creatorSkills.addEventListener("click", (event) => {
      const button = event.target.closest("[data-skill]");
      if (!button) return;
      if (this.model.changeCreationSkill(button.dataset.skill, Number(button.dataset.delta))) {
        this.view.renderCreator();
      }
    });

    dom.trainSkills.addEventListener("click", (event) => {
      const button = event.target.closest("[data-skill]");
      if (!button) return;
      if (this.model.trainSkill(button.dataset.skill, Number(button.dataset.delta))) {
        this.view.render();
      }
    });

    dom.startGameButton.addEventListener("click", () => {
      this.model.startGame(this.view.playerName);
      this.view.render();
    });

    dom.randomizeButton.addEventListener("click", () => {
      this.model.randomizeCreation();
      this.view.renderCreator();
    });

    document.addEventListener("click", (event) => {
      const route = event.target.closest("[data-route]")?.dataset.route;
      if (!route) return;
      this.navigate(route);
    });

    dom.shopItems.addEventListener("click", (event) => {
      const id = event.target.closest("[data-buy]")?.dataset.buy;
      if (id && this.model.buyItem(id)) this.view.render();
    });

    dom.actions.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      this.playerAction(button.dataset.action);
    });

    document.addEventListener("keydown", (event) => {
      if (this.model.state.screen !== "battle" || event.repeat) return;
      const action = { c: "quick", f: "heavy", m: "skill" }[event.key.toLowerCase()];
      if (action) this.playerAction(action);
    });

    dom.resetButton.addEventListener("click", () => this.navigate("hub"));
  }

  navigate(route) {
    if (route === "battle") {
      this.model.startBattle();
      this.view.clearBattleLog();
    } else {
      this.model.setScreen(route);
    }
    this.view.render();
  }

  async playerAction(action) {
    const { player, enemy } = this.model.state;
    if (!this.model.canAct(action)) {
      if (player?.stamina < ACTION_COSTS[action]) this.view.logLine(`${player.name} esta sem folego para essa acao.`);
      return;
    }

    this.model.setBusy(true);
    this.view.setActionButtons(true);
    player.guarded = false;
    if (player.rattled > 0) player.rattled -= 1;

    if (["quick", "heavy", "skill"].includes(action)) await this.attack(player, enemy, action);
    if (action === "taunt") await this.taunt(player, enemy, true);
    if (action === "guard") await this.guard(player);
    if (action === "rest") await this.rest(player);

    this.view.render();
    if (enemy.hp <= 0) {
      await this.winFight();
      return;
    }

    await this.enemyAction();
    if (player.hp <= 0) {
      this.model.markDefeat();
      this.view.logLine(`${player.name} caiu na areia da arena.`);
    } else {
      this.model.nextRound();
    }
    this.view.render();
    this.model.setBusy(false);
    this.view.setActionButtons(false);
  }

  async attack(attacker, defender, action) {
    this.model.spendStamina(attacker, ACTION_COSTS[action]);
    this.view.flashClass(this.view.getCombatantElement(attacker.id), "attack");
    await this.pause(220);
    if (!this.model.chance(this.model.accuracy(attacker, defender, action))) {
      this.view.showDamage(defender.id, 0, "erro");
      this.view.logLine(`${attacker.name} erra o ${this.actionName(action)}.`);
      await this.pause(520);
      return;
    }

    const { finalDamage, critical } = this.model.damageAmount(attacker, defender, action);
    this.view.playSlash(defender.id, action);
    this.view.flashClass(this.view.getCombatantElement(defender.id), "hit");
    this.model.applyDamage(defender, finalDamage);
    defender.guarded = false;
    this.view.showDamage(defender.id, finalDamage, critical ? `-${finalDamage}!` : null);
    this.view.logLine(`${attacker.name} usa ${this.actionName(action)} e causa ${finalDamage}${critical ? " critico" : ""}.`);
    await this.pause(720);
  }

  async taunt(actor, target, isPlayer) {
    this.model.spendStamina(actor, ACTION_COSTS.taunt);
    target.rattled = isPlayer ? 2 : 1;
    this.model.restoreStamina(actor, 8);
    this.view.flashClass(this.view.getCombatantElement(actor.id), "taunt", 620);
    this.view.logLine(
      isPlayer
        ? `${actor.name} provoca ${target.name}; a mira inimiga treme.`
        : `${actor.name} tenta quebrar a confianca do campeao.`,
    );
    await this.pause(620);
  }

  async guard(actor) {
    actor.guarded = true;
    this.model.restoreStamina(actor, 15 + actor.will);
    this.view.flashClass(this.view.getCombatantElement(actor.id), "guard", 680);
    this.view.logLine(`${actor.name} fecha a guarda e recupera folego.`);
    await this.pause(680);
  }

  async rest(actor) {
    this.model.restoreStamina(actor, 28 + actor.will);
    actor.hp = this.model.clamp(actor.hp + Math.ceil(actor.armor / 2), 0, actor.maxHp);
    this.view.logLine(`${actor.name} respira fundo e se recompoe.`);
    await this.pause(520);
  }

  async enemyAction() {
    const { enemy, player } = this.model.state;
    enemy.guarded = false;
    if (enemy.rattled > 0) enemy.rattled -= 1;

    let action = "quick";
    if (enemy.stamina < 12) action = "rest";
    else if (player.guarded && this.model.chance(0.45)) action = "taunt";
    else if (enemy.stamina > 28 && this.model.chance(0.42)) action = "heavy";
    else if (enemy.stamina > 22 && this.model.chance(0.24)) action = "skill";

    if (["quick", "heavy", "skill"].includes(action)) {
      await this.attack(enemy, player, action);
      return;
    }
    if (action === "taunt") {
      await this.taunt(enemy, player, false);
      return;
    }

    this.model.restoreStamina(enemy, 24 + enemy.will);
    enemy.guarded = true;
    this.view.flashClass(this.view.getCombatantElement(enemy.id), "guard", 620);
    this.view.logLine(`${enemy.name} recua e recupera folego.`);
    await this.pause(620);
  }

  async winFight() {
    const result = this.model.completeVictory();
    const { player } = this.model.state;
    this.view.logLine(
      `${player.name} venceu. +${result.rewardGold} ouro, +${result.rewardXp} XP${result.earnedPoints ? `, +${result.earnedPoints} ponto de treino` : ""}.`,
    );
    result.levels.forEach((level) => this.view.logLine(`Nivel ${level}.`));
    this.view.render();
    this.model.setBusy(false);
    this.view.setActionButtons(false);
  }

  actionName(action) {
    return { quick: "ataque leve", heavy: "ataque forte", skill: "especial" }[action];
  }

  pause(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
}

const model = new GameModel(GAME_DATA);
const view = new GameView(model);
new GameController(model, view);
view.applyTheme();
view.render();
