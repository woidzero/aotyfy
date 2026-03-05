// auto-generated - DO NOT EDIT
export const __VERSION__ = '2.1.0';
export const __CHANGELOG__ = `
<h2>[2.1.0] - 2026-03-03</h2><br />
<h3>Added</h3><br />
<ul>
<li><code>src/core/</code> module: <code>api</code>, <code>dom</code>, <code>exceptions</code>, <code>metadata</code>, <code>settings</code>, <code>ui</code>, <code>utils</code> (logic moved out of <code>app.tsx</code>)</li>
</ul><br />
<h3>Changed</h3><br />
<ul>
<li>App entry point: <code>app.tsx</code> only wires UI and update flow; core logic lives in <code>src/core/</code></li>
<li>Metadata: <code>getMeta()</code> is synchronous; object built with small helpers (<code>s</code>, <code>n</code>, <code>disc</code>) and safe fallbacks</li>
<li>UI lifecycle: UI is always created and initialized so enabling the extension after start works; songchange listener registered once</li>
<li>Types: removed duplicate <code>_State</code> in <code>global.d.ts</code>; <code>ScoreItem</code> progress bar width clamped for invalid scores</li>
</ul><br />
<h3>Fixed</h3><br />
<ul>
<li><code>getTrack()</code>: null/undefined disc treated as disc 1; safe check for missing disc/track index</li>
</ul><br />
<h3>Removed</h3><br />
<ul>
<li><code>src/components/Icons.tsx</code>, <code>src/components/TrackItem.tsx</code></li>
<li><code>src/exceptions.tsx</code>, <code>src/utils.tsx</code> (replaced by <code>src/core/exceptions.ts</code>, <code>src/core/utils.ts</code>)</li>
<li><code>scripts/meta.js</code>, <code>src/generated/meta.ts</code> (replaced by extras script and generated extras)</li>
</ul><br />
<h2>[2.0.3] - 2026-02-18</h2><br />
<h3>Fixed</h3><br />
<ul>
<li><code>artistLower</code> copies album title breaking the artist similarity comparison entirely</li>
<li>Show in Sidebar/Now Playing are not working properly</li>
<li>Car Seat Headrest &#39;Twin Fantasy&#39; searched incorrectly</li>
<li>David Bowie &#39;Blackstar&#39; searched incorrectly</li>
</ul><br />
<h2>[2.0.2] - 2026-01-06</h2><br />
<h3>Fixed</h3><br />
<ul>
<li>M.I.A. - ΛΛ Λ Y Λ searched incorrectly</li>
<li>galen tipton/dj galen searched incorrectly</li>
</ul><br />
<h2>[2.0.1] - 2026-01-02</h2><br />
<h3>Changed</h3><br />
<ul>
<li>Logo, icon and description</li>
<li>Suffix &quot; / Album&quot; is now removed from album names in all cases</li>
</ul><br />
<h3>Fixed</h3><br />
<ul>
<li>Tapir!&#39;s debut album was searched incorrectly</li>
<li>Song features appears in the song title in NPV widget</li>
<li>Fixed border radius and artist appearance in NPV widget</li>
</ul><br />
<h2>[2.0.0] - 2025-12-17</h2><br />
<h3>Added</h3><br />
<ul>
<li>AOTY score cards in Now Playing view</li>
<li>Comprehensive versioning system and changelog documentation</li>
<li>Dynamic changelog popup with automatic HTML conversion and rendering</li>
<li>User-configurable settings to toggle score visibility in Now Playing bar and view</li>
<li><code>global.d.ts</code> for better typing</li>
</ul><br />
<h3>Changed</h3><br />
<ul>
<li>Enhanced similarity detection algorithms</li>
<li>Restructured AOTY data parsing format for improved performance, accuracy and code maintainability &amp; readability.</li>
<li>Refactored project structure with improved code organization and maintainability</li>
<li>Updated code quality standards throughout the codebase</li>
</ul><br />
<h2>[1.0.1] - 2025-12-14</h2><br />
<h3>Changed</h3><br />
<ul>
<li>&quot;Scores refreshed&quot; notification now displays only when manually triggered via refresh button</li>
<li>Relocated <code>setAppearance()</code> function to <code>utils.tsx</code> for better code organization</li>
<li>Improved project structure and enhanced overall code quality</li>
</ul><br />
<h3>Fixed</h3><br />
<ul>
<li>Corrected logging prefix to properly display <code>[AOTYfy]</code> in console output</li>
<li>Fixed lowercase display name issue in manifest configuration</li>
</ul><br />
<h2>[1.0.0] - 2025-12-12</h2><br />
<ul>
<li>Initial release.</li>
</ul><br />
`;
