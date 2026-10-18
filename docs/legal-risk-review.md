# HALO: risk and notice review · 2026-10-18

This is a repository-based product risk review, not a jurisdiction-specific legal opinion or a guarantee that every risk is listed. Developer location, target markets, operator identity and distribution arrangements have not been established. Enforceability needs review against the applicable law before public reliance on this notice.

## Implemented boundaries

- `src/audio.js` and audio input/Track 09 code: hearing exposure, feedback, connected speaker/headphone damage, recording privacy, browser/device failures and resource use. A limiter is not a guarantee of safe listening volume. HALO is not medical treatment.
- `src/preferences.js`, `src/song-ui.js`, `src/live-loop.js`: localStorage/IndexedDB work may be lost, overwritten or exposed to other people sharing the browser profile. Export backups. Local storage is not cloud backup or an absolute confidentiality guarantee.
- `src/file-bridge.js` and agent interfaces: folder context/request/receipt exchange, agent-proposed edits and possible overwrites. Folder grants must be deliberate and minimal; avoid secrets. File Bridge approval does not imply that every WebMCP edit has its own human approval dialog.
- `src/site-tools.js`: an external agent can read score context and apply edits. Its provider may process that context under separate terms. HALO is not an LLM service and cannot guarantee generated content, third-party compliance or external actions.
- `LICENSE`, `assets/reactor/manifest.json` and rights records document MIT code and claimed CC0 sample provenance. Those records are useful evidence, not universal clearance of third-party personality/privacy/trademark rights or a warranty against ownership disputes. User imports/recordings require adequate rights and consents; output is not guaranteed unique or non-infringing.
- Static hosting serves code/assets. HALO has no user-content upload backend. Deliberately sharing project links/files or exposing context to an agent is separate from local processing. Hosting may process technical connection logs.

## Notice design and limits

`src/terms.js` contains the actual parallel RU/EN terms. A native modal blocks ordinary interaction until a checkbox and acceptance button are used. Version and acceptance time are stored only in the browser; this is not an authenticated signature, identity check or server-side consent audit. Browser storage can be edited or cleared. Browser device/folder prompts remain separate. No claim of comprehensive legal compliance is made.

The notice limits liability **to the maximum extent permitted by law** and preserves non-excludable rights/liabilities. An absolute waiver for all injury/device damage would be misleading: for example, UK law prohibits excluding liability for death or personal injury resulting from negligence. This example does not establish which law governs HALO.

Sources checked 2026-10-18:

- [UK Unfair Contract Terms Act 1977, section 2](https://www.legislation.gov.uk/ukpga/1977/50/section/2)
- [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)

## Verification

Node tests exercise explicit acceptance, version renewal, invalid/unavailable storage, language switching and cancelled dismissal using isolated fakes. Chrome preview verified RU/EN, Escape/backdrop blocking, disabled-to-enabled acceptance button, clean error/warning logs, desktop view and 390×844 scrollable layout; 1366×768 viewport was also inspected. Native Escape testing exposed a dismissal path; preventing the Escape key default fixed it. Visual-only restore excludes the terms dialog and its pointer events. After explicit user clarification, AGENTS.md limits the localhost prohibition to Bridge composition; repository development/QA may run preview. Actual acceptance was exercised only in isolated automated fakes, not on behalf of the user. Safari/iOS and physical devices were not tested. No deployment or legal enforceability sign-off.
