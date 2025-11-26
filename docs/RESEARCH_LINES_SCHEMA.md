# Research Lines Data Schema
**Phase 1 Deliverable - November 26, 2025**

## Overview
This document defines the data schema for the "Linhas de Pesquisa" (Research Lines) section, integrated into the existing `data.json` structure.

---

## Schema Definition

### Top-Level Structure
The research lines data is added as a new top-level property `linhas_pesquisa` in `public/data.json`:

```json
{
  "equipe": [...],      // Existing team data (unchanged)
  "linhas_pesquisa": [  // NEW: Research lines array
    {
      "id": "string",
      "nome": "string",
      "icon": "string",
      "estudantes": number,
      "pesquisadores": number,
      "descricao": "string",
      "ordem": number
    }
  ]
}
```

---

## Field Specifications

### `linhas_pesquisa` (Array)
Array of research line objects, each with the following properties:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `id` | string | Yes | Unique identifier (kebab-case) | `"fonetica-experimental"` |
| `nome` | string | Yes | Display name of research line | `"Fonética Experimental"` |
| `icon` | string | Yes | Font Awesome class | `"fa-solid fa-wave-square"` |
| `estudantes` | number | Yes | Number of students in line | `0` |
| `pesquisadores` | number | Yes | Number of researchers in line | `3` |
| `descricao` | string | Yes | Description text (placeholder for now) | `"[Descrição da linha de pesquisa]"` |
| `ordem` | number | Yes | Display order (1-based) | `1` |

---

## Data Validation Rules

### ID Field
- **Format:** Lowercase, kebab-case (words separated by hyphens)
- **Pattern:** `^[a-z]+(-[a-z]+)*$`
- **Uniqueness:** Must be unique across all research lines
- **Examples:** 
  - ✅ `"fonetica-experimental"`
  - ✅ `"prosodia-multimodal"`
  - ❌ `"Fonética Experimental"` (uppercase, spaces)
  - ❌ `"fonetica_experimental"` (underscores)

### Nome Field
- **Format:** Title case, proper Portuguese spelling
- **Allowed:** Letters, spaces, accents, ampersands
- **Examples:**
  - ✅ `"Prosódia e Expressividade"`
  - ✅ `"Prosódia Multimodal"`

### Icon Field
- **Format:** Font Awesome 6.x class name
- **Pattern:** `^fa-(solid|regular|brands) fa-[a-z-]+$`
- **Library:** Font Awesome 6.4.0+ (CDN or npm)
- **Examples:**
  - ✅ `"fa-solid fa-wave-square"`
  - ✅ `"fa-solid fa-masks-theater"`
  - ❌ `"fas fa-wave"` (Font Awesome 5 syntax)

### Estudantes Field
- **Type:** Non-negative integer
- **Range:** `0` to `999`
- **Default:** `0` (if no students)

### Pesquisadores Field
- **Type:** Positive integer
- **Range:** `1` to `999`
- **Constraint:** Must have at least 1 researcher

### Descricao Field
- **Format:** Plain text (no HTML)
- **Placeholder:** `"[Descrição da linha de pesquisa]"`
- **Future:** Will be replaced with actual descriptions
- **Length:** Recommended 100-300 characters when populated

### Ordem Field
- **Type:** Positive integer (1-based)
- **Purpose:** Defines display order
- **Constraint:** Should be sequential (1, 2, 3, 4, 5)
- **Usage:** Allows reordering without changing array order

---

## Current Data

### Implemented Research Lines (5 total)

1. **Fonética Experimental**
   - ID: `fonetica-experimental`
   - Icon: `fa-solid fa-wave-square` (sound wave)
   - Students: 0
   - Researchers: 3

2. **Prosódia e Expressividade**
   - ID: `prosodia-expressividade`
   - Icon: `fa-solid fa-masks-theater` (theater masks)
   - Students: 4
   - Researchers: 4

3. **Prosódia e Fonologia**
   - ID: `prosodia-fonologia`
   - Icon: `fa-solid fa-diagram-project` (project diagram)
   - Students: 5
   - Researchers: 3

4. **Prosódia e Interfaces**
   - ID: `prosodia-interfaces`
   - Icon: `fa-solid fa-network-wired` (network)
   - Students: 4
   - Researchers: 7

5. **Prosódia Multimodal**
   - ID: `prosodia-multimodal`
   - Icon: `fa-solid fa-photo-film` (multimedia)
   - Students: 6
   - Researchers: 3

### Statistics
- **Total Lines:** 5
- **Total Students:** 19 (across all lines)
- **Total Researchers:** 20 (across all lines)
- **Average Students per Line:** 3.8
- **Average Researchers per Line:** 4.0

---

## Icon Mapping

### Font Awesome Classes Used

| Icon Class | Visual Representation | Research Line |
|-----------|----------------------|---------------|
| `fa-wave-square` | Sound waveform | Fonética Experimental |
| `fa-masks-theater` | Theater masks | Prosódia e Expressividade |
| `fa-diagram-project` | Network diagram | Prosódia e Fonologia |
| `fa-network-wired` | Connected nodes | Prosódia e Interfaces |
| `fa-photo-film` | Multimedia icon | Prosódia Multimodal |

