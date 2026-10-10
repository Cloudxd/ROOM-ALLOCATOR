# KIIT Indoor Navigation

School of Computer Science, Block A & B.

Open `index.html` in a browser (no build step, no internet needed).

Files: index.html (structure), style.css (design, light/dark), script.js (graph, Dijkstra, Yen's K-shortest paths, map, UI).

Team: Suraj Kumar (2405693), Bikramjeet Seal (24052456), Daksh Khandelwal (2405712), Sumit Bhatnagar (24052190), Saumyak Gupta (24051212)

Note: script.js and style.css in this folder are the same program as kiit-nav.zip, reformatted one statement per line with section comments. Behaviour is identical.

## Navigation fixes (latest)
- Routes follow the corridors only; rooms are never used as shortcuts.
- Corridor lengths are fitted to your measured distances (see `calibrateWeights` in script.js). Average error against your 32 measurements: about 3%.
- Turn directions and step distances are worked out along the corridor path.
- Added the A-B corridor from your hand-drawn graph: Block A entry (near A015) to Block B entry (near B018), 52 steps, with a staircase in the middle that reaches every floor up to the 3rd. The C Block links are unchanged.
