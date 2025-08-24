# Dynamics DevTools

## Project Overview
A VSCode extension for Dynamics 365/Dataverse admin and developer tasks, featuring a clean UI inspired by Power Platform Maker.

## Prerequisites
- **Node.js** (includes npm)
  - Download and install from [https://nodejs.org/](https://nodejs.org/)
- **VSCode**
  - Download from [https://code.visualstudio.com/](https://code.visualstudio.com/)

## Initial Setup
1. **Clone the repository**
   ```
   git clone https://github.com/JoshSmithXRM/Dynamics-DevTools.git
   cd Dynamics-DevTools
   ```
2. **Install dependencies**
   ```
   npm install
   ```
   If you see errors about `npm` or `npx` not being recognized, ensure Node.js is installed and your terminal is restarted.

3. **Build the extension**
   ```
   npx tsc
   ```
   Or use the VSCode build task: `Build Extension`

4. **Run in VSCode**
   - Open the folder in VSCode
   - Press `F5` to launch the Extension Development Host
   - Use the Command Palette or sidebar to open the Dynamics DevTools webview

## Troubleshooting
- If `npm` or `npx` is not recognized, install Node.js and restart your terminal/VSCode.
- For TypeScript errors, ensure you have run `npm install --save-dev typescript`.

## Contributing
- See `PROJECT_DECISIONS.md` for architecture and design choices.
- PRs and issues welcome!

## License
MIT
