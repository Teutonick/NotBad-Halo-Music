# WATER sky provenance

`arctic-sky.png` is an original synthetic environment generated for HALO on 2026-10-24 using the built-in OpenAI image generation tool. It is not a documentary photograph, a downloaded HDRI, or imagery copied from the Reddit reference. The user-supplied screenshot informed the desired weather/mood; it was not supplied as an image-edit target. No third-party image or licensed media pack was imported. Distributed as an original project asset under the repository license; no paid asset subscription, runtime attribution request or remote media service is needed.

- Generated dimensions: 1774 × 887 pixels (2:1).
- File size: 1,939,665 bytes.
- SHA-256: `42fdeaaa643f3fb1f7ad03c70cc9e6c446f5812526cb0642045820df641c9e38`.
- Original generation: `exec-e14e8f30-9b5e-44f8-aa94-1e41c0478a69.png`; the workspace copy is local to `assets/water/` (no commit performed by the agent).

The texture loads once, only when WATER uses WebGL2. The sea remains a live shader reflecting the same sky through an analytic directional wave field. This is a finite panoramic sky plate, not a volumetric cloud/weather simulation or a complete spherical HDR environment. Missing/unavailable texture retains procedural sky; unavailable WebGL2 retains Canvas water.

## Generation prompt

Use case: photorealistic-natural. Asset type: original environment sky texture for a real-time ocean shader. Create a wide 2:1 panoramic photograph of an immense dramatic overcast Arctic SKY ONLY, looking from horizon up toward zenith, with natural three-dimensional layered stratocumulus storm clouds, dense charcoal-blue undersides, silver illuminated edges, soft cool daylight breaking through a gap in the upper right. Strong natural photographic detail and depth, subtle blue-gray atmosphere. The very bottom 8 percent fades to pale mist at a distant sky horizon; sky and clouds fill the entire image. Large billowing cloud structures fill upper two thirds, smaller distant cloud banks near bottom. Rectilinear wide panorama, no fisheye. No ocean, no water, no terrain, no mountains, no boats, no buildings, no stars, no UI, no text, no borders, no watermark. This must look like a real photograph of weather, not a painting or stylized render. Entirely original environment asset.

## Direct local-file compatibility

`arctic-sky.data.js` is a generated base64 representation of the exact same PNG, not a new image. Direct `file://` documents load this classic-script payload only on first GPU WATER activation; the decoded data URL is usable as a WebGL texture without relying on cross-origin access to a file image. The temporary global payload is released after assignment. HTTP(S) uses the PNG with anonymous CORS and never requests this companion. No external domain or relaxed browser policy is required.

After editing the source PNG, run `node scripts/pack-water-sky.cjs` and ship both files. Tests decode the packed asset and compare all bytes against the PNG. The generated file is already included; users do not run a build. Original image provenance/license above applies to both representations.

## Recorded handpan (separate from the original sky)

`handpan.js` contains 18 real FreePats Hang strikes under CC0 1.0. These recordings are not covered by the sky-generation statement above. Performance: Mar; recording: Gonzalo and Roberto; editing: Roberto / FreePats. Pinned revision, source/output hashes, MIDI roots, local filenames and processing are in `handpan-manifest.json`; full rights evidence is in `rights/handpan-CC0.txt` and source notes in `rights/handpan-README.txt`. Source: https://freepats.zenvoid.org/ChromaticPercussion/hang.html . No source picture or performed song is included. Maintainer import utility: `python scripts/import-water-handpan.py` with the ffmpeg path documented in that script. The app loads the included classic-script sample pack directly without an importer/build.
