# @dashfoo/core

## 0.1.0

### Minor Changes

- 7e76a84: Add model and React support for row/tabset min and max sizes, plus a default tabset minimum size.
- 7e76a84: remove the unused migration machinery: `migrate` and `CURRENT_VERSION` are no longer exported, and the model's `version` field is pinned to `1` by the schema (`z.literal(1)`), so payloads in any other format fail validation
