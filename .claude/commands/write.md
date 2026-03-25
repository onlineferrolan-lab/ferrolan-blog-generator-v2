# Comando: Write

Crear artículos completos, optimizados para SEO, para el blog de Ferrolan.

## Uso
`/write [tema o brief de investigación]`

## Qué Hace
1. Crea artículos completos y bien estructurados (1.500-3.000 palabras)
2. Optimiza el contenido para keywords objetivo y mejores prácticas SEO
3. Mantiene la voz de marca de Ferrolan en todo el artículo
4. Integra enlaces internos y externos estratégicamente
5. Incluye todos los meta elementos para publicación

## Proceso

### Revisión Pre-Escritura
- **Brief de investigación**: Revisar brief de `/research` si existe
- **Voz de marca**: Consultar @context/brand-voice.md
- **Guía de estilo**: Seguir reglas de @context/style-guide.md
- **Guía SEO**: Aplicar requisitos de @context/seo-guidelines.md
- **Keywords objetivo**: Integrar keywords de @context/target-keywords.md

### Estructura del Contenido

#### 1. Titular (H1)
- Incluir keyword principal de forma natural
- Crear un título atractivo y claro
- Máximo 60 caracteres para SERP
- Prometer valor claro al lector

#### 2. Introducción (100-200 palabras)

**CRÍTICO: El Hook (1-2 primeras frases)**

NUNCA abrir con una definición genérica tipo "X es..." o "Cuando hablamos de..."

**Elegir UN tipo de hook:**
- **Pregunta provocadora**: "¿Sabías que el 60% de las reformas de baño acaban costando más de lo presupuestado?"
- **Escenario específico**: "María entró en su baño de 4 m² y supo que era hora de cambiarlo todo."
- **Dato sorprendente**: "Un suelo de gres porcelánico bien instalado puede durar más de 50 años."
- **Afirmación directa**: "Elegir el azulejo equivocado es el error más caro de una reforma."

**Después del hook:**
- **Conectar**: Reconocer algo que el lector ya siente/piensa
- **Prometer**: Decir exactamente qué aprenderá
- **Anticipar**: Breve resumen de lo que viene
- **Keyword**: Incluir keyword principal en primeras 100 palabras
- **Sin Ferrolan**: No mencionar Ferrolan en la introducción

#### 3. Cuerpo (1.200-2.500 palabras)
- **Flujo lógico**: Organizar secciones en orden progresivo
- **Secciones H2**: 4-7 secciones principales cubriendo el tema completo
- **Subsecciones H3**: Desglosar secciones complejas
- **Integración de keywords**: Densidad 1-2%, variaciones naturales
- **Profundidad**: Información práctica y accionable en cada punto
- **Datos**: Referenciar normas, medidas, especificaciones técnicas reales
- **Listas**: Usar viñetas para legibilidad (máx 5 ítems)
- **Formato**: Negritas para conceptos clave, párrafos cortos (2-4 frases)

**OBLIGATORIO: Mini-escenarios (2-3 por artículo)**

Incluir 2-3 mini-escenarios con:
- Una **persona concreta** (usar nombres: "Ana", "Carlos", "la familia Martínez")
- Una **situación específica** con detalles (medidas, materiales, ubicación)
- Un **resultado claro** que ilustre el punto

**Ejemplo**:
> "Cuando Ana y Pedro decidieron reformar su baño de 5 m² en su piso de Badalona, optaron por un plato de ducha extraplano de 120x80 cm con mampara fija. El resultado: ganaron espacio visual, eliminaron la bañera que nadie usaba, y el baño parece el doble de grande."

**Ubicación de mini-escenarios:**
- Uno en la introducción o primera sección (enganchar al lector)
- Uno en el medio (re-enganchar a los que escanean)
- Uno cerca del cierre (reforzar el mensaje principal)

