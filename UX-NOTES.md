# UI/UX refinements

The visual direction remains the cinematic What If multiverse: dark indigo, crimson/chrome branding and cyan/violet timeline accents. This pass makes the working app calmer and easier to use while keeping the intro's original card printing, timing, composition and media.

## Latest changes

- Replaced all 28 intro knowledge cards with future semiconductor questions: chiplets, 3D integration, complementary FETs, backside power, new channel materials and system-level design trade-offs. The questions describe possibilities without promising dates or performance. Topic grounding: [imec scaling roadmap](https://www.imec-int.com/en/articles/smaller-better-faster-imec-presents-chip-scaling-roadmap), [imec logic roadmap](https://www.imec-int.com/en/articles/view-logic-technology-roadmap), and [heterogeneous chiplet integration](https://www.imec-int.com/en/press/imec-unlocks-system-level-iii-v-chiplet-integration-si-cmos-advancing-its-300mm-rf-silicon).
- App headings now use Manrope with Inter for body text. Sentence case, lighter visual density and less text glow soften the original condensed all-caps styling. The cinematic intro retains its original fonts and rendering.
- Rebuilt Home around a two-column introduction and decision composer. The multiline question field has a visible label, guidance, nearby primary action and an accessible error for short questions. Enter adds a line; Ctrl/Cmd+Enter submits. Examples show selection, fill the composer and bring it back into view. The app remains a general decision tool; semiconductor-only copy applies to the intro.
- Added visible New decision/History navigation alongside the existing menu. The narrow phone layout keeps History and the menu while reducing decorative content above the action. Styles load in the head to avoid flashing the old layout.
- Added a direct Go straight to the app button beside Watch intro, keyboard focus handling and Escape entry. Background fonts/audio can delay the animation by at most two seconds. Blocked session storage or an unavailable animation CDN no longer traps the app. Both full intro completion and direct entry reach the app.
- All app cards and panels now share the soft cursor-following crimson glow, including Home, analysis, timeline strategies, simulator KPIs/charts, comparison, history, information cards, and dialog/drawer panels. Each box owns a decorative light layer clipped by its rounded background, below its text with pointer events disabled. Only the nearest hovered box activates; nested boxes do not inherit their parent's activation. The light fades when leaving, scrolling, switching pages or windows, or using keyboard navigation. Touch and reduced-motion modes suppress it. Inputs keep their dark backing while their surrounding panel glows.
- The global background cursor canvas remains shielded from all cards; the new local glow is a separate layer in each box. The canvas stays below page content; opaque panel backing, region masks and hiding over reading/control regions prevent light from entering boxes. Reduced-motion and touch modes suppress it.

## Design tokens

- Surfaces #0b0e17 / #131726; primary text #e2e8f0; secondary #b5bfd1; borders #374155.
- Crimson action #b80f16 with white text; soft heading accent #ff6570; focus cyan #38e1ff.
- Verified contrast: primary 14.46:1, secondary 9.62:1, accent heading 6.74:1, action text 6.74:1, focus cyan 11.36:1.
- Type: 12/14/16/20/28px with fluid headings up to 68px; weights 400/500/600/700. Spacing follows 4/8/12/16/24/32/48/64px. Panel radii 8/12px.
- App UI CSS and JS remain separate from the original cinematic renderer. No new package dependencies. Manrope uses the existing Google Fonts connection and falls back to Inter; a cold offline load uses system sans-serif.

## Retained improvements

Question -> Assumptions -> Explore -> Compare navigation; current-question context; meaningful strategy names; semantic comparison headers; sticky measure column; conditional horizontal-scroll hint; mobile priority controls; native strategy disclosures; keyboard timeline tabs; accessible loading/retry states; consent and drawer focus handling; exact restoration of saved controls.

## Verification

The decision flow was exercised with mouse and keyboard: validation, example selection, editable assumptions, timeline branching, simulation and priority comparison. Home was inspected at 375/768/1440px; intro playback completed into Home and direct keyboard entry also reached Home. No browser console errors were observed. Twelve targeted regression tests cover decision routing, calculations, restored state, cursor shielding, unavailable animation/storage fallback, direct entry with pending fonts, and protected cinematic rendering/media. This is functional and visual QA, not a complete screen-reader audit or new penetration test.

Latest glow check: the cursor regression verifies switching between boxes, local coordinates, clearing on leave/blur, one decorative layer per box, and the global canvas staying off over content. Browser checks confirmed the composer glow behind text with pointer-events disabled, dynamic simulator panel registration, and the example -> assumptions -> timelines -> simulation -> comparison flow including sliders. No browser console errors were observed.
