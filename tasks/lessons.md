# nclcrb.org — Build Lessons & Standing Rules

These rules are binding for all phases of this project. Read before writing any code or content.

---

## Rule: Never link outbound from homepage
**Reason:** Homepage receives all backlink equity. Outbound links from it dilute PageRank before it can be distributed internally.

---

## Rule: All outbound links use data-outbound="true" attribute
**Reason:** Makes future auditing and removal trivial without hunting through MDX content.

---

## Rule: City pages use CityPageTemplate — never custom one-offs
**Reason:** Consistency in structure and internal linking. Easier to update 8 pages at once.

---

## Rule: No stock photography anywhere
**Reason:** Maintains institutional, text-authority aesthetic. Images invite irrelevant alt text and break the .org resource feel.

---

## Rule: next.config.js must have output: 'export' and trailingSlash: true
**Reason:** Cloudflare Pages requires a fully static export in the `out/` directory. trailingSlash ensures clean URL routing on Cloudflare's static file server — without it, direct page loads on inner routes will 404.

---

## Rule: RelatedLinks are defined in navigation.ts, not hardcoded in MDX
**Reason:** Allows bulk updates to related links without editing individual content files.

---

## Rule: Every page must be reachable from at least two other pages
**Reason:** No orphan pages. Orphaned pages receive no internal link equity and may not be crawled.

---

## Rule: No outbound links at launch — Phase 3 only
**Reason:** Site must be indexed and rankings must stabilize (3–6 months) before introducing outbound links. Adding them too early risks leaking equity before the site establishes authority.

---

## Rule: Metadata for all 33 pages defined centrally in /lib/metadata.ts
**Reason:** Single source of truth for titles, descriptions, and canonicals. Prevents inconsistencies and makes bulk SEO edits easy.

---

## Rule: Brand abbreviation is NCLCRG, not NCLCRB
**Reason:** Legal clarity. NCLCRB was the old licensing board. Using that acronym risks confusion with a government entity and potential legal exposure.

---

## Rule: Disclaimer banner must be visible on every page
**Reason:** Site is an independent informational resource — not a government agency or licensing board. The disclaimer is a legal and trust requirement, not optional UI.
