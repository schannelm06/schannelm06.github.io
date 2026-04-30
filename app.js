let allQuestions = [];
let activeQuestions = [];
let currentIndex = 0;

let score = 0;
let xp = 0;
let streak = 0;
let correctCount = 0;
let answeredCount = 0;

let selectedAnswers = [];
let missedQuestions = [];
let unlockedAchievements = new Set();

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const restartBtn = document.getElementById("restartBtn");

const categoryFilter = document.getElementById("categoryFilter");
const modeSelect = document.getElementById("modeSelect");

const scoreValue = document.getElementById("scoreValue");
const streakValue = document.getElementById("streakValue");
const xpValue = document.getElementById("xpValue");
const levelValue = document.getElementById("levelValue");

const progressText = document.getElementById("progressText");
const accuracyText = document.getElementById("accuracyText");
const progressFill = document.getElementById("progressFill");

const categoryBadge = document.getElementById("categoryBadge");
const difficultyBadge = document.getElementById("difficultyBadge");
const taskTypeBadge = document.getElementById("taskTypeBadge");

const realmEmoji = document.getElementById("realmEmoji");
const realmTitle = document.getElementById("realmTitle");
const questionText = document.getElementById("questionText");
const answerChoices = document.getElementById("answerChoices");

const feedbackBox = document.getElementById("feedbackBox");
const feedbackTitle = document.getElementById("feedbackTitle");
const selectedExplanation = document.getElementById("selectedExplanation");
const correctExplanation = document.getElementById("correctExplanation");
const summaryExplanation = document.getElementById("summaryExplanation");

const submitBtn = document.getElementById("submitBtn");
const nextBtn = document.getElementById("nextBtn");

const achievementsList = document.getElementById("achievementsList");
const resultsScreen = document.getElementById("resultsScreen");
const finalScoreText = document.getElementById("finalScoreText");
const finalXPText = document.getElementById("finalXPText");
const finalAccuracyText = document.getElementById("finalAccuracyText");
const missedQuestionsReview = document.getElementById("missedQuestionsReview");

async function loadQuestions() {
  try {
    const response = await fetch("questions.json");

    if (!response.ok) {
      throw new Error("Could not load questions.json");
    }

    allQuestions = await response.json();
    activeQuestions = [...allQuestions];

    populateCategories();
    updateStats();
    updateProgress();
  } catch (error) {
    questionText.textContent =
      "The question scrolls could not be loaded. Make sure questions.json is in the same folder.";
    console.error(error);
  }
}

