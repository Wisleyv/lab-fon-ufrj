# Project Status & Next Steps
**Lab Fonética UFRJ Website Development**

**Date:** November 12, 2025  
**Branch:** main  
**Last Update:** Content management decision documented

---

## Current State Assessment

### ✅ Completed

**Infrastructure (100%)**
- [x] Vite build system configured
- [x] Deployment workflow to C:\labfonac
- [x] Git repository initialized and synced
- [x] Remote repository configured (lab-fon-ufrj)
- [x] Branch protection strategy defined
- [x] .gitignore configured for build output

**Assets (100%)**
- [x] 44 image files integrated (team photos + logos)
- [x] PNG and JPEG versions available
- [x] Images in public/assets/images/
- [x] Image documentation (README.md)
- [x] Build output verified

**Core Structure (80%)**
- [x] HTML skeleton with semantic sections
- [x] Basic CSS styling
- [x] Responsive layout foundation
- [x] Navigation structure
- [x] data.json structure defined
- [x] JavaScript data loading implemented
- [⚠️] Visual identity needs refinement (logo integration pending)
- [⚠️] Color palette needs adjustment
- [⚠️] Team section needs category organization

**Deployment (100%)**
- [x] Build process working (npm run build)
- [x] Output to C:\labfonac verified
- [x] Staging server tested (wisley.net/labfonac)
- [x] .htaccess configured for WordPress subfolder
- [x] Deployment documentation complete

**Content Management (Planned)**
- [x] Strategy decided (Local HTML Editor)
- [x] ADR documented
- [ ] Editor implementation pending
- [ ] User documentation pending

---

## Pending Tasks

### 🎨 Priority 1: Visual Identity Refinement

**Logo Integration**
- [ ] Save attached logo to `public/assets/images/logo_labfonac_primary.png`
- [ ] Extract blue color palette from logo
- [ ] Update CSS variables with brand colors
- [ ] Add logo to header/navigation
- [ ] Create favicon from logo
- [ ] Test logo visibility on all backgrounds

**Color Palette (Blue Shades from Logo)**
- [ ] Define CSS custom properties:
  ```css
  :root {
    --primary-blue: #[extracted from logo];
    --secondary-blue: #[lighter shade];
    --accent-blue: #[darker shade];
    --text-dark: #333;
    --text-light: #666;
    --background: #fff;
    --background-light: #f8f9fa;
  }
  ```
- [ ] Update all color references in main.css
- [ ] Test contrast ratios (WCAG AA compliance)
- [ ] Document color usage guidelines

**Typography Polish**
- [ ] Verify font loading (Lattes CNPq preconnect)
- [ ] Fine-tune font sizes for readability
- [ ] Adjust line heights and letter spacing
- [ ] Test on mobile devices

**Spacing & Layout**
- [ ] Review section padding/margins
- [ ] Ensure consistent spacing scale
- [ ] Test responsive breakpoints
- [ ] Verify mobile navigation

---

### 👥 Priority 2: Team Section Enhancement

**Category Organization**
The team section needs subsections for:
1. **Coordenação** (Coordination)
2. **Docentes/Pesquisadores** (Faculty/Researchers)
3. **Discentes de Pós-Graduação** (Graduate Students)
4. **Discentes de Graduação** (Undergraduate Students)

**Display Style Options**
Implement multiple view modes with user preference:

**Default: Grid View**
```
┌─────┐ ┌─────┐ ┌─────┐
│Photo│ │Photo│ │Photo│
│Name │ │Name │ │Name │
│Link │ │Link │ │Link │
└─────┘ └─────┘ └─────┘
```

**List View**
```
[Photo] Name ────────── [Lattes Link]
[Photo] Name ────────── [Lattes Link]
[Photo] Name ────────── [Lattes Link]
```

**Card View (Expanded)**
```
┌──────────────────┐
│      Photo       │
│                  │
│  Name            │
│  Category        │
│  Bio (optional)  │
│  [Lattes Link]   │
└──────────────────┘
```

**Implementation Tasks:**
- [ ] Update data.json schema to include category field
- [ ] Create category filter/section headers
- [ ] Build grid view component (default)
- [ ] Build list view component
- [ ] Build card view component
- [ ] Add view toggle buttons
- [ ] Save user preference to localStorage
- [ ] Style each view mode
- [ ] Test with real data
- [ ] Make responsive for mobile

