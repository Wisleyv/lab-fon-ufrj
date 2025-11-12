# Follow-Up Recommendations
**Lab Fonética UFRJ - Next Steps**

**Current Branch:** `feature/local-content-editor`  
**Date:** 2025-11-12

---

## ✅ Completed Today

1. **Decision Documentation**
   - Created ADR 001: Content Management Strategy
   - Documented rationale for local HTML editor approach
   - Identified security risks and mitigations

2. **Project Planning**
   - Created comprehensive PROJECT_STATUS.md
   - Defined visual identity tasks
   - Specified team section requirements
   - Outlined timeline estimates

3. **Git Workflow**
   - Created feature branch: `feature/local-content-editor`
   - All documentation committed to main
   - Branch strategy established

---

## 🎯 Recommended Path Forward

### Option A: Visual Identity First (Recommended)

**Why:** Polish the visual foundation before building the editor. The editor will reference the final structure, so it's better to have the design locked in first.

#### Week 1: Visual Refinement

**Step 1: Logo Integration (Days 1-2)**
```powershell
# 1. Save the logo
# Place attached logo file as:
# public/assets/images/logo_labfonac_primary.png

# 2. Extract color palette
# Use a tool like:
# - https://coolors.co/image-picker
# - Adobe Color (color.adobe.com)
# - Or manually with a color picker

# 3. Update CSS variables
# Edit src/css/main.css
```

**Tasks:**
- [ ] Save logo to `public/assets/images/logo_labfonac_primary.png`
- [ ] Extract 3-5 blue shades from logo
- [ ] Create CSS custom properties in `:root`
- [ ] Update header to display logo
- [ ] Create favicon from logo (16x16, 32x32, 192x192)
- [ ] Test logo visibility on all backgrounds

**Step 2: Color Palette Application (Days 3-4)**
```css
/* Example color variables to define */
:root {
  --primary-blue: #[from logo];
  --secondary-blue: #[lighter];
  --accent-blue: #[darker];
  --blue-gradient: linear-gradient(135deg, var(--primary-blue), var(--secondary-blue));
  
  /* Neutrals */
  --text-dark: #212529;
  --text-medium: #6c757d;
  --text-light: #adb5bd;
  --background: #ffffff;
  --background-alt: #f8f9fa;
  --border-color: #dee2e6;
}
```

**Tasks:**
- [ ] Apply primary blue to header, buttons, links
- [ ] Use secondary blue for accents, hover states
- [ ] Test contrast ratios (use WebAIM Contrast Checker)
- [ ] Ensure WCAG AA compliance (4.5:1 for text)
- [ ] Document color usage guidelines

**Step 3: Social & Contact Links (Day 5)**
```html
<!-- Example structure -->
<section id="contato">
  <h2>Contato</h2>
  <div class="contact-links">
    <a href="https://instagram.com/labfoneticaufrj" target="_blank">
      <svg><!-- Instagram icon --></svg>
      @labfoneticaufrj
    </a>
    <a href="mailto:labfon@letras.ufrj.br">
      <svg><!-- Email icon --></svg>
      labfon@letras.ufrj.br
    </a>
  </div>
</section>
```

**Tasks:**
- [ ] Add Instagram link (get correct handle)
- [ ] Add mailto link
- [ ] Design/add social media icons (SVG preferred)
- [ ] Style hover states
- [ ] Make responsive

#### Week 2: Team Section Enhancement

**Step 4: Category Organization (Days 1-3)**

**Update data.json schema:**
```json
{
  "pesquisadores": [
    {
      "id": 1,
      "nome": "Dr. João Silva",
      "categoria": "coordenacao",  // NEW FIELD
      "foto": "/labfonac/assets/images/joao_silva.jpeg",
      "lattes": "http://lattes.cnpq.br/1234567890",
      "bio": "Coordenador do laboratório" // OPTIONAL
    }
  ]
}
```

**Categories:**
- `coordenacao` - Coordenação
- `docentes` - Docentes/Pesquisadores
- `pos_graduacao` - Discentes de Pós-Graduação
- `graduacao` - Discentes de Graduação

**Tasks:**
- [ ] Update `public/data.json` with category field
- [ ] Update JSONAdapter to handle categories
- [ ] Create category filter/grouping logic
- [ ] Add section headers for each category
- [ ] Style category sections

