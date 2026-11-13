// Headline hover effect: each letter swaps to an icon when the mouse passes over it.
// Add data-hover-icons to any heading to enable it.
// Placeholder emoji for now. Later these can be swapped for your own icons.
const HOVER_ICONS = [
  // mail & messages
  '✉️', '💌', '📬', '📨', '🔔', '📣', '💬',
  // notes & books
  '📒', '📓', '📖', '📚', '📝', '✏️',
  // work & tech
  '🎯', '⚙️', '🔧', '🤖', '👩‍💻', '🔍', '🧪', '🚀',
  // ideas & creativity
  '🧠', '💡', '🧩', '🎨', '🖌️', '✨',
  // celebration & feelings
  '❤️', '⭐', '🏆', '🎉', '🎁', '💎', '🔥', '⚡',
  // people & sport
  '👋', '💪', '🏃‍♀️‍➡️', '👟', '🏅',
  // weather & treats
  '🌈', '☀️', '☕',
  // animals
  '🐈‍⬛', '🦫', '🐼', '🐍', '🦊', '🐸', '🦉', '🐢', '🦔', '🐝',
  '🦋', '🐌', '🐙', '🦥', '🐧', '🦦', '🐨', '🦩', '🐳', '🐞',
  '🦜', '🐿️', '🦭', '🐇',
  // plants & nature
  '🍀', '🌸', '🪸', '🌱', '🌿', '🌵', '🌻', '🌷', '🌼', '🍄',
  '🌳', '🪴', '🌾', '🍁', '🌺', '🪻', '🌲', '🍃', '🪷', '🌹',
  '🎋', '🌴', '🪹',
];

// Shuffled deck: every emoji is used once before any of them repeats.
// When the deck runs out, it's reshuffled.
let iconDeck = [];
let lastIcon = null;

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function nextIcon() {
  if (iconDeck.length === 0) {
    iconDeck = shuffle(HOVER_ICONS);
    // don't start the new round with the emoji that ended the last one
    if (iconDeck[0] === lastIcon && iconDeck.length > 1) {
      iconDeck.push(iconDeck.shift());
    }
  }
  lastIcon = iconDeck.shift();
  return lastIcon;
}
const HOVER_RADIUS = 0.6; // how far the effect reaches, in multiples of the font size
const MIN_SCALE = 1; // smallest emoji (edge of the effect), 1 = headline font size
const MAX_SCALE = 1.4; // biggest emoji (right under the cursor)

// Spring settings for the motion
const SPRING_STIFFNESS = 0.12; // higher = snappier, lower = lazier
const SPRING_DAMPING = 0.72; // lower = more bounce, higher = calmer

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hoverHeadings = [];

document.querySelectorAll('[data-hover-icons]').forEach((heading) => {
  const text = heading.textContent.trim();
  heading.setAttribute('aria-label', text);
  heading.textContent = '';

  text.split(/(\s+)/).forEach((part) => {
    if (!part) return;

    // keep spaces as plain text so words can still wrap
    if (/^\s+$/.test(part)) {
      heading.append(part);
      return;
    }

    const word = document.createElement('span');
    word.className = 'hover-word';
    word.setAttribute('aria-hidden', 'true');

    for (const char of part) {
      const letter = document.createElement('span');
      letter.className = 'hover-letter';

      const glyph = document.createElement('span');
      glyph.className = 'hover-glyph';
      glyph.textContent = char;

      const icon = document.createElement('span');
      icon.className = 'hover-icon';

      letter.append(glyph, icon);
      word.append(letter);
    }

    heading.append(word);
  });

  // Each letter keeps its own animation state:
  // "on" goes from 0 (letter) to 1 (emoji), "scale" is the emoji size.
  const letters = [...heading.querySelectorAll('.hover-letter')].map((el) => ({
    el,
    glyph: el.querySelector('.hover-glyph'),
    icon: el.querySelector('.hover-icon'),
    glyphWidth: 0,
    iconWidth: 0,
    cx: 0,
    top: 0,
    bottom: 0,
    on: { x: 0, v: 0, target: 0 },
    scale: { x: MIN_SCALE, v: 0, target: MIN_SCALE },
  }));

  hoverHeadings.push({ heading, letters });

  // Dock-style effect: the closer a letter is to the cursor, the bigger its emoji.
  // Distances use the letters' resting positions, so the text moving doesn't make it twitch.
  heading.addEventListener('mousemove', (event) => {
    const box = heading.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const radius = parseFloat(getComputedStyle(heading).fontSize) * HOVER_RADIUS;

    letters.forEach((letter) => {
      const dx = x - letter.cx;
      // vertical distance is 0 while the cursor is on the same line as the letter
      const dy = Math.max(letter.top - y, 0, y - letter.bottom);
      const closeness = Math.max(0, 1 - Math.hypot(dx, dy) / radius);

      if (closeness > 0) {
        // new emoji from the deck only if the letter is fully back to normal
        if (letter.on.target === 0 && letter.on.x < 0.01) {
          letter.icon.textContent = nextIcon();
          letter.iconWidth = letter.icon.offsetWidth;
        }
        letter.on.target = 1;
        letter.scale.target = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * closeness;
      } else {
        letter.on.target = 0;
      }
    });

    startAnimation();
  });

  // cursor left the headline: all emoji fade back into letters
  heading.addEventListener('mouseleave', () => {
    letters.forEach((letter) => {
      letter.on.target = 0;
    });
    startAnimation();
  });
});

