# TAB-OUT 3D

TAB-OUT 3D is a stealth arcade experience set in a simulated 3D corporate office environment. Players control a fast-paced lane-switching arcade game on their virtual monitor while keeping an eye out for the boss patrolling the corridors.

## Gameplay Mechanics

* Stealth Action: Play the arcade game to accumulate points, but hold Space to quickly switch your monitor to a spreadsheet when the boss approaches.
* Productivity System: Hiding from the boss drains your productivity. You must balance stealth with actual arcade gameplay to prevent being terminated by HR.
* Boss AI: The boss walks through the office looking at employee monitors. If the boss catches you playing, you are fired.

## Key Features

* Autonomous Employees: Background characters walk corridors, return to desks, steer around each other using local obstacle avoidance, and dynamically turn their heads to look around.
* Facial Expressions: Employees feature procedural animation including Y-axis eye scaling for blinking, focused squints during typing, mouth movement during chatting gestures, and wide-eyed panic expressions when the boss is visible.
* Account Registration: A built-in user system allows creating accounts with unique usernames, emails, and passwords.
* Local Leaderboards: Ranks the top five employee high scores, persisting data locally in the browser.
* Authentic Sounds: Dynamic audio effects for UI button hover and clicks, arcade lane switches, collision feedback, and warning alarms.

## Controls

* Left and Right Arrow Keys: Move ship between lanes.
* Spacebar: Hold to hide the arcade game and show the work spreadsheet. Release to return to the game.
* Escape Key: Pause the gameplay or return to the main menu.

## How to Run Locally

Since the game is built using native browser ES modules, it must be run from a local web server to avoid browser cross-origin policy blocks.

1. Open your terminal in the project directory.
2. Start a local server. For example, using Python:
   ```bash
   python -m http.server 8080
   ```
3. Open your web browser and navigate to:
   ```
   http://localhost:8080
   ```
