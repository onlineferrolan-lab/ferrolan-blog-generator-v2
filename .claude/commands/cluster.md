# Comando: Cluster

Construir una estrategia completa de cluster temático con pillar page, artículos de soporte, mapa de enlaces y secuencia de creación.

## Uso
`/cluster [tema]`

**Ejemplos:**
- `/cluster "reformas de baño"`
- `/cluster "suelos y pavimentos"`
- `/cluster "jardín mediterráneo"`

## Qué Hace
1. Investiga el panorama completo de keywords para el tema
2. Define la pillar page (artículo pilar)
3. Define 6-10 artículos de soporte
4. Crea mapa de enlaces internos entre piezas del cluster
5. Genera roadmap de ejecución con comandos copy-paste

## Proceso

### Paso 1: Investigación de Keywords

1. **Búsqueda web** de keywords relacionadas:
   - Buscar "[tema] guía" en resultados de Ahrefs, Semrush, Moz
   - Buscar "[tema] keywords relacionadas" y subtemas
   - Buscar preguntas frecuentes sobre el tema

2. **Agrupar keywords en niveles**:
   - **Nivel pilar**: Keywords amplias, alto volumen (1.000+ búsquedas/mes), competitivas
   - **Nivel soporte**: Subtemas específicos, volumen medio (100-1.000/mes)
   - **Long-tail**: Consultas muy específicas, bajo volumen (<100/mes)

### Paso 2: Análisis SERP

1. **Buscar los top 3-5 resultados** para la keyword pilar
2. Para cada uno, documentar:
   - Estructura H2/H3
   - Longitud estimada
   - Temas cubiertos
   - Gaps y secciones débiles
   - Ángulos únicos o datos
3. **Identificar oportunidades de diferenciación**

### Paso 3: Definir Pillar Page

| Elemento | Detalles |
|----------|---------|
| **Título** | [H1 optimizado con keyword pilar] |
| **Keyword principal** | [Término de mayor volumen] |
| **Keywords secundarias** | [3-5 términos relacionados] |
| **Intención de búsqueda** | [Informativa / Comercial] |
| **Longitud objetivo** | 2.500-4.000 palabras |
| **Ángulo diferenciador** | [Qué hace única nuestra pieza] |

**Outline de la Pillar Page:**
- Cada H2 debe mapear a un artículo de soporte
- Incluir secciones que cubren los competidores (estructura validada por Google)
- Añadir secciones que cubren los gaps identificados

### Paso 4: Definir Artículos de Soporte (6-10)

Para cada artículo:

| Campo | Valor |
|-------|-------|
| **#** | [Número secuencial] |
| **Título** | [Título de trabajo] |
| **Keyword principal** | [DEBE ser distinta de los demás artículos] |
| **Intención de búsqueda** | [Informativa / Cómo-hacer / Comercial / Comparativa] |
| **Relación con pilar** | [Qué sección H2 del pilar expande] |
| **Longitud objetivo** | [1.000-2.500 palabras] |
| **Prioridad** | [Alta / Media / Baja] |

**Framework de priorización:**
- Volumen (30%): Mayor volumen = mayor puntuación
- Dificultad inversa (20%): Menor dificultad = mayor puntuación
- Intención comercial (20%): Más cerca de conversión = mayor puntuación
- Dependencia del pilar (15%): Más esencial para completar el pilar = mayor puntuación
- Valor de cross-link (15%): Más conexiones con otras piezas = mayor puntuación

### Paso 5: Mapa de Enlaces Internos

1. **Pilar → Soporte**: El pilar DEBE enlazar a cada artículo de soporte
2. **Soporte → Pilar**: Cada artículo de soporte DEBE enlazar al pilar
3. **Cross-links**: 2-3 enlaces cruzados por artículo de soporte
4. **Integración con contenido existente**: Revisar @context/internal-links-map.md

**Diagrama visual:**
```
                [Pillar Page]
               /    |    |    \
              /     |    |     \
   [Art 1] [Art 2] [Art 3] [Art 4]
       \________/      \_________/
         cross-link      cross-link
```

**Matriz de enlaces:**
| De \ A | Pilar | Art 1 | Art 2 | Art 3 | ... |
|--------|-------|-------|-------|-------|-----|
| Pilar  | -     | →     | →     | →     | ... |
| Art 1  | →     | -     | →     |       | ... |

### Paso 6: Roadmap de Ejecución

**Fase 1: Fundación (Pilar + Alta Prioridad)**
Pilar page + 2-3 artículos de mayor prioridad.

**Fase 2: Construir Autoridad (Media Prioridad)**
Siguientes 2-3 artículos.

**Fase 3: Cobertura Completa (Restantes)**
Artículos finales para cubrir todos los gaps.

**Comandos copy-paste:**
```
/research "[keyword principal]"
/write "[título del artículo]"
```

## Output

### Plantilla de Output

```markdown
# Estrategia de Cluster: [Tema]

**Fecha**: [YYYY-MM-DD]
**Keyword pilar**: [keyword]
**Tamaño del cluster**: [X] artículos (1 pilar + [X-1] soporte)

## Resumen Ejecutivo
[2-3 frases: qué cubre, oportunidad, enfoque estratégico]

## Panorama de Keywords
[Tablas con keywords pilar, soporte y long-tail]

## Estrategia de Pillar Page
[Outline completo con H2/H3]

## Artículos de Soporte
[Ficha detallada de cada artículo]

## Mapa de Enlaces Internos
[Diagrama + matriz + integración con contenido existente]

## Roadmap de Creación
[Fases con comandos copy-paste]

## Check de Canibalización
[Verificar que ningún artículo compite con otro por la misma keyword]

## Métricas de Éxito
[Objetivos y plazos]
```

## Contexto Requerido

Antes de construir el cluster, revisar:
- @context/seo-guidelines.md — Requisitos SEO
- @context/internal-links-map.md — Páginas existentes para enlazar
- @context/target-keywords.md — Keywords actuales (evitar solapamiento)
- @context/competitor-analysis.md — Qué hacen los competidores en este tema
