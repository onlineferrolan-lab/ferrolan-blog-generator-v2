# Comando: Research

Investigación SEO completa antes de escribir un artículo.

## Uso
`/research [tema]`

## Qué Hace
1. Investiga keywords para el tema dentro del sector de Ferrolan
2. Analiza los artículos top del SERP para la keyword principal
3. Identifica gaps de contenido y oportunidades
4. Desarrolla un ángulo único desde la perspectiva de Ferrolan
5. Crea un brief de investigación completo

## Proceso

### Investigación de Keywords
- **Keyword principal**: Identificar la keyword objetivo
- **Volumen y dificultad**: Investigar búsquedas mensuales estimadas y competencia
- **Variaciones**: Encontrar variaciones semánticas y long-tail
- **Preguntas relacionadas**: Descubrir qué pregunta la gente (PAA, foros, Reddit)
- **Intención de búsqueda**: Determinar si es informativa, navegacional, comercial o transaccional
- **Cluster temático**: Identificar cómo encaja en los clusters de @context/target-keywords.md

### Análisis Competitivo
- **Top 10 SERP**: Analizar los 10 primeros resultados para la keyword
- **Longitud del contenido**: Notar el conteo de palabras de los artículos top
- **Temas comunes**: ¿Qué secciones cubren todos los artículos top?
- **Gaps de contenido**: ¿Qué falta en la cobertura de los competidores?
- **Ángulos únicos**: ¿Qué perspectivas están poco exploradas?
- **Featured snippets**: Identificar oportunidad de snippet destacado

### Integración de Contexto
- **Ventaja Ferrolan**: ¿Cómo puede la experiencia de Ferrolan enriquecer este contenido?
- **Alineación de marca**: Revisar @context/brand-voice.md
- **Contenido existente**: Revisar @context/internal-links-map.md para artículos relacionados
- **Keywords objetivo**: Cruzar con @context/target-keywords.md
- **Guía SEO**: Asegurar que la investigación sigue @context/seo-guidelines.md

### Enfoque Sector Construcción/Reforma
- **Ángulo práctico**: ¿Cómo aplica este tema a reformas y proyectos reales?
- **Requisitos técnicos**: Consideraciones técnicas del sector
- **Tendencias**: Tendencias actuales en materiales, diseño, reformas
- **Casos de uso**: Escenarios reales donde este tema importa
- **Pain points**: Problemas específicos que tienen los clientes

### Planificación del Contenido
- **Estructura recomendada**: Outline con H2 y H3 basado en la investigación
- **Profundidad**: Determinar longitud objetivo (700-1.100 para blog, 1.500-3.000 para SEO profundo)
- **Evidencia**: Identificar datos, estadísticas o normas a incluir
- **Fuentes**: Encontrar fuentes autorizadas (CTE, ASCER, fabricantes)
- **Elementos visuales**: Sugerir dónde serían útiles imágenes
- **Enlaces internos**: Mapear 2-4 páginas de ferrolan.es para enlazar (de @context/internal-links-map.md)
- **Enlaces externos**: Identificar 1-2 fuentes autorizadas externas

### Desarrollo del Hook
- **Ángulo de apertura**: Forma convincente de abrir el artículo
- **Propuesta de valor**: Beneficio claro que obtendrá el lector
- **Elementos diferenciadores**: Perspectivas inesperadas a explorar

## Output

### 1. Base SEO
- **Keyword principal**: [keyword] (volumen, dificultad)
- **Keywords secundarias**: 3-5 keywords relacionadas
- **Longitud objetivo**: Palabras mínimas para competir
- **Oportunidad de snippet**: Sí/No, formato (párrafo, lista, tabla)

### 2. Panorama Competitivo
- **Top 3 artículos**: URLs y conclusiones clave
- **Secciones obligatorias**: Temas que cubrir según el SERP
- **Gaps de contenido**: Oportunidades de valor único
- **Estrategia de diferenciación**: Cómo Ferrolan puede destacar

### 3. Outline Recomendado
```
H1: [Titular optimizado con keyword principal]

Introducción
- Hook
- Contextualización del problema
- Promesa de valor

H2: [Sección principal 1]
H3: [Subsección]

H2: [Sección principal 2]
...

Cierre con mención natural a Ferrolan
```

### 4. Estrategia de Enlaces Internos
- **Categoría principal**: Página de ferrolan.es a enlazar
- **Artículos relacionados**: 1-2 posts del blog existentes
- **Páginas de producto**: Secciones de ferrolan.es relevantes

### 5. Vista Previa de Meta
- **Meta título**: Borrador (máx 60 caracteres)
- **Meta descripción**: Borrador (máx 155 caracteres)
- **Slug URL**: Estructura sugerida

## Siguientes Pasos
El brief sirve como base para:
1. Ejecutar `/write $ARGUMENTS` para crear el artículo optimizado
2. Material de referencia para mantener el foco SEO durante la escritura
3. Checklist para asegurar que se cubren todos los gaps competitivos
