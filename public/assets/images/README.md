# Image Assets Reference

This document describes the image assets available for the Lab Fonética UFRJ website.

## Location

**Source (Workspace):** `public/assets/images/`  
**Build Output:** `C:\labfonac\assets\images\`  
**Server Path:** `/labfonac/assets/images/`

## How to Use Images

### In HTML
```html
<img src="/labfonac/assets/images/logo_labfonac.jpeg" alt="Lab Fonética Logo">
```

### In CSS
```css
.hero {
  background-image: url('/labfonac/assets/images/logo_ufrj.jpeg');
}
```

### In JavaScript
```javascript
const imagePath = '/labfonac/assets/images/carolina_silva.jpeg';
```

## Available Images

### Logos (7 images)
- `logo_labfonac.jpeg` - Lab Fonética logo
- `logo_provale.jpeg` - PROVALE logo
- `logo_uern.jpeg` - UERN university logo
- `logo_ufpb.jpeg` - UFPB university logo
- `logo_ufrj.jpeg` - UFRJ university logo
- `logo_unila.jpeg` - UNILA university logo

### Team Photos (14 images)
- `carolina_silva.jpeg`
- `daniel_saraiva.jpeg`
- `isabelli_lacet.jpeg`
- `jose_mesquita.jpeg`
- `juliana_dias.jpeg`
- `jussara_soares.jpeg`
- `manuella_carnaval.jpeg`
- `maria_luiza_weinstein.jpeg`
- `mayra_santos.jpeg`
- `mikaellen_nascimento.jpeg`
- `natalia_figueiredo.jpeg`
- `paloma_moura.jpeg`
- `priscila_almeida.jpeg`
- `safira_brandao.jpeg`
- `tatiana_alcon.jpeg`

### Other
- `png/` - Directory (check contents if needed)

## Image Optimization Tips

### Current Format
All images are JPEG format with sizes ranging from ~15KB to ~55KB.

### Recommendations
1. **WebP Conversion**: Consider converting to WebP for better compression
2. **Responsive Images**: Use `srcset` for different screen sizes
3. **Lazy Loading**: Add `loading="lazy"` for images below the fold
4. **Alt Text**: Always provide descriptive alt text for accessibility

### Example: Responsive Image
```html
<img 
  src="/labfonac/assets/images/logo_labfonac.jpeg"
  alt="Laboratório de Fonética UFRJ"
  loading="lazy"
  width="200"
  height="200"
>
```

## Adding New Images

### Workflow
1. **Add to workspace**: Place new images in `public/assets/images/`
2. **Build**: Run `npm run build`
3. **Verify**: Check `C:\labfonac\assets\images\` contains the new images
4. **Deploy**: Upload via FileZilla
5. **Commit**: `git add public/assets/images/` and commit

### File Naming Convention
- Use lowercase
- Use underscores for spaces: `first_name_last_name.jpeg`
- Use descriptive names: `logo_institution.jpeg`
- Consistent extension: `.jpeg` for photos, `.png` for graphics with transparency

## Integration with data.json

When referencing team photos in `public/data.json`:

```json
{
  "pesquisadores": [
    {
      "nome": "Carolina Silva",
      "foto": "/labfonac/assets/images/carolina_silva.jpeg",
      "descricao": "Researcher description",
      "lattes": "http://lattes.cnpq.br/..."
    }
  ]
}
```

## Important Notes

✅ **Files in `public/` are copied as-is to build output**  
✅ **Always use absolute paths starting with `/labfonac/`**  
✅ **Images are tracked in Git repository**  
✅ **Vite automatically copies them during build**  
✅ **No import required for static assets in public/**

## Troubleshooting

### Image not loading
1. Check the path starts with `/labfonac/`
2. Verify file exists in `C:\labfonac\assets\images\`
3. Check file was uploaded to server
4. Verify file permissions on server (644)

### Image not in build output
1. Ensure image is in `public/assets/images/` (not `src/assets/images/`)
2. Run `npm run build` again
3. Check `C:\labfonac\assets\images\`

### 404 errors
1. Clear browser cache
2. Check .htaccess is uploaded
3. Verify full path: `https://wisley.net/labfonac/assets/images/filename.jpeg`
