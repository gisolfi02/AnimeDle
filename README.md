<div align="center">

<img src="./images/logo.png" alt="Animedle logo" width="112" />

# ANIMEDLE

### Four universes. One mystery character. Endless challenges.

**An anime-themed character deduction game inspired by _Dle-style guessing games.**  
Choose your universe, guess the mystery character, and use the clues to uncover the answer.

<p>
  <a href="https://gisolfi02.github.io/Animedle/"><img alt="Play online" src="https://img.shields.io/badge/%E2%96%B6%20PLAY%20NOW-Animedle-ef8f4f?style=for-the-badge&labelColor=172333" /></a>
  <a href="https://github.com/gisolfi02/Animedle"><img alt="GitHub repository" src="https://img.shields.io/badge/GitHub-Repository-2b3546?style=for-the-badge&logo=github" /></a>
</p>

<p>
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" />
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" />
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=202020" />
  <img alt="GitHub Pages" src="https://img.shields.io/badge/GitHub%20Pages-Deploy-222222?style=flat-square&logo=githubpages&logoColor=white" />
</p>

**[🌐 Open Animedle](https://gisolfi02.github.io/Animedle/)**

</div>

---

## 🌌 Explore the Four Universes

Each game features its own visual identity, character roster, and set of clue categories.

<table>
  <tr>
    <td align="center" width="50%">
      <a href="https://gisolfi02.github.io/Animedle/onepiece/"><img src="./images/onepiece.jpg" alt="One Piece banner" width="100%" /></a><br />
      <strong>🏴‍☠️ OnePiecedle</strong><br />
      <sub>Grand Line · Treasure Map</sub><br /><br />
      Crews, Devil Fruits, Haki, bounties, and much more.<br /><br />
      <a href="https://gisolfi02.github.io/Animedle/onepiece/">Play OnePiecedle</a>
    </td>
    <td align="center" width="50%">
      <a href="https://gisolfi02.github.io/Animedle/naruto/"><img src="./images/naruto.jpg" alt="Naruto banner" width="100%" /></a><br />
      <strong>🍃 Narutodle</strong><br />
      <sub>Shinobi Scroll</sub><br /><br />
      Villages, ninja techniques, Kekkei Genkai, and chakra natures.<br /><br />
      <a href="https://gisolfi02.github.io/Animedle/naruto/">Play Narutodle</a>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <a href="https://gisolfi02.github.io/Animedle/dragonball/"><img src="./images/dragonball.jpg" alt="Dragon Ball banner" width="100%" /></a><br />
      <strong>🐉 Dragonballdle</strong><br />
      <sub>Dragon Radar · Capsule Edition</sub><br /><br />
      Hair, races, origins, sagas, and series.<br /><br />
      <a href="https://gisolfi02.github.io/Animedle/dragonball/">Play Dragonballdle</a>
    </td>
    <td align="center" width="50%">
      <a href="https://gisolfi02.github.io/Animedle/bleach/"><img src="./images/bleach.jpg" alt="Bleach banner" width="100%" /></a><br />
      <strong>⚔️ Bleachdle</strong><br />
      <sub>Bankai · Monochrome Edition</sub><br /><br />
      Races, occupations, affiliations, and story arcs.<br /><br />
      <a href="https://gisolfi02.github.io/Animedle/bleach/">Play Bleachdle</a>
    </td>
  </tr>
</table>

## 🎮 How to Play

1. **Choose an anime** from the home screen.
2. **Search for a character** by typing their name and selecting them from the suggestions.
3. **Read the clues:** each guess adds a row comparing the selected character's attributes with those of the mystery character.
4. **Narrow down the possibilities** using colors, partial matches, and directional arrows.
5. **Guess the mystery character** or reveal the answer, then start a new game whenever you like.

### Understanding the Clues

| Indicator | Meaning |
| :-------: | ------- |
| 🟩 | **Correct** — the attribute matches the mystery character. |
| 🟨 | **Partial match** — some information overlaps, where supported by the category. |
| 🟥 | **Incorrect** — the attribute does not match. |
| ⬜ | **Unknown / unavailable** — the available data does not allow a complete comparison, where applicable. |
| ⬆️ / ⬇️ | **Higher / lower** — the target value is greater or smaller (for example, height, bounty, or debut order, depending on the game). |

<details>
<summary><strong>📋 Which attributes are compared?</strong></summary>

| Game | Attributes |
| ---- | ---------- |
| **OnePiecedle** | Character, gender, affiliation, Devil Fruit, Haki, latest bounty, height, origin, and first story arc. |
| **Narutodle** | Character, gender, affiliations, jutsu types, Kekkei Genkai, chakra natures, attributes, and debut arc. |
| **Dragonballdle** | Character, gender, hair, origin/universe, race, saga, and series. |
| **Bleachdle** | Character, gender, height, race, occupation, location, affiliation, and first story arc. |

</details>

## ✨ Features

- 🎲 **Replayable games:** discover a new mystery character every round.
- 🔎 **Autocomplete search:** quickly find characters and select them from the suggestions.
- 🧩 **Visual clues:** colors, comparisons, and arrows help you work out the answer.
- 🎴 **Progressive reveal:** clues appear through a sequential animation.
- 🎨 **Four unique themes:** a custom interface for each anime universe.
- 📱 **Responsive design:** playable on desktop, tablet, and mobile; clue tables can scroll horizontally on smaller screens.
- 🔊 **Optional ambient audio:** where configured, background ambience can be enabled or disabled during gameplay.
- ⚡ **No backend required:** the games run directly in the browser using HTML, CSS, JavaScript, and JSON files.

## 🛠️ Tech Stack

| Technology | Purpose |
| ---------- | ------- |
| **HTML5** | Page structure and game interfaces. |
| **CSS3** | Themes, responsive layouts, and clue animations. |
| **Vanilla JavaScript** | Guess handling, search, comparisons, and game state. |
| **JSON** | Character datasets kept separate from game logic. |
| **Font Awesome** | Interface and control icons. |
| **GitHub Pages** | Static website hosting. |

## 📁 Project Structure

The project is organized by anime, keeping the interface, logic, and data separate:

```text
Animedle/
├── index.html                 # Home page / game selection
├── onepiece/
│   ├── index.html
│   └── characters.json
├── naruto/
│   ├── index.html
│   └── characters.json
├── dragonball/
│   ├── index.html
│   └── characters.json
├── bleach/
│   ├── index.html
│   └── characters.json
├── js/
│   ├── onepiece.js
│   ├── naruto.js
│   ├── dragonball.js
│   ├── bleach.js
│   └── ambient.js             # Shared audio controls, if enabled
├── styles/                   # Game stylesheets
├── images/                   # Banners and site icons
└── audio/                    # Ambient soundtracks, if present
```

## 🚀 Running Locally

**1. Clone the repository:**

```bash
git clone https://github.com/gisolfi02/Animedle.git
cd Animedle
```

**2. Start a local HTTP server:**

```bash
python -m http.server 8000
```

**3. Open the game in your browser:**

```text
http://localhost:8000/
```

> **Important:** avoid opening the HTML files directly with `file://`. The games load character data using `fetch()`, which generally requires an HTTP server even during local development. Alternatively, you can use the **Live Server** extension in Visual Studio Code.

## 🧭 Customization

- **Characters:** edit the relevant game's `characters.json` file, keeping the fields expected by its JavaScript code.
- **Appearance:** update the game's stylesheet to customize colors, components, and animations.
- **Ambient audio:** add appropriately licensed audio files and reference them in the relevant HTML page; playback controls can be shared through `js/ambient.js`.

Each anime universe can be updated independently without changing the logic of the other games.

## 💬 Bug Reports & Suggestions

Found incorrect character information, a missing image, or an interface issue? Please open a **[GitHub Issue](https://github.com/gisolfi02/Animedle/issues)** and include the game, character, and behavior you observed.

## ⚖️ Disclaimer & Copyright

Animedle is an **unofficial fan-made project** created for entertainment and out of a passion for anime. It is not affiliated with, endorsed by, or sponsored by the creators, publishers, or other rights holders of the featured works.

_One Piece_, _Naruto_, _Dragon Ball_, and _Bleach_, along with their respective characters, names, images, and other protected materials, belong to their respective rights holders. The presence of such materials in this project does not imply authorization for their reuse.

---

<div align="center">

**Made with ❤️ for anime fans.**

**[🎮 PLAY ANIMEDLE](https://gisolfi02.github.io/Animedle/)**

</div>
