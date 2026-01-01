<div align=center>

<img src="./assets/logo.png" width=100 height=100 />

<h1>AOTYFY</h1>

<p>🔹 Album of the Year user & critic ratings for Spotify.</p>

<img alt="preview" src="./assets/preview.png">

</div>

## Installation

### Installer (recommended)

```bash
powershell -c "irm https://raw.githubusercontent.com/woidzero/aotyfy/refs/heads/master/install.bat | iex"
```

### Manual

1. Download [aotyfy.js](./dist/aotyfy.js) and place it inside your Spicetify extensions folder:
2. Open Spicetify extensions directory:

```bash
spicetify config-dir
```

3. Put [aotyfy.js](./dist/aotyfy.js) in the 'Extensions' folder.
4. Apply the changes:

```
spicetify config extensions aotyfy.js
spicetify apply
```

### Install from Marketplace

You can install this extension from the Spicetify Marketplace, just search for "AOTYFY" and click install.

## Credits

- [x1yl Better Spicetify AOTY Scores](https://github.com/x1yl/BetterSpicetifyAOTYScores) - for rewritten Ashercs's codebase.

## License

`aotyfy` is distributed under the terms of the [MIT License](LICENSE).
