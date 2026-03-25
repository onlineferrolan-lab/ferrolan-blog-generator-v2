# Comando: Analyze Existing

Revisar y analizar artículos existentes del blog de Ferrolan para identificar oportunidades SEO y áreas de mejora.

## Uso
`/analyze-existing [URL o contenido del artículo]`

## Qué Hace
1. Analiza el contenido del artículo existente
2. Evalúa la optimización SEO actual
3. Identifica información obsoleta o incompleta
4. Sugiere oportunidades de expansión
5. Proporciona recomendaciones accionables

## Proceso

### Análisis de Contenido
- **Input**: Aceptar URL de ferrolan.es/blog o contenido copiado
- **Fecha**: Notar cuándo se publicó
- **Relevancia**: Identificar información obsoleta
- **Completitud**: Evaluar si la cobertura del tema es completa

### Auditoría SEO
- **Keyword objetivo**: Identificar keyword principal y variaciones
- **Densidad**: Analizar densidad y distribución de keywords
- **Ubicación**: Verificar H1, H2, primeras 100 palabras, meta
- **Estructura de encabezados**: Evaluar jerarquía H1-H3
- **Longitud**: Comparar con competidores top del SERP
- **Meta elementos**: Revisar título (≤60 chars) y descripción (≤155 chars)
- **Enlaces internos**: Contar y evaluar calidad (objetivo: 2-4)
- **Enlaces externos**: Verificar fuentes autorizadas
- **Legibilidad**: Evaluar longitud de frases, párrafos, voz activa

### Contexto Competitivo
- **Competidores top**: Identificar 3-5 artículos que posicionan para las mismas keywords
- **Gaps**: Qué cubren los competidores que este artículo no
- **Ventaja competitiva**: Qué ángulo único podría diferenciarnos

### Experiencia de Usuario
- **Hook de introducción**: ¿Es la apertura atractiva?
- **Estructura**: ¿Fluye el artículo de forma lógica?
- **Accionabilidad**: ¿Hay pasos prácticos y conclusiones claras?
- **CTA**: ¿Hay cierre con mención a Ferrolan (servicio, no venta)?

## Output

### 1. Puntuación de Salud del Contenido (0-100)

| Dimensión | Puntuación | Notas |
|-----------|-----------|-------|
| Optimización SEO | /100 | Keywords, estructura, meta |
| Calidad del contenido | /100 | Profundidad, precisión, valor |
| Competitividad | /100 | vs. top SERP |
| Legibilidad | /100 | Formato, escaneabilidad |
| Alineación de marca | /100 | Voz, tono, reglas editoriales |
| **TOTAL** | **/100** | |

### 2. Quick Wins (Mejoras Inmediatas)
Top 3-5 mejoras que se pueden hacer rápido:
- Actualizar estadísticas o datos obsoletos
- Añadir keywords faltantes en encabezados
- Optimizar meta descripción
- Añadir enlaces internos a páginas específicas

### 3. Mejoras Estratégicas
Mejoras de mayor impacto a medio plazo:
- Expandir contenido (con recomendación de longitud objetivo)
- Nuevas secciones a añadir
- Reestructuración si es necesaria

### 4. Recomendación de Rewrite

| Nivel | Descripción |
|-------|-------------|
| **Bajo** | Ajustes menores de SEO — `/optimize` |
| **Medio** | Actualización moderada — `/rewrite` parcial |
| **Alto** | Rewrite significativo — `/rewrite` completo |
| **Crítico** | Artículo nuevo desde cero — `/write` |

### 5. Brief de Investigación
Si se recomienda rewrite, proporcionar:
- Keywords objetivo actualizadas
- Artículos competidores a revisar
- Datos nuevos a incorporar
- Oportunidades de enlaces internos

## Siguientes Pasos

Según el análisis:
1. `/rewrite [tema]` si necesita actualización significativa
2. `/optimize [artículo]` si solo necesita pulido SEO
3. `/write [tema]` si es mejor crear un artículo nuevo
