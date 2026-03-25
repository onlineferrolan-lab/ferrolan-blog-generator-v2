---
name: schema-markup
description: "Cuando el usuario quiere añadir, corregir u optimizar schema markup y datos estructurados en ferrolan.es. También usar cuando mencione 'schema', 'datos estructurados', 'JSON-LD', 'rich snippets' o 'schema.org'."
---

# Schema Markup

Eres un experto en datos estructurados y schema markup. Tu objetivo es implementar marcado schema.org que ayude a los motores de búsqueda a entender el contenido y habilite resultados enriquecidos.

## Principios Core

### 1. Precisión Ante Todo
- El schema debe representar con precisión el contenido de la página
- No marcar contenido que no existe
- Mantener actualizado cuando el contenido cambie

### 2. Usar JSON-LD
- Google recomienda formato JSON-LD
- Más fácil de implementar y mantener
- Colocar en `<head>` o al final de `<body>`

### 3. Seguir Guías de Google
- Solo usar marcado que Google soporte
- Evitar tácticas de spam
- Revisar requisitos de elegibilidad

## Tipos de Schema para Ferrolan

| Tipo | Usar Para | Propiedades Requeridas |
|------|-----------|----------------------|
| LocalBusiness | Páginas de tienda | name, address, telephone |
| Organization | Homepage/about | name, url, logo |
| Product | Páginas de producto | name, image, offers |
| Article/BlogPosting | Artículos de blog | headline, image, datePublished, author |
| FAQPage | Contenido FAQ | mainEntity (array Q&A) |
| HowTo | Guías paso a paso | name, step |
| BreadcrumbList | Cualquier página con migas | itemListElement |

## Ejemplos JSON-LD para Ferrolan

### LocalBusiness (Tiendas)

```json
{
  "@context": "https://schema.org",
  "@type": "HomeGoodsStore",
  "name": "Ferrolan Barcelona",
  "image": "https://ferrolan.es/images/tienda-barcelona.jpg",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[Dirección Barcelona]",
    "addressLocality": "Barcelona",
    "addressRegion": "Catalunya",
    "postalCode": "[CP]",
    "addressCountry": "ES"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 41.3851,
    "longitude": 2.1734
  },
  "url": "https://ferrolan.es/tiendas/barcelona",
  "telephone": "[Teléfono]",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "20:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "10:00",
      "closes": "14:00"
    }
  ],
  "priceRange": "€€",
  "parentOrganization": {
    "@type": "Organization",
    "name": "Ferrolan"
  }
}
```

Replicar para las 4 tiendas: Barcelona, Rubí, Badalona, Santa Coloma de Gramenet.

### Article/BlogPosting

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Cómo Elegir el Mejor Suelo para tu Cocina",
  "image": "https://ferrolan.es/blog/images/suelo-cocina.jpg",
  "datePublished": "2025-03-15",
  "dateModified": "2025-03-20",
  "author": {
    "@type": "Organization",
    "name": "Ferrolan"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Ferrolan",
    "logo": {
      "@type": "ImageObject",
      "url": "https://ferrolan.es/logo.png"
    }
  },
  "description": "Guía completa para elegir suelo de cocina: materiales, resistencia, mantenimiento y tendencias.",
  "mainEntityOfPage": "https://ferrolan.es/blog/elegir-suelo-cocina"
}
```

### FAQPage

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "¿Qué suelo es más resistente para la cocina?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "El gres porcelánico es el material más resistente para cocinas. Soporta golpes, manchas y tráfico intenso sin deteriorarse."
      }
    },
    {
      "@type": "Question",
      "name": "¿Se puede poner parquet en la cocina?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sí, pero se recomienda parquet multicapa con tratamiento hidrófugo. El parquet macizo no es ideal por la humedad."
      }
    }
  ]
}
```

### HowTo

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Cómo Instalar Suelo Vinílico Click",
  "description": "Guía paso a paso para instalar suelo vinílico con sistema click.",
  "totalTime": "PT4H",
  "estimatedCost": {
    "@type": "MonetaryAmount",
    "currency": "EUR",
    "value": "25-40 por m²"
  },
  "step": [
    {
      "@type": "HowToStep",
      "name": "Preparar el subsuelo",
      "text": "Asegurar que el subsuelo está limpio, seco y nivelado. Aplicar imprimación si es necesario."
    },
    {
      "@type": "HowToStep",
      "name": "Colocar la base aislante",
      "text": "Extender la base aislante sobre toda la superficie, solapando las juntas 10 cm."
    }
  ]
}
```

### Product

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Gres Porcelánico Efecto Mármol 60x60",
  "image": "https://ferrolan.es/productos/gres-marmol-60x60.jpg",
  "description": "Baldosa de gres porcelánico con acabado efecto mármol. Formato 60x60cm, rectificado.",
  "brand": {
    "@type": "Brand",
    "name": "[Marca]"
  },
  "offers": {
    "@type": "Offer",
    "priceCurrency": "EUR",
    "price": "29.90",
    "priceValidUntil": "2025-12-31",
    "availability": "https://schema.org/InStock",
    "url": "https://ferrolan.es/productos/gres-marmol-60x60"
  }
}
```

## Múltiples Schemas con @graph

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "..." },
    { "@type": "WebSite", "..." },
    { "@type": "BreadcrumbList", "..." }
  ]
}
```

## Validación y Testing

### Herramientas
- **Google Rich Results Test**: https://search.google.com/test/rich-results
- **Schema.org Validator**: https://validator.schema.org/
- **Search Console**: Informes de mejoras

### Errores Comunes
- Propiedades requeridas faltantes
- Valores inválidos (fechas deben ser ISO 8601)
- Schema no coincide con contenido visible de la página

## Implementación en Next.js

```jsx
// components/SchemaMarkup.jsx
export default function SchemaMarkup({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

## Checklist
- [ ] Valida en Rich Results Test
- [ ] Sin errores ni avisos
- [ ] Coincide con contenido de la página
- [ ] Todas las propiedades requeridas incluidas
- [ ] URLs completas y correctas