#### 4. Cierre (1 párrafo)
- **Resumen**: 3-5 puntos clave
- **Mención natural a Ferrolan**: Como recurso, no como vendedor
- **Referencia a tiendas**: Barcelona, Rubí, Badalona, Santa Coloma
- **Invitación**: A ver materiales en persona o recibir asesoramiento
- **Tono**: Servicio y ayuda, nunca presión de venta

### Optimización SEO

#### Ubicación de Keywords
- Titular H1
- Primer párrafo (primeras 100 palabras)
- Al menos 2-3 encabezados H2
- Naturalmente por todo el cuerpo (1-2% densidad)
- Meta título y descripción
- Slug de URL

#### Enlaces Internos (2-4 enlaces)
- Referenciar @context/internal-links-map.md para páginas clave
- Enlazar a categorías de producto relevantes de ferrolan.es
- Enlazar a artículos del blog relacionados
- Usar anchor text descriptivo con keywords

#### Enlaces Externos (1-2 enlaces)
- Enlazar a fuentes autorizadas para normativas o datos
- Referenciar fabricantes o asociaciones del sector
- Construir credibilidad con fuentes de calidad

#### Legibilidad
- Frases de menos de 25 palabras de media
- Variar longitud de frases para ritmo
- Nivel de lectura accesible para público general
- Voz activa predominante
- Subtítulos cada 200-300 palabras

### Voz de Marca
- Mantener tono Ferrolan: experto, cercano, didáctico
- Seguir pilares de voz de @context/brand-voice.md
- Adaptar tono al tipo de contenido (guía, inspiración, noticias, técnico)
- PROHIBIDO lenguaje comercial o de venta

## Output

### 1. Artículo Completo
Artículo en markdown con:
- Titular H1
- Introducción con hook
- Secciones con estructura H2/H3
- Cierre con mención natural a Ferrolan
- Formato correcto (negritas, listas, enlaces)

### 2. Meta Elementos
```
---
Meta título: [máx 60 caracteres]
Meta descripción: [máx 155 caracteres]
Keyword principal: [keyword]
Keywords secundarias: [keyword1, keyword2, keyword3]
Slug URL: /blog/[slug-optimizado]
Enlaces internos: [lista de páginas enlazadas]
Conteo de palabras: [conteo real]
---
```

### 3. Checklist SEO
- [ ] Keyword principal en H1
- [ ] Keyword en primeras 100 palabras
- [ ] Keyword en 2+ encabezados H2
- [ ] Densidad de keyword 1-2%
- [ ] 2-4 enlaces internos
- [ ] 1-2 enlaces externos autorizados
- [ ] Meta título ≤ 60 caracteres
- [ ] Meta descripción ≤ 155 caracteres
- [ ] Artículo 1.500+ palabras
- [ ] Jerarquía H1/H2/H3 correcta

### 4. Checklist de Engagement
- [ ] Hook en primeras 1-2 frases (no definición genérica)
- [ ] 2-3 mini-escenarios con nombres y detalles
- [ ] Párrafos de máximo 4 frases
- [ ] Ritmo variado (frases cortas + largas)

## Ejecución Automática de Agentes

Después de completar el artículo, ejecutar los agentes de optimización:

### 1. SEO Optimizer Agent
- Revisión SEO y sugerencias de mejora

### 2. Meta Creator Agent
- Generar múltiples opciones de meta título/descripción

### 3. Internal Linker Agent
- Recomendaciones específicas de enlaces internos

### 4. Keyword Mapper Agent
- Análisis de distribución y densidad de keywords

## Estándares de Calidad

Todo artículo debe cumplir:
- Longitud mínima según tipo (1.500+ para SEO profundo)
- Jerarquía H1/H2/H3 correcta
- Keyword integrada naturalmente
- 2-4 enlaces internos a ferrolan.es
- 1-2 enlaces externos autorizados
- Meta título y descripción optimizados
- Introducción sin Ferrolan, cierre con Ferrolan
- Información práctica, útil y accionable
- Voz de marca mantenida
- Sin lenguaje comercial ni CTAs agresivos
