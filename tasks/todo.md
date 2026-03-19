# nclcrb.org — NC Landscape Contractor Resource Guide
## Build Tasks

---

## Phase 1 — Foundation

- [ ] Initialize Next.js 14 project with App Router + static export
- [ ] Configure Tailwind CSS with custom design tokens
- [ ] Install and configure next-sitemap
- [ ] Build Header, Footer, DisclaimerBanner components
- [ ] Build PageHeader, Breadcrumb, TableOfContents, RelatedLinks components
- [ ] Create /lib/navigation.ts with full site map and related links map
- [ ] Create /lib/metadata.ts with all 33 page metadata entries
- [ ] Build homepage (/)
- [ ] Build all 12 core licensing pages
- [ ] Build all 8 supporting pages
- [ ] Build CityPageTemplate component
- [ ] Build all 8 city pages using template
- [ ] Verify zero orphan pages
- [ ] Generate sitemap.xml and robots.txt
- [ ] QA: all internal links resolve, no broken hrefs
- [ ] QA: mobile responsive check on all page types

---

## Phase 2 — Content QA

- [ ] All pages 600+ words
- [ ] All pages have H2/H3 structure
- [ ] All RelatedLinks blocks populated
- [ ] Schema markup validated
- [ ] Meta descriptions within 160 chars

---

## Phase 3 — Post-Launch (3–6 months out)

- [ ] Identify outbound link targets (partner/client sites)
- [ ] Add contextual outbound links to city pages
- [ ] Add contextual outbound links to "How to Hire" page
- [ ] Monitor rankings and indexing via Search Console

---

## Launch Checklist

- [ ] `output: 'export'` and `trailingSlash: true` set in next.config.js
- [ ] Repo pushed to GitHub
- [ ] Cloudflare Pages project created and connected to repo
- [ ] Build succeeds and `out/` directory generates correctly
- [ ] Custom domain nclcrb.org connected in Cloudflare Pages
- [ ] SSL active
- [ ] All 33 pages live and returning 200
- [ ] Google Search Console verified and sitemap submitted
- [ ] No console errors on any page type
- [ ] Disclaimer banner visible on all pages
- [ ] Homepage canonical confirmed
- [ ] No outbound links present at launch