function populateCategories() {
  const categories = [...new Set(allQuestions.map(q => q.category))];

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

function startQuest() {
  resetGameState();

  const selectedCategory = categoryFilter.value;

  activeQuestions =
    selectedCategory === "all"
      ? [...allQuestions]
      : allQuestions.filter(q => q.category === selectedCategory);

  activeQuestions = shuffleArray(activeQuestions);

  if (activeQuestions.length === 0) {
    questionText.textContent = "No questions found for this realm.";
    return;
  }

  resultsScreen.classList.add("hidden");
  displayQuestion();
}

function resetGameState() {
  currentIndex = 0;
  score = 0;
  xp = 0;
  streak = 0;
  correctCount = 0;
  answeredCount = 0;
  selectedAnswers = [];
  missedQuestions = [];
  unlockedAchievements.clear();

  feedbackBox.classList.add("hidden");
  submitBtn.classList.remove("hidden");
  nextBtn.classList.add("hidden");

  achievementsList.innerHTML =
    '<p class="empty-state">No achievements yet. Win battles to earn your crown.</p>';

  updateStats();
  updateProgress();
}

function displayQuestion() {
  const question = activeQuestions[currentIndex];

  selectedAnswers = [];

  categoryBadge.textContent = question.category;
  difficultyBadge.textContent = getDifficultyLabel(question.difficulty);
  taskTypeBadge.textContent = question.taskType;

  realmEmoji.textContent = question.realmTheme?.rewardEmoji || "🛡️";
  realmTitle.textContent = question.realmTheme?.title || "Battle of Knowledge";

  questionText.textContent = question.question;
  answerChoices.innerHTML = "";

  feedbackBox.classList.add("hidden");
  submitBtn.classList.remove("hidden");
  nextBtn.classList.add("hidden");

  const choices = question.shuffleChoices
    ? shuffleArray([...question.choices])
    : [...question.choices];

  choices.forEach(choice => {
    const button = document.createElement("button");
    button.className = "answer-choice";
    button.textContent = choice.text;
    button.dataset.answer = choice.text;

    button.addEventListener("click", () => selectAnswer(button, choice));

    answerChoices.appendChild(button);
  });

  updateProgress();
}

function selectAnswer(button, choice) {
  const question = activeQuestions[currentIndex];
  const isMultiSelect = question.taskType === "MULTI_SELECT";

  if (isMultiSelect) {
    button.classList.toggle("selected");

    const exists = selectedAnswers.some(answer => answer.text === choice.text);

    if (exists) {
      selectedAnswers = selectedAnswers.filter(answer => answer.text !== choice.text);
    } else {
      selectedAnswers.push(choice);
    }
  } else {
    document.querySelectorAll(".answer-choice").forEach(btn => {
      btn.classList.remove("selected");
    });

    button.classList.add("selected");
    selectedAnswers = [choice];
  }
}

function submitAnswer() {
  const question = activeQuestions[currentIndex];

  if (selectedAnswers.length === 0) {
    feedbackBox.classList.remove("hidden");
    feedbackTitle.textContent = "Choose your answer first ⚔️";
    selectedExplanation.textContent = "The realm demands a decision before judgment.";
    correctExplanation.textContent = "";
    summaryExplanation.textContent = "";
    return;
  }

  const correctChoices = question.choices.filter(choice => choice.isCorrect);
  const isCorrect = checkAnswer(selectedAnswers, correctChoices);

  answeredCount++;

  revealAnswerStyles(question);

  if (isCorrect) {
    handleCorrectAnswer(question);
  } else {
    handleIncorrectAnswer(question, correctChoices);
  }

  showFeedback(question, isCorrect, correctChoices);

  submitBtn.classList.add("hidden");
  nextBtn.classList.remove("hidden");

  updateStats();
  updateProgress();
  checkAchievements(question, isCorrect);
}

function checkAnswer(selected, correct) {
  if (selected.length !== correct.length) return false;

  const selectedTexts = selected.map(answer => answer.text).sort();
  const correctTexts = correct.map(answer => answer.text).sort();

  return selectedTexts.every((text, index) => text === correctTexts[index]);
}

function revealAnswerStyles(question) {
  const buttons = document.querySelectorAll(".answer-choice");

  buttons.forEach(button => {
    const choice = question.choices.find(c => c.text === button.dataset.answer);

    button.disabled = true;

    if (choice.isCorrect) {
      button.classList.add("correct");
    }

    const wasSelected = selectedAnswers.some(answer => answer.text === choice.text);

    if (wasSelected && !choice.isCorrect) {
      button.classList.add("incorrect");
    }
  });
}

function handleCorrectAnswer(question) {
  score += question.points;
  xp += question.xp;
  streak++;
  correctCount++;

  feedbackTitle.textContent = `Victory won ${question.realmTheme?.rewardEmoji || "👑"}`;

  xpValue.classList.add("xp-pop");
  setTimeout(() => xpValue.classList.remove("xp-pop"), 600);

  if (streak > 0 && streak % 5 === 0) {
    launchConfetti(120);
  }
}

function handleIncorrectAnswer(question, correctChoices) {
  streak = 0;

  missedQuestions.push({
    question: question.question,
    selected: selectedAnswers.map(answer => answer.text),
    correct: correctChoices.map(answer => answer.text),
    summary: question.summaryExplanation
  });

  feedbackTitle.textContent = "The realm pushes back 🛡️";
}

function showFeedback(question, isCorrect, correctChoices) {
  const mode = modeSelect.value;

  if (mode === "exam" && currentIndex < activeQuestions.length - 1) {
    feedbackBox.classList.add("hidden");
    return;
  }

  feedbackBox.classList.remove("hidden");

  const selectedText = selectedAnswers
    .map(answer => `${answer.text}: ${answer.explanation}`)
    .join(" ");

  const correctText = correctChoices
    .map(answer => `${answer.text}: ${answer.explanation}`)
    .join(" ");

  selectedExplanation.textContent = `Your answer: ${selectedText}`;
  correctExplanation.textContent = isCorrect
    ? ""
    : `Correct answer: ${correctText}`;
  summaryExplanation.textContent = `Battle lesson: ${question.summaryExplanation}`;
}

function nextQuestion() {
  currentIndex++;

  if (currentIndex >= activeQuestions.length) {
    endQuest();
  } else {
    displayQuestion();
  }
}

function endQuest() {
  submitBtn.classList.add("hidden");
  nextBtn.classList.add("hidden");
  feedbackBox.classList.add("hidden");

  const accuracy = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);

  finalScoreText.textContent = `Final Score: ${score} points`;
  finalXPText.textContent = `XP Earned: ${xp} ⚡`;
  finalAccuracyText.textContent = `Accuracy: ${accuracy}%`;

  buildMissedReview();

  resultsScreen.classList.remove("hidden");

  if (accuracy >= 80) {
    launchConfetti(220);
    unlockAchievement("👑 Crowned CPA Challenger", "You scored 80% or higher on the quest.");
  }

  if (accuracy === 100) {
    launchConfetti(350);
    unlockAchievement("🐉 Dragon-Level Perfect Run", "You completed the quest with 100% accuracy.");
  }

  updateStats();
}

