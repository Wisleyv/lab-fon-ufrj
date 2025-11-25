To convert the text from your image into code while preserving that professional, academic look, we need to replicate the typography hierarchy: a strong **Serif font** for the main title and a clean **Sans-Serif font** for the university name.

Since we are moving away from proprietary fonts (like Canva's *Antonio*), I have selected two high-quality, free Google Fonts that closely match the style in your screenshot:

  * **Merriweather:** A highly readable Serif font (great for the main title).
  * **Roboto:** A clean Sans-Serif (standard for technical/university subtitles).

Here is the complete HTML and CSS code.

### 1\. The HTML

Place this where your logo currently sits. I used a container `div` that represents the area to the right of your wave icon.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Roboto:wght@300;400&display=swap" rel="stylesheet">

<div class="logo-text-container">
    <h1 class="lab-title">Laboratório de Fonética Acústica</h1>
    <span class="uni-subtitle">Universidade Federal do Rio de Janeiro</span>
</div>
```

### 2\. The CSS

Add this to your stylesheet. I have tuned the font weights and line heights to match the compact look of your screenshot.

```css
/* Container to hold the two lines of text */
.logo-text-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    line-height: 1.2; /* Keeps the two lines close together */
}

/* The Main Title (Serif, Bold) */
.lab-title {
    font-family: 'Merriweather', serif; /* professional academic look */
    font-weight: 700; /* Bold */
    font-size: 24px;  /* Adjust based on your navbar height */
    color: #FFFFFF;   /* White text */
    margin: 0;        /* Removes default browser spacing */
    padding: 0;
    letter-spacing: -0.5px; /* Slight tightening for a logo feel */
}

/* The University Subtitle (Sans-Serif, Thin/Regular) */
.uni-subtitle {
    font-family: 'Roboto', sans-serif; /* Clean technical look */
    font-weight: 300; /* Light/Regular weight */
    font-size: 14px;  /* Significantly smaller than title */
    color: #E0E0E0;   /* Slight off-white for visual hierarchy */
    margin-top: 2px;  /* Tiny space between title and subtitle */
}

/* Mobile Responsiveness Rule */
@media (max-width: 600px) {
    .lab-title {
        font-size: 18px; /* Smaller on phone */
    }
    .uni-subtitle {
        font-size: 11px; /* Smaller on phone */
        display: block;  /* Ensures it stays on its own line */
    }
}
```

### Why this works for our scenario:

1.  **SEO:** Search engines can now read "Laboratório de Fonética Acústica" as the H1 (main heading) of the site.
2.  **Responsiveness:** The `@media` rule at the bottom ensures that if the screen gets too small (like a cellphone), the font size automatically shrinks so it doesn't break the layout.
3.  **Legibility:** Unlike the JPG logo which gets blurry when resized, this text will remain razor-sharp on all screens.