**Step 5: Display Style Options (Days 4-7)**

**Implement three view modes:**

**1. Grid View (Default)**
```html
<div class="team-view team-view--grid">
  <div class="team-member-card">
    <img src="..." alt="...">
    <h3>Nome</h3>
    <a href="lattes-link">CV Lattes</a>
  </div>
  <!-- Repeat -->
</div>
```

**2. List View**
```html
<div class="team-view team-view--list">
  <div class="team-member-row">
    <img src="..." alt="...">
    <div class="info">
      <h3>Nome</h3>
      <span class="category">Coordenação</span>
    </div>
    <a href="lattes-link">CV Lattes</a>
  </div>
  <!-- Repeat -->
</div>
```

**3. Card View (Expanded)**
```html
<div class="team-view team-view--cards">
  <div class="team-member-card-expanded">
    <img src="..." alt="...">
    <h3>Nome</h3>
    <span class="category">Coordenação</span>
    <p class="bio">...</p>
    <a href="lattes-link">CV Lattes</a>
  </div>
  <!-- Repeat -->
</div>
```

**View Toggle Buttons:**
```html
<div class="view-controls">
  <button data-view="grid" class="active">
    <svg><!-- Grid icon --></svg> Grade
  </button>
  <button data-view="list">
    <svg><!-- List icon --></svg> Lista
  </button>
  <button data-view="cards">
    <svg><!-- Card icon --></svg> Cartões
  </button>
</div>
```

**Tasks:**
- [ ] Create HTML structure for each view
- [ ] Style grid view (3-4 columns, responsive)
- [ ] Style list view (single column with flexbox)
- [ ] Style card view (2-3 columns, more padding)
- [ ] Implement view toggle JavaScript
- [ ] Save preference to localStorage
- [ ] Add smooth transitions between views
- [ ] Test on mobile (single column for all views)

**JavaScript Snippet:**
```javascript
// Save/load view preference
const viewButtons = document.querySelectorAll('.view-controls button');
const teamContainer = document.querySelector('.team-view');

viewButtons.forEach(button => {
  button.addEventListener('click', () => {
    const view = button.dataset.view;
    
    // Update classes
    teamContainer.className = `team-view team-view--${view}`;
    
    // Save preference
    localStorage.setItem('teamViewPreference', view);
    
    // Update active button
    viewButtons.forEach(b => b.classList.remove('active'));
    button.classList.add('active');
  });
});

// Load saved preference on page load
window.addEventListener('DOMContentLoaded', () => {
  const savedView = localStorage.getItem('teamViewPreference') || 'grid';
  const button = document.querySelector(`[data-view="${savedView}"]`);
  if (button) button.click();
});
```

---

### Option B: Editor First, Visual Second

**Why:** If you want to enable content entry immediately, build the editor first. Visual polish can happen in parallel or after.

**Not Recommended Because:**
- Editor should match final structure (avoid rework)
- Visual identity affects form design
- Better to have stable foundation first

**However, if you choose this:**
- Switch to main branch
- Merge feature/local-content-editor later
- Work on both in parallel

---

## 🛠️ Immediate Next Steps (This Week)

### Priority Order

**Day 1 (Today - Continued):**
1. Save attached logo to workspace:
   ```powershell
   # Save as: public/assets/images/logo_labfonac_primary.png
   ```

2. Extract color palette:
   - Use online tool or color picker
   - Document RGB/HEX values
   - Create color swatch image

3. Begin CSS updates:
   - Add CSS custom properties
   - Update header background
   - Add logo to header

**Day 2-3:**
1. Complete color palette application
2. Test contrast and accessibility
3. Add social media links
4. Refine spacing and typography

**Day 4-5:**
1. Update data.json with category field
2. Add test data for all categories
3. Create category sections

**Day 6-7:**
1. Build grid view (default)
2. Build list view
3. Build card view
4. Add view toggle controls
5. Test and refine

---

## 📋 Checklist for Merge to Main

Before merging `feature/local-content-editor` back to `main`:

**Visual Identity:**
- [ ] Logo integrated in header
- [ ] Favicon created and working
- [ ] Color palette applied consistently
- [ ] Typography refined
- [ ] Spacing consistent
- [ ] Social media links working
- [ ] Mobile responsive tested

