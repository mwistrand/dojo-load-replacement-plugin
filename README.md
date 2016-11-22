# `dojo-core/load` Replacement Plugin for Webpack

A webpack plugin intended for use with [Dojo 2 applications](https://github.com/dojo/meta) that ignores inline `require` calls and replaces usage of `dojo-core/load` with a dynamically generated loader that maps paths to their Webpack module IDs.
