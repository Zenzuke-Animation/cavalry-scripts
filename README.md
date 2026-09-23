# cavalry-scripts

Keyframe and timing utilities for [Cavalry](https://cavalry.scenario.com/): two panels and three one-shot scripts.

Documentation in English and Spanish: https://zenzuke.com/scripts/

## Install

1. Download a script from the table below (or from the [Releases](../../releases) page).
2. Open it in Cavalry's Script Editor (**Utility > Script Editor**), or drop it into your Cavalry scripts folder so it stays available from the menu.
3. Panel scripts (Keyframe Toolkit, Time Offset) open their own UI window; one-shot scripts act immediately on the current selection.

## Tools

| Tool | Type | What it does | Download |
|---|---|---|---|
| Keyframe Toolkit | Panel | Three keyframe actions in one place: clone the selected keyframes at the playhead, clone them reversed in time for ping-pong moves, or reverse them in place. | [KeyToolkit.js](../../releases/latest/download/KeyToolkit.js) |
| Time Offset | Panel | Shifts the timing of the composition by N frames — layers, keyframes, or both — separately on each side of the playhead, with toggles to leave locked and hidden layers out. | [TimeOffset.js](../../releases/latest/download/TimeOffset.js) |
| Clone Keyframes | One-shot | Clones the selected keyframes and pastes them at the playhead, keeping their original spacing. | [clone_keyframes.js](../../releases/latest/download/clone_keyframes.js) |
| Clone Reversed | One-shot | Clones the selected keyframes at the playhead in mirrored chronological order — the quick way to a ping-pong move. | [clone_reversed.js](../../releases/latest/download/clone_reversed.js) |
| Reverse In Place | One-shot | Reverses the selected keyframes exactly where they sit on the timeline: the first swaps with the last, with no overall time shift. | [reverse_in_place.js](../../releases/latest/download/reverse_in_place.js) |

## Versioning

Current release: [v1.0.0](../../releases). Each tool carries its own version; `CHANGELOG.md` lists what changed.

## License

MIT + Commons Clause — free to use, including commercial work, but do not sell the software. See [LICENSE](LICENSE).
