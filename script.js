// 1. HERE WE PUT SIMPLE SETTINGS FOR THE GAME
// ------------------------------------------

// 1.1 This is a list of words that can fall down in the game.
const WORDS = [
  "cat", "dog", "javascript", "code", "school",
  "typing", "keyboard", "game", "browser", "student",
  "letter", "dom", "event", "storage", "function"
];

// 1.2 How often we move the falling word down (in milliseconds).
//     Smaller number = smoother but more updates.
const FALL_INTERVAL_MS = 30;

// 1.3 Starting speed: how many pixels the word moves down each update.
const START_FALL_SPEED = 1.3;

// 1.4 How much faster the word should fall after each correctly typed word.
const SPEED_INCREASE_PER_WORD = 0.15;

// 1.5 Maximum fall speed so the game does not become impossible.
const MAX_FALL_SPEED = 8;

// 1.6 Key for saving best score in the browser.
const STORAGE_KEY_BEST_SCORE = "fallingWordsBestScore";


// 2. HERE WE PUT VARIABLES THAT WILL CHANGE WHILE WE PLAY
// -------------------------------------------------------

// 2.1 Info about the word we are currently typing.
let currentWord = "";      // the word that is falling right now
let typedLetters = "";     // what we already typed for this word

// 2.2 Score tracking.
let score = 0;             // current score in this run
let bestScore = 0;         // best score saved in localStorage

// 2.3 Game state and falling control.
let isGameRunning = false; // true = game is active, false = game is stopped
let wordY = 0;             // vertical position (top) of the falling word, in pixels
let currentFallSpeed = START_FALL_SPEED; // current fall speed

let fallIntervalId = null; // id of setInterval for the fall animation

// 2.4 Timer and typing speed (BPS = letters per second).
let gameStartTimeMs = 0;      // when this game started (in milliseconds)
let timerIntervalId = null;   // id of setInterval for the timer
let totalTypedCharacters = 0; // how many letters the player typed in this run

var totalS = 0;

