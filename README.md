<div align=center>

<img src="./assets/logo.svg" width=100 height=100 />

<h1>AOTYFY</h1>

<p>Yet another <a href="https://github.com/spicetify/spicetify-cli">Spicetify</a> extension to display AOTY user ratings.</p>

<p align="center">
  <img alt="preview" src="./assets/example.png">
</p>

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

- [Ashercs's Spicetify AOTY Scores](https://github.com/ashercs/SpicetifyAOTYScores) - for idea and code base.
- [x1yl Better Spicetify AOTY Scores](https://github.com/x1yl/BetterSpicetifyAOTYScores) - for rewritten Ashercs's code.

## License

`aotyfy` is distributed under the terms of the [MIT License](LICENSE).