**Team Section:**
- [ ] Categories implemented
- [ ] All four categories display correctly
- [ ] Grid view working
- [ ] List view working
- [ ] Card view working
- [ ] View toggle functional
- [ ] Preference saved to localStorage
- [ ] Mobile responsive for all views

**Testing:**
- [ ] Cross-browser (Chrome, Firefox, Safari, Edge)
- [ ] Mobile devices (iOS, Android)
- [ ] Accessibility (screen reader, keyboard navigation)
- [ ] Performance (Lighthouse score > 90)
- [ ] All links working
- [ ] Images loading correctly

**Documentation:**
- [ ] Update PROJECT_STATUS.md
- [ ] Document color palette
- [ ] Document team section usage
- [ ] Update DEPLOYMENT.md if needed

---

## 🚀 Deployment After Merge

```powershell
# 1. Switch back to main
git checkout main

# 2. Merge feature branch
git merge feature/local-content-editor

# 3. Resolve any conflicts

# 4. Build
npm run build

# 5. Verify build output
ls C:\labfonac

# 6. Upload to staging via FileZilla
# Server: wisley.net
# Path: /labfonac/

# 7. Test on staging
# URL: https://wisley.net/labfonac

# 8. If all good, deploy to production
# Server: posvernaculas.letras.ufrj.br
# Path: /labfonac/

# 9. Tag release
git tag -a v1.0.0 -m "Release 1.0: Visual identity + team categories"
git push origin v1.0.0
```

---

## 📚 Resources & Tools

**Color Palette Extraction:**
- Coolors Image Picker: https://coolors.co/image-picker
- Adobe Color: https://color.adobe.com/create/image
- HTML Color Codes: https://htmlcolorcodes.com/color-picker/

**Accessibility Testing:**
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- WAVE: https://wave.webaim.org/
- Lighthouse (Chrome DevTools)

**Icon Resources:**
- Font Awesome: https://fontawesome.com/ (Instagram icon)
- Heroicons: https://heroicons.com/ (MIT licensed)
- Feather Icons: https://feathericons.com/

**Image Optimization:**
- TinyPNG: https://tinypng.com/
- Squoosh: https://squoosh.app/

---

## 💡 Tips & Best Practices

**CSS Organization:**
- Keep color variables at the top of main.css
- Group related styles together
- Use comments to mark sections
- Follow BEM naming convention for classes

**JavaScript:**
- Keep view toggle code simple
- Use data attributes for configuration
- Save preferences to localStorage
- Add smooth transitions (CSS transitions, not JS)

**Testing:**
- Test on real devices, not just browser DevTools
- Check on slow 3G connection
- Verify all images load
- Test keyboard navigation (Tab, Enter, Esc)

**Git Commits:**
- Commit frequently (after each feature)
- Write descriptive commit messages
- Use conventional commits format:
  - `feat:` new feature
  - `fix:` bug fix
  - `style:` formatting, CSS changes
  - `docs:` documentation
  - `refactor:` code restructuring

---

## 🎓 Learning Resources

**Modern CSS:**
- CSS Grid: https://cssgrid.io/
- Flexbox: https://flexbox.io/
- CSS Custom Properties: https://developer.mozilla.org/en-US/docs/Web/CSS/--*

**JavaScript:**
- localStorage API: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- Event delegation: https://javascript.info/event-delegation

**Accessibility:**
- A11y Project: https://www.a11yproject.com/
- WCAG Guidelines: https://www.w3.org/WAI/WCAG21/quickref/

---

## Questions or Issues?

If you encounter problems:
1. Check docs/PROJECT_STATUS.md for current state
2. Review docs/decisions/001-content-management-strategy.md for context
3. Check git history for recent changes
4. Test in npm run dev before building

**Common Issues:**
- Images not loading → Check paths start with `/labfonac/`
- Colors not applying → Verify CSS custom properties defined
- View toggle not working → Check JavaScript console for errors
- Build fails → Run `npm install` again

---

**Status:** Ready to Proceed  
**Next Action:** Save logo and extract color palette  
**Branch:** `feature/local-content-editor`  
**Timeline:** 2-3 weeks to complete visual refinements