// 3. WE WAIT UNTIL THE HTML PAGE IS LOADED, THEN WE RUN OUR GAME SETUP
// --------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", function () {

  // 3.1 Here we grab all important HTML elements (by their IDs).

  // 3.1.1 Main screens
  const menuScreen = document.getElementById("menu-screen");
  const gameScreen = document.getElementById("game-screen");

  // 3.1.2 Buttons in the main menu
  const startBtn = document.getElementById("start-btn");
  const guidelinesBtn = document.getElementById("guidelines-btn");

  // 3.1.3 Guidelines (how to play) overlay
  const guidelinesModal = document.getElementById("guidelines-modal");
  const closeGuidelinesBtn = document.getElementById("close-guidelines");

  // 3.1.4 Button to go back to menu from game
  const backToMenuBtn = document.getElementById("back-to-menu");

  // 3.1.5 Play area and the falling word
  const playArea = document.getElementById("play-area");
  const fallingWordEl = document.getElementById("falling-word");

  const animationEl = document.getElementById('word-animation');

  // 3.1.6 Letter boxes below the play area
  const lettersContainer = document.getElementById("letters-container");

  // 3.1.7 Score and best score texts
  const currentScoreEl = document.getElementById("current-score");
  const bestScoreMenuEl = document.getElementById("best-score-menu");
  const bestScoreGameEl = document.getElementById("best-score-game");

  // 3.1.8 Game over overlay + its buttons
  const gameOverOverlay = document.getElementById("game-over-overlay");
  const finalScoreEl = document.getElementById("final-score");
  const finalBestScoreEl = document.getElementById("final-best-score");
  const playAgainBtn = document.getElementById("play-again-btn");
  const overlayMenuBtn = document.getElementById("overlay-menu-btn");

  // 3.1.9 Timer and BPS text in the header
  const timeElapsedEl = document.getElementById("time-elapsed");
  const bpsEl = document.getElementById("bps");

  // 5.2.3 Reset timer and BPS display to zero.
  updateTimerAndBps(0);

  var typedLetters = '';

  loadBestScore();

  function updateScoreUI() {
    currentScoreEl.innerHTML = score;
    bestScoreGameEl.innerHTML = bestScore;
  }


  // 4. SMALL HELPER: SHOW MENU OR GAME SCREEN
  // -----------------------------------------
  function showScreen(whichScreen) {
    // 4.1 If whichScreen is "menu", we show the menu and hide the game.
    if (whichScreen === "menu") {
      isGameRunning = false;
      menuScreen.classList.remove("hidden");
      gameScreen.classList.add("hidden");
      guidelinesModal.classList.add('hidden');
    }

    // 4.2 If whichScreen is "game", we show the game and hide the menu.
    if (whichScreen === "game") {
      startBtn.innerText = 'Continue'
      isGameRunning = true;
      menuScreen.classList.add("hidden");
      gameScreen.classList.remove("hidden");
      gameOverOverlay.classList.add("hidden");
      guidelinesModal.classList.add('hidden');

    }

    if (whichScreen === 'over') {
      isGameRunning = false;
      gameOverOverlay.classList.remove("hidden");

      playAgainBtn.onclick = initGame;
      finalScoreEl.innerHTML = score;
      finalBestScoreEl.innerHTML = bestScore;
      overlayMenuBtn.onclick = function () {
        showScreen('menu')
      }
    }

    if (whichScreen === 'guidelines') {
      isGameRunning = false;
      gameOverOverlay.classList.add("hidden");
      menuScreen.classList.add("hidden");

      guidelinesModal.classList.remove('hidden')
    }
  }


  // 5. FUNCTIONS FOR THE TIMER AND BPS (LETTERS PER SECOND)
  // -------------------------------------------------------

  var elapsedMs = 0;

  // 5.1 This function updates the visible time and BPS text.
  function updateTimerAndBps() {
    if (!timeElapsedEl || !bpsEl) {
      return; // safety, if HTML is missing
    }

    // 5.1.1 Convert milliseconds to whole seconds.
    const totalSeconds = Math.floor(elapsedMs / 1000);

    // 5.1.2 Compute minutes and seconds to show as MM:SS.
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const minutesText = String(minutes).padStart(2, "0");
    const secondsText = String(seconds).padStart(2, "0");

    timeElapsedEl.textContent = minutesText + ":" + secondsText;

    // 5.1.3 Calculate BPS = total typed letters / total time in seconds.
    let bps = 0;
    if (elapsedMs > 0) {
      const secondsPrecise = elapsedMs / 1000;
      bps = totalTypedCharacters / secondsPrecise;
    }

    // 5.1.4 Limit to 2 decimal places, e.g. "2.45".
    bpsEl.textContent = bps.toFixed(2);
  }

  // 5.2 This function starts the timer.
  function startTimer() {
    // 5.2.1 We note the start time.
    gameStartTimeMs = Date.now();

    // 5.2.2 Clear old timer if any.
    if (timerIntervalId !== null) {
      clearInterval(timerIntervalId);
    }



    // 5.2.4 Every 100 ms we update the display.
    timerIntervalId = setInterval(function () {
      if (!isGameRunning) {
        return; // if game is not running, do nothing
      }

      const now = Date.now();
      elapsedMs = now - gameStartTimeMs;
      updateTimerAndBps(elapsedMs);
    }, 100);
  }

  // 5.3 This function stops the timer.
  function stopTimer() {
    if (timerIntervalId !== null) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
  }


  // 6. FUNCTIONS FOR BEST SCORE (LOCAL STORAGE)
  // -------------------------------------------

  // 6.1 Load best score from browser localStorage.
  function loadBestScore() {
    const saved = localStorage.getItem(STORAGE_KEY_BEST_SCORE);
    if (saved !== null) {
      const numberValue = parseInt(saved, 10);
      if (!isNaN(numberValue)) {
        bestScore = numberValue;
      } else {
        bestScore = 0;
      }
    } else {
      bestScore = 0;
    }
    updateBestScoreUI();
  }

  // 6.2 Save best score into browser localStorage.
  function saveBestScore() {
    localStorage.setItem(STORAGE_KEY_BEST_SCORE, String(bestScore));
  }

  // 6.3 Update the best score shown on the screen (menu and game).
  function updateBestScoreUI() {
    bestScoreMenuEl.textContent = bestScore;
    bestScoreGameEl.textContent = bestScore;
  }


  // 7. FUNCTIONS FOR CREATING AND SHOWING WORDS + LETTER BOXES
  // ---------------------------------------------------------

  // 7.1 Create a new falling word and reset its position.
  function spawnNewWord() {
    // 7.1.1 Reset what the player typed for this word.
    typedLetters = "";

    // 7.1.2 Pick a random word from the WORDS list.
    const randomIndex = Math.floor(Math.random() * WORDS.length);
    currentWord = WORDS[randomIndex];

    // 7.1.3 Show it in the falling box (uppercase so it looks nice).
    fallingWordEl.textContent = currentWord.toUpperCase();

    // 7.1.4 Put the word at the top (y = 0).
    wordY = -50;
    fallingWordEl.style.top = wordY + "px";

    // 7.1.5 Create empty boxes for each letter of this word.
    createLetterBoxes(currentWord.length);
  }

  // 7.2 Create the letter boxes under the play area.
  function createLetterBoxes(length) {
    // 7.2.1 Remove old boxes.
    lettersContainer.innerHTML = "";

    // 7.2.2 Create "length" many boxes.
    console.log('logging')
    for (let i = 0; i < length; i++) {
      const box = document.createElement("div");
      box.classList.add("letter-box");
      lettersContainer.appendChild(box);
    }
  }

  // 7.3 Update how the letter boxes look (after typing).
  function updateLetterBoxes() {
    const boxes = lettersContainer.querySelectorAll(".letter-box");

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];

      // 7.3.1 Letter that the player typed at this position (or empty string).
      const letter = typedLetters[i] || "";

      // 7.3.2 Show the letter (uppercase) in the box.
      box.textContent = letter.toUpperCase();

      // 7.3.3 Remove previous styles.
      box.classList.remove("filled", "wrong");

      // 7.3.4 If there is a letter here, mark box as filled.
      if (letter !== "") {
        box.classList.add("filled");

        // 7.3.5 If the letter is wrong, mark it with the "wrong" class.
        if (letter !== currentWord[i]) {
          box.classList.add("wrong");
        } else {
          totalTypedCharacters++;
        }
      }
    }
  }

  // 7.4 Check if the whole word is typed correctly.
  function checkIfWordCompleted() {
    // 7.4.1 If we have not typed all letters yet, we do nothing.
    if (typedLetters.length !== currentWord.length) {
      return;
    }

    // 7.4.2 If typed word is equal to current word => correct!
    if (typedLetters === currentWord) {
      // 7.4.3 Increase score and update text.
      score++;
      if (score > bestScore) bestScore = score;
      saveBestScore();
      updateScoreUI();

      // 7.4.4 Increase fall speed a little, but do not go over MAX_FALL_SPEED.
      currentFallSpeed = currentFallSpeed + SPEED_INCREASE_PER_WORD;
      if (currentFallSpeed > MAX_FALL_SPEED) {
        currentFallSpeed = MAX_FALL_SPEED;
      }

      // 7.4.5 Create a new word.
      spawnNewWord();
      animateSuccessfullDeletion();
    }
    // 7.4.6 If letters are not correct, we do nothing here.
    //       The red boxes already show the mistake.
  }





  // 8. FUNCTIONS FOR FALLING ANIMATION
  // ----------------------------------



  async function animateFalling() {
    if (fallingWordEl != undefined) {
      const time = 25 - score / 2;
      const distance = score > 0 ? 1 + score / 2 : 1;
      if (isGameRunning) {


        fallingWordEl.style.top = (Number)(fallingWordEl.style.top.split('p')[0]) + distance + 'px';

        if ((Number)(fallingWordEl.style.top.split('p')[0]) > 400) {
          spawnNewWord();
          score--;
          animateHittingBottom();
          if (score <= -5) initGameOver();
          updateScoreUI();
        }

      }

      await new Promise(resolve => setTimeout(resolve, time));
      animateFalling();
    }
  }

  function animateSuccessfullDeletion() {
    console.log('aaa');
    animationEl.style.top = fallingWordEl.style.top;
    animationEl.style.backgroundColor = 'rgba(60, 255, 0, 0.3)'
    animationEl.style.transform = "scaleX(1.2)"
    setTimeout(() => {

      animationEl.style.backgroundColor = "rgba(0, 255, 42, 0)"
      animationEl.style.transform = "scaleX(0.83)"

    }, 200)
  }
  function animateHittingBottom() {
    animationEl.style.transition = "background-color 0.2s ease-out, transform 0.2s ease-in";
    animationEl.style.backgroundColor = "rgba(255,0,0,0)"; 
    animationEl.style.transform = "scaleY(1) translateY(0)";

    animationEl.style.height = "100px";
    animationEl.style.top = '100%'
    animationEl.style.transform = "scaleY(1.5)";
    animationEl.style.backgroundColor = "rgba(255,0,0,0.3)";

    setTimeout(() => {
      animationEl.style.backgroundColor = "rgba(255,0,0,0)";
    }, 200);

    setTimeout(() => {
      animationEl.style.transform = "scaleY(0.67)";
    }, 600);
  }


  // 9. SCORE AND GAME OVER LOGIC
  // ----------------------------

  function initGameOver() {
    showScreen('over')
  }

  // 10. STARTING AND STOPPING THE GAME
  // ----------------------------------


  function initGame() {
    showScreen("game")
    spawnNewWord();
    animateFalling();
    startTimer();
  }



  // 11. INITIAL SETUP: LOAD BEST SCORE AND SET UI ON PAGE LOAD
  // ----------------------------------------------------------


  // 12. BUTTON EVENTS (START, GUIDELINES, BACK, GAME OVER BUTTONS)
  // --------------------------------------------------------------

  backToMenuBtn.onclick = function () {
    showScreen('menu');
  };
  startBtn.onclick = initGame;;

  guidelinesBtn.onclick = function () {
    showScreen('guidelines')
  }
  closeGuidelinesBtn.onclick = function () {
    showScreen('menu')
  }
  // 13. KEYBOARD INPUT: TYPING LETTERS AND BACKSPACE
  // ------------------------------------------------



  document.addEventListener("keydown", function (e) {
    e = e || window.event;
    switch (e.keyCode) {
      case 27://escape
        if (menuScreen.className.includes('hidden')) {
          showScreen('menu')
        } else {
          showScreen('game');
        }
        break;
      case 8:
        typedLetters = typedLetters.substring(0, typedLetters.length - 1);
        updateLetterBoxes();
      default:
        if (isGameRunning && e.keyCode >= 65 && e.keyCode <= 90)//a - z
        {
          handleTyping(e.keyCode);
        }
        break;
    }
    // use e.keyCode
  });

  function handleTyping(keycode) {
    let letter = String.fromCharCode(keycode + 32)

    if (typedLetters.length < currentWord.length) {
      typedLetters += letter;
    }
    updateLetterBoxes();
    checkIfWordCompleted();
  }



}
)