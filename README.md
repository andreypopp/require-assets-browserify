# require-assets-browserify

Browserify transform and plugin to populate [require-assets][] registry and
rewrite asset references into URLs.

## Installation

    % npm install require-assets require-assets-browserify

## Usage

    % browserify -p [ require-assets/browserify --output ./assets.json ] ...

[require-assets]: https://github.com/andreypopp/require-assets
