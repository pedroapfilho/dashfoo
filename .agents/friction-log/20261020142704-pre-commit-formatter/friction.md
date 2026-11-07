---
title: 'Pre-commit formatter rejects standalone friction entries'
severity: 'minor'
issue: 'pedroapfilho/dashfoo#197'
---

### Expected Behavior

A commit containing a Frog Markdown entry should pass the repo's pre-commit formatter.

### Current Behavior

When the only Markdown file staged is under `.agents/friction-log/`, lint-staged invokes oxfmt, which excludes that directory and exits with `Expected at least one target file. All matched files may have been excluded by ignore rules.` The commit fails. A staged `.fixture` change does not help because that extension is outside the formatting glob.

### Possible Solution

Align lint-staged's file matcher with the formatter's ignored metadata, or handle the all-ignored case in the formatter command. Keeping the Frog entry in the same commit as source changes works without bypassing any hook.

### Minimal Reproducible Example

Stage a new `.agents/friction-log/<entry>/friction.md` by itself and run `git commit`.

### Context

Encountered while committing the packed-consumer validation fix and its required Frog record. Recommitting it together with the implementation sources passed the existing hook.