function buildMissedReview() {
  missedQuestionsReview.innerHTML = "";

  if (missedQuestions.length === 0) {
    missedQuestionsReview.innerHTML =
      '<div class="missed-card"><h3>No missed questions 🏆</h3><p>You defended the realm perfectly.</p></div>';
    return;
  }

  missedQuestions.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "missed-card";

    card.innerHTML = `
      <h3>Missed Battle ${index + 1}</h3>
      <p><strong>Question:</strong> ${item.question}</p>
      <p><strong>Your answer:</strong> ${item.selected.join(", ")}</p>
      <p><strong>Correct answer:</strong> ${item.correct.join(", ")}</p>
      <p><strong>Lesson:</strong> ${item.summary}</p>
    `;

    missedQuestionsReview.appendChild(card);
  });
}

function updateStats() {
  scoreValue.textContent = score;
  streakValue.textContent = streak;
  xpValue.textContent = xp;
  levelValue.textContent = calculateLevel(xp);
}

function updateProgress() {
  const total = activeQuestions.length || 0;
  const current = total === 0 ? 0 : Math.min(currentIndex + 1, total);

  progressText.textContent = `Quest Progress: ${current} of ${total}`;

  const accuracy = answeredCount === 0 ? 0 : Math.round((correctCount / answeredCount) * 100);
  accuracyText.textContent = `Accuracy: ${accuracy}%`;

  const progressPercent = total === 0 ? 0 : Math.round((currentIndex / total) * 100);
  progressFill.style.width = `${progressPercent}%`;
}

function calculateLevel(totalXP) {
  return Math.floor(totalXP / 100) + 1;
}

function checkAchievements(question, isCorrect) {
  if (!isCorrect) return;

  if (streak === 3) {
    unlockAchievement("🔥 Oath of Three", "You answered 3 questions correctly in a row.");
  }

  if (streak === 5) {
    unlockAchievement("⚔️ Five-Battle Streak", "You answered 5 questions correctly in a row.");
  }

  if (question.category.includes("SOC")) {
    unlockAchievement("📜 Keeper of SOC Scrolls", "You won a SOC engagement battle.");
  }

  if (question.category.includes("Security")) {
    unlockAchievement("🛡️ Castle Security Defender", "You won a security, confidentiality, or privacy battle.");
  }

  if (question.category.includes("Data")) {
    unlockAchievement("🏰 Data Realm Protector", "You won a data management battle.");
  }
}

function unlockAchievement(title, description) {
  if (unlockedAchievements.has(title)) return;

  unlockedAchievements.add(title);

  const emptyState = achievementsList.querySelector(".empty-state");
  if (emptyState) {
    achievementsList.innerHTML = "";
  }

  const card = document.createElement("div");
  card.className = "achievement-card";

  card.innerHTML = `
    <h3>${title}</h3>
    <p>${description}</p>
  `;

  achievementsList.appendChild(card);
  launchConfetti(80);
}

function getDifficultyLabel(difficulty) {
  if (difficulty === "Easy") return "Easy 🌱";
  if (difficulty === "Medium") return "Medium ⚔️";
  if (difficulty === "Hard") return "Hard 🐉";
  return difficulty;
}

function launchConfetti(amount = 120) {
  if (typeof confetti !== "function") return;

  confetti({
    particleCount: amount,
    spread: 90,
    origin: { y: 0.6 }
  });
}

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

function resetRealm() {
  resetGameState();

  activeQuestions = [...allQuestions];

  questionText.textContent =
    "Click “Begin Quest” to start your ISC CPA practice session.";

  answerChoices.innerHTML = "";
  categoryBadge.textContent = "Category";
  difficultyBadge.textContent = "Difficulty";
  taskTypeBadge.textContent = "Question Type";
  realmEmoji.textContent = "🛡️";
  realmTitle.textContent = "The Realm Awaits";

  submitBtn.classList.add("hidden");
  nextBtn.classList.add("hidden");
  resultsScreen.classList.add("hidden");
}

startBtn.addEventListener("click", startQuest);
resetBtn.addEventListener("click", resetRealm);
restartBtn.addEventListener("click", startQuest);
submitBtn.addEventListener("click", submitAnswer);
nextBtn.addEventListener("click", nextQuestion);
categoryFilter.addEventListener("change", startQuest);

loadQuestions();