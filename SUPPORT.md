# Support and release expectations

Dashfoo is an MIT-licensed early-adopter library maintained by Pedro Filho.
There is no paid support plan or response-time guarantee.

Use [GitHub Issues](https://github.com/pedroapfilho/dashfoo/issues) for questions,
bug reports, and feature requests. Include a minimal reproduction, package and
React versions, browser/OS, and the smallest layout model that demonstrates the
problem. Remove private data from models and screenshots before sharing them.

The React layer supports React 18.3.1 and 19. Docking is pointer-only; keyboard
users can select tabs and activate exposed controls, but cannot rearrange the
layout by keyboard. In-app floating panels do not become browser windows.
Consumer styling and custom chrome affect accessibility.

The persisted model uses schema version 1. Future releases may change APIs or
schema. Read release notes before upgrading and own migration or key rotation
when your application requires long-lived saved arrangements. Layout persistence
does not save widget content. Controlled layouts own their own undo history.

Browser evidence, checks, and known limitations are recorded in the
[launch checklist](./docs/launch/checklist.md), rather than inferred from a
package version number.