### Icon Library Integration
- **Library:** Font Awesome 6.4.0
- **Source:** CDN (from `linhas_pesquisa.html`)
- **CDN URL:** `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`
- **Alternative:** NPM package `@fortawesome/fontawesome-free`

---

## Compatibility Analysis

### Non-Regression Verification ✅

**Existing Data Structures (Unchanged):**
- ✅ `equipe` array - Team members data intact
- ✅ Array structure and nesting preserved
- ✅ All existing fields untouched

**JSON Validation:**
- ✅ Syntax valid (tested with PowerShell ConvertFrom-Json)
- ✅ No conflicting property names
- ✅ Proper comma placement
- ✅ Correct nesting levels

**Application Testing:**
- ✅ Vite dev server starts successfully
- ✅ No console errors on data load
- ✅ Team section renders correctly
- ✅ Publications section renders correctly
- ✅ No JavaScript errors

**Schema Compatibility:**
- ✅ Follows same patterns as existing sections
- ✅ Uses kebab-case for IDs (consistent with section IDs)
- ✅ Uses Portuguese for display text (consistent with team data)
- ✅ Numeric fields for counts (simple integers)

---

## Future Extensibility

### Potential Schema Extensions

**Phase 2 Enhancements:**
```json
{
  "id": "fonetica-experimental",
  "nome": "Fonética Experimental",
  "nome_curto": "Fon. Exp.",           // NEW: Short name for mobile
  "icon": "fa-solid fa-wave-square",
  "cor": "#054CAA",                     // NEW: Custom color
  "estudantes": 0,
  "pesquisadores": 3,
  "descricao": "Descrição completa...",
  "descricao_curta": "Resumo...",      // NEW: Short description
  "coordenador": "Nome do Coordenador", // NEW: Line coordinator
  "ordem": 1,
  "ativo": true                         // NEW: Active/inactive flag
}
```

**Phase 3 Enhancements (Advanced):**
```json
{
  // ... existing fields ...
  "membros": [                          // NEW: Link to team members
    "id_membro_1",
    "id_membro_2"
  ],
  "publicacoes": [                      // NEW: Link to publications
    "ref_001",
    "ref_002"
  ],
  "projetos": [                         // NEW: Related projects
    {
      "nome": "Projeto X",
      "descricao": "...",
      "financiamento": "CNPq"
    }
  ],
  "keywords": [                         // NEW: Keywords for search
    "prosódia",
    "entonação"
  ]
}
```

---

## Implementation Notes

### Data Source
- **Original:** `docs/linhas_pesquisa.html`
- **Transformed:** Manual extraction to JSON
- **Validation:** Counts verified against source HTML

### Naming Conventions
- **ID format:** kebab-case (URL-safe)
- **Display names:** Title Case with proper accents
- **File naming:** Follow existing patterns (e.g., `linhas-pesquisa.js`)

### Placeholder Strategy
- **Current:** `"[Descrição da linha de pesquisa]"`
- **Purpose:** Clear visual indicator that content is pending
- **Future:** Replace with actual descriptions in Portuguese
- **Format:** HTML will be sanitized via `HTMLSanitizer.sanitize()`

---

## Testing Checklist

### Phase 1 Testing (Completed) ✅
- [x] JSON syntax valid
- [x] Schema follows existing patterns
- [x] No property name conflicts
- [x] Existing sections unaffected
- [x] Dev server starts without errors
- [x] Team section loads
- [x] Publications section loads
- [x] No console warnings/errors

### Phase 2 Testing (Pending)
- [ ] HTML section renders
- [ ] Navigation includes new link
- [ ] Scroll positioning correct

### Phase 3 Testing (Pending)
- [ ] Icons render correctly
- [ ] Counts display accurately
- [ ] Description placeholder visible

---

## Rollback Plan

### If Issues Detected
```bash
# Revert data.json changes
git checkout HEAD -- public/data.json

# Or manually remove the linhas_pesquisa property
# Edit public/data.json and remove lines 226-262
```

### Verification After Rollback
```powershell
# Test JSON validity
Get-Content public/data.json | ConvertFrom-Json

# Restart dev server
npm run dev

# Check all sections load
```

---

## Next Steps (Phase 2)

1. **HTML Integration**
   - Add Font Awesome CDN link to `index.html`
   - Create `<section id="linhas-pesquisa">` structure
   - Position after "Sobre" section, before "Equipe" section

2. **Renderer Creation**
   - Create `src/js/sections/linhas-pesquisa.js`
   - Extend `SectionRenderer` base class
   - Implement `template()` method

3. **Testing**
   - Verify data loads correctly
   - Check icon rendering
   - Validate layout structure

---

**Phase 1 Status:** ✅ **COMPLETE**  
**Deliverable:** Data schema defined and integrated  
**Impact:** Zero regression - all existing functionality preserved  
**Ready for:** Phase 2 - HTML Structure Integration
