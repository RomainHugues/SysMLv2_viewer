# Vendored third-party code

`syside.cjs` is a bundled build of **syside-languageserver** v0.9.1
(the SysML v2 parser/language server), from
https://github.com/sensmetry/sysml-2ls (primary: gitlab.com/sensmetry/public/sysml-2ls).

Copyright (c) Sensmetry UAB and others.
Licensed under **EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0** — see
[LICENSE-sysml-2ls.txt](./LICENSE-sysml-2ls.txt). It also bundles its
dependencies (langium, chevrotain, vscode-languageserver, ...), each under their
own licenses.

Regenerate with `node scripts/build-vendor.mjs` against a clone of sysml-2ls.
