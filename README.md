# SteamBuddy Chrome Extension

## Overview
SteamBuddy is a Chrome extension designed to enhance your Steam experience. It redirects Steam Store game links (including PatchBot redirects) to open directly in the Steam client with an optional toggle. Shows free games & DLCs in Steam.

## Features
- **Steam Link Redirect**: Automatically opens Steam Store links in the Steam client.
- **Toggle Option**: Enable or disable the redirect feature via the extension popup.
- **Free Games Access**: Quickly navigate to free games and DLCs on the Steam Store.

## Planned
- **Steam Topseller Integration**
- **Steam Game Search Integration**

## Installation
1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click "Load unpacked" and select the extension folder.
5. The extension should now appear in your Chrome toolbar.

## Usage
- Click the extension icon in your Chrome toolbar to open the popup.
- Toggle the "Open in Steam" option to enable or disable redirects.
- Click "Check for Free Games & DLCs" to visit the Steam Store's free content page.

## Files
- `manifest.json`: Defines the extension's metadata and permissions.
- `content.js`: Handles link redirection on web pages.
- `background.js`: Manages background tasks.
- `rules.json`: Specifies redirection rules.
- `popup.html`: The extension's popup interface.
- `popup.js`: Controls the popup's functionality and settings.

## Configuration
- The extension uses Chrome storage to save user preferences (`redirectEnabled`).

## Contributing
Feel free to fork this repository, submit issues, or create pull requests to improve SteamBuddy. Contributions are welcome!

## License
This project is licensed under the [MIT License](LICENSE). See the `LICENSE` file for details.

## Support
For questions or support, please open an issue on this repository.