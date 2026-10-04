# Editor Labfonac — local v1.1.1 candidate

Prepared and accepted locally on 2026-10-04 for the maintainer's final manual site-update test. No v1.1.1 tag or GitHub Release was created; production was not accessed or modified. Official distribution remains v1.1.0.

## Provenance and version

Frozen build source: `cd837042c776611006134f1c7fed85752afdad05`, directly after the accepted FTPS repair `171ec34af7515f08e444bd9860f79a797423aab9`. The candidate commit changes only `package.json` and the corresponding root lockfile versions from 1.1.0 to 1.1.1. Dependencies, product identity, packaging targets, installer behavior and icons remain unchanged. Native About obtains its version through `app.getVersion()`.

Builds used a separate software-only clone at `C:\Temp\labfonac-v1.1.1-software-20261004` and `npm ci`. Subsequent candidate-record documentation is outside the packaging file allowlist and does not change these frozen build inputs. Binary reproducibility across separate builds is not asserted.

## Local artifacts

Directory: `C:\labfon-editor-release\v1.1.1-rc-20261004`.

| Artifact | SHA-256 |
| --- | --- |
| `Lab-FON-Editor-Setup-1.1.1.exe` | `642f9a43abc4c3b245111e3420a3cf8685b62e1f8e04d8b4ba937a06930ff499` |
| `Lab-FON-Editor-Portable-1.1.1.zip` | `671d5c0c575214f6b968a93d1ab923d9227b777fd6ea59ec9b01fd6057088365` |

The same directory contains `SHA256SUMS.txt` and a copy of this record named `RELEASE_CANDIDATE_NOTES.md`. The ZIP contains the complete 73-file Windows runtime under `Lab-FON-Editor-Portable/`; every archived file was read back and compared byte-for-byte with `win-unpacked`, then extracted for acceptance. The installer remains unsigned, as in the accepted release process; no Windows security settings were changed.

## Build and packaging checks

- `npm ci` completed without dependency modernization. Its existing dependency-audit warnings were not repaired in this packaging slice.
- 48 focused tests passed across six suites: editor-menu, desktop-startup, remote-transfer, recovery-store, guided-update and retrieval-progress. No broad-suite green claim is made.
- Public demonstration build and editor renderer build passed. Demonstration content was not packaged or published; desktop Vite builds disable `publicDir`.
- Existing electron-builder/NSIS x64 targets produced the installer and unpacked runtime. The default Electron extraction failed at a Windows directory rename (`EPERM`). The supported `electronDist` option supplied the already-extracted Electron 44.0.0 runtime instead. All 73 extracted runtime files were verified against the cached Electron ZIP before preparing this input; stock `version` and `resources/default_app.asar` files were excluded, matching normal builder cleanup. No dependency or repository build-configuration patch was needed.
- Final command: `node node_modules/electron-builder/cli.js --config.directories.output=C:/labfon-editor-release/v1.1.1-rc-20261004 --config.electronDist=C:/Temp/labfonac-v1.1.1-acceptance-20261004/electron-runtime` after `npm run build:editor-renderer`.
- `app.asar` SHA-256: `a2bb609025a7fddeecd464480662142bd0342d854288c928ea60917573123804`. Its 46 entries contain only desktop modules, editor renderer/branding, icon, license, package metadata and basic-ftp. All 14 desktop modules matched frozen checkout bytes, including `remote-transfer.cjs` and its integration modules. No institutional content, credentials, recovery payloads, test/temp evidence, machine-local files or public-site data were bundled.

## Actual packaged acceptance

The NSIS installer executed silently and returned exit code 0, installing into `C:\Temp\labfonac-v1.1.1-acceptance-20261004\installed`. Windows uninstall registration reports 1.1.1 and the Start menu shortcut targets this installed executable. This was a fresh isolated install; no upgrade scenario was repeated. The candidate installation remains available there; existing editor user data was not opened or modified.

Both the installed executable and the executable extracted from the final portable ZIP launched as packaged applications with isolated empty user-data directories. Main-process inspection confirmed `app.isPackaged`, version 1.1.1, and the packaged editor renderer. Both showed the six editor tabs and the native menus Arquivo, Editar, Exibir, Janela and Ajuda. The real Ajuda/Sobre callback opened the native dialog; Windows UI Automation read **Editor Labfonac — Versão 1.1.1** and closed it. The native executable icon was extracted and visually checked against the established waveform branding. Installed archive bytes match the accepted portable archive hash.

Inspection helpers and runtime evidence are private at `C:\Temp\labfonac-v1.1.1-acceptance-20261004`, outside the clone, repository and application bundle. Both acceptance application processes were closed after verification. No credentials were provisioned and no FTP or institutional project was opened. No production mutation, destructive FTP scenarios, final tag, release publication, history rewrite, unrelated merge, cleanup or dependency modernization occurred.

Stop here. The maintainer should perform the final real-world update using this candidate and review the progress/elapsed-time behavior described in the [FTPS repair record](FTPS_PERFORMANCE_REPAIR_2026-10-04.md). Final release publication requires separate authorization after that test.