---

### 🔗 Priority 3: Social & Contact Links

**Social Media Integration**
- [ ] Add Instagram link to header/footer
- [ ] Design social media icon set
- [ ] Add mailto link for contact
- [ ] Style link hover states
- [ ] Test all external links

**No Contact Forms**
Decision: Use simple links instead of embedded forms
- [x] No form implementation needed
- [ ] Clear email link with icon
- [ ] "Contact Us" section with social links

---

### 📝 Priority 4: Content Editor Development

**Branch:** `feature/local-content-editor`

**Core Editor Features**
- [ ] Create `public/admin/editor.html`
- [ ] Implement file load (drag-and-drop data.json)
- [ ] Build form sections:
  - [ ] Team members (with category dropdown)
  - [ ] Publications
  - [ ] Research projects
  - [ ] Partners
- [ ] Validation logic:
  - [ ] Required fields
  - [ ] URL format (Lattes links)
  - [ ] Category selection
  - [ ] Image path verification
- [ ] Download updated JSON button
- [ ] Clear instructions panel

**Enhanced Features (Phase 2)**
- [ ] Image preview
- [ ] Undo/redo
- [ ] Search/filter team members
- [ ] Duplicate entry (template feature)
- [ ] Export backup before changes
- [ ] Live preview panel

**Documentation**
- [ ] Create `public/admin/README.md`
- [ ] Step-by-step usage guide
- [ ] FTP upload tutorial
- [ ] Troubleshooting section
- [ ] Video walkthrough (optional)

---

## Technical Debt & Issues

**Current Issues:**
- None critical

**Future Improvements:**
- Consider WebP image format for better compression
- Implement lazy loading for images
- Add loading skeletons for better UX
- Consider service worker for offline capability

---

## Git Workflow

### Current Branch Structure
```
main (protected)
└── feature/local-content-editor (to be created)
```

### Planned Branches
- `feature/local-content-editor` - Editor development
- `feature/visual-identity` - Logo integration & color refinement (optional)
- `feature/team-section-views` - Display options implementation (optional)

### Branch Strategy
1. Create feature branch for each major task
2. Commit frequently with descriptive messages
3. Test thoroughly before merging to main
4. Tag releases: v1.0.0, v1.1.0, etc.

---

## Timeline Estimate

### Week 1-2: Visual Polish
- Days 1-3: Logo integration, color palette extraction
- Days 4-7: CSS refinement, typography, spacing
- Days 8-10: Team section category organization
- Days 11-14: Display style options implementation

### Week 3: Content Editor
- Days 1-3: Core editor functionality
- Days 4-5: Validation and error handling
- Days 6-7: User documentation and testing

### Week 4: Testing & Deployment
- Days 1-3: Cross-browser testing
- Days 4-5: Mobile testing
- Days 6: Staging deployment and review
- Day 7: Production deployment

---

## Next Immediate Actions

### Today (2025-11-12)
1. ✅ Document decision-making process (ADR 001)
2. ⏳ Create feature branch for editor
3. ⏳ Commit ADR and project status docs
4. ⏳ Save logo to workspace
5. ⏳ Extract color palette from logo

### This Week
1. Integrate logo into header
2. Update color scheme
3. Organize team section by categories
4. Begin editor HTML structure

---

## Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-12 | Local HTML Editor (not PHP) | Security, simplicity, maintainability |
| 2025-11-12 | Keep hashed filenames in build | Cache busting, industry standard |
| 2025-11-12 | Blue palette from logo | Visual identity consistency |
| 2025-11-12 | Team categories & display options | Better organization, user choice |
| 2025-11-12 | Social links only (no forms) | Simplicity, no spam issues |

---

## Resources

- **ADR 001:** [Content Management Strategy](./decisions/001-content-management-strategy.md)
- **Deployment Guide:** [DEPLOYMENT.md](../DEPLOYMENT.md)
- **Image Assets:** [public/assets/images/README.md](../public/assets/images/README.md)
- **Repository:** https://github.com/Wisleyv/lab-fon-ufrj
- **Staging:** https://wisley.net/labfonac
- **Production:** https://posvernaculas.letras.ufrj.br/labfonac (pending)

---

**Status:** Active Development  
**Last Updated:** 2025-11-12  
**Next Review:** 2025-11-19