// Move a value a little closer to its target, like a spring.
function springStep(spring, frames) {
  if (reduceMotion) {
    spring.x = spring.target;
    spring.v = 0;
    return;
  }
  spring.v += (spring.target - spring.x) * SPRING_STIFFNESS * frames;
  spring.v *= Math.pow(SPRING_DAMPING, frames);
  spring.x += spring.v * frames;
}

function isSettled(spring) {
  return Math.abs(spring.target - spring.x) < 0.001 && Math.abs(spring.v) < 0.001;
}

// Apply a letter's current state to the page.
function renderLetter(letter) {
  const on = Math.min(1, Math.max(0, letter.on.x));
  const scale = letter.scale.x;
  const emojiWidth = Math.max(letter.glyphWidth, letter.iconWidth * scale);
  const width = letter.glyphWidth + (emojiWidth - letter.glyphWidth) * letter.on.x;

  letter.el.style.width = `${Math.max(0, width)}px`;
  letter.glyph.style.opacity = 1 - on;
  letter.glyph.style.transform = `scale(${1 - 0.6 * on})`;
  letter.icon.style.opacity = on;
  letter.icon.style.transform = `translateX(-50%) scale(${scale * (0.4 + 0.6 * on)})`;
}

// Animation loop: runs on every screen frame while something is moving, then stops.
let animationId = null;
let lastFrameTime = 0;

function startAnimation() {
  if (animationId !== null) return;
  lastFrameTime = performance.now();
  animationId = requestAnimationFrame(animate);
}

function animate(now) {
  // how many 60fps frames have passed, so the speed is the same on any screen
  const frames = Math.min((now - lastFrameTime) / (1000 / 60), 3);
  lastFrameTime = now;
  let moving = false;

  hoverHeadings.forEach(({ letters }) => {
    letters.forEach((letter) => {
      springStep(letter.on, frames);
      springStep(letter.scale, frames);
      renderLetter(letter);
      if (!isSettled(letter.on) || !isSettled(letter.scale)) moving = true;
    });
  });

  animationId = moving ? requestAnimationFrame(animate) : null;
}

// Measure each letter at rest: its width and where it sits in the headline.
function measureHoverLetters() {
  hoverHeadings.forEach(({ heading, letters }) => {
    letters.forEach((letter) => {
      letter.el.style.width = '';
    });

    const box = heading.getBoundingClientRect();

    letters.forEach((letter) => {
      letter.glyphWidth = letter.glyph.offsetWidth;
      const rect = letter.el.getBoundingClientRect();
      letter.cx = rect.left + rect.width / 2 - box.left;
      letter.top = rect.top - box.top;
      letter.bottom = rect.bottom - box.top;
    });

    letters.forEach(renderLetter);
  });
}

// measure now, again once web fonts have loaded, and when the screen size changes
measureHoverLetters();
document.fonts.ready.then(measureHoverLetters);
window.addEventListener('resize', measureHoverLetters);
