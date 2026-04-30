# JSON Cleaner Component - Análisis de UI/UX

**Fecha:** 30 de abril de 2026  
**Componentes Analizados:** json-cleaner, json-sorter, json-formatter + tool-page.css

---

## 1️⃣ LAYOUT DE OPCIONES: ACCESIBILIDAD Y FUNCIONALIDAD

### ✅ Fortalezas

- **Semántica HTML correcta**: Usa `<fieldset>` con `<legend>` para agrupar opciones
- **Labels asociados**: Cada checkbox está dentro de una `<label>` (patrón label-input anidado)
- **Responsive layout**: Usa `flex-wrap` para adaptarse a pantallas pequeñas
- **Espaciado consistente**: Gap variables (space-1, space-3) siguen el design system

### ⚠️ Problemas Identificados

| Problema | Severidad | Descripción |
|----------|-----------|-------------|
| **Sin aria-label en checkboxes** | Media | Los checkboxes no tienen `aria-label` — los lectores de pantalla solo dicen "checkbox" sin contexto |
| **Font monoespaciada pequeña** | Baja | Los símbolos (`null`, `""`, `[ ]`, `{ }`) están en `font-family: var(--font-mono)` y `text-xs` — difícil de leer en mobile |
| **Sin `:focus-visible` en checkboxes** | Media | Los checkboxes no muestran ring de focus explícitamente |
| **Falta validación de estado** | Media | No hay indicador visual si NO se selecciona ninguna opción (el botón se disabilita pero las opciones no advierten) |

### 🎯 Recomendaciones

1. **Agregar aria-labels a checkboxes**
```html
<input
  type="checkbox"
  [checked]="opts().removeNull"
  (change)="toggleOpt('removeNull')"
  aria-label="Remove null values"
/>
```

2. **Mejorar legibilidad de símbolos**
```css
.cleaner-option {
  font-size: var(--text-sm);  /* Aumentar de text-xs */
}
```

3. **Agregar focus styling**
```css
.cleaner-option input[type='checkbox']:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-ring-offset);
}
```

---

## 2️⃣ ACCESIBILIDAD DE CHECKBOXES

### ✅ Lo que funciona bien

- Label clickeable (aumenta hit area)
- `accent-color` configurable
- Tamaño: 14px × 14px (adecuado)
- `user-select: none` en el label evita selección de texto

### ❌ Deficiencias

| Aspecto | Hallazgo |
|--------|----------|
| **Aria-labels en input** | ❌ No tiene `aria-label` — confuso para screen readers |
| **Aria-describedby** | ❌ No hay asociación de descripciones adicionales |
| **Contraste de color** | ⚠️ Depends on CSS custom properties; necesita validación WCAG AA |
| **Cursor feedback** | ✅ `cursor: pointer` está presente |
| **Foco visual** | ❌ Falta outline en :focus-visible |

### 📋 Checklist de Accesibilidad

- [ ] Cada checkbox debe tener `aria-label` descriptivo
- [ ] Validar contraste de label text (color-text-muted) vs background
- [ ] Agregar `:focus-visible` con `outline: var(--focus-ring)`
- [ ] Probar con NVDA/JAWS en Windows
- [ ] Probar navegación Tab/Shift+Tab

---

## 3️⃣ CONVENCIONES CSS DEL PROYECTO

### Análisis Comparativo

#### json-cleaner.component.css
```css
.cleaner-actions { ... }          /* ✅ Sigue patrón */
.cleaner-options { ... }          /* ✅ BEM naming */
.cleaner-options__legend { ... }  /* ✅ BEM element */
.cleaner-option { ... }           /* ✅ BEM element */
```

#### tool-page.css (referencia)
```css
.tool-page__action-btn { ... }    /* Patrón: .tool-page__action-* */
.tool-page__action-status { ... }
.tool-page__intro--with-action { /* Modificador BEM */
```

### 🔍 Hallazgos

| Aspecto | Estatus | Nota |
|--------|--------|------|
| **BEM naming** | ✅ Correcto | Usa `__` para elementos, `--` para modificadores |
| **CSS custom properties** | ✅ Correcto | Usa `var(--color-*)`, `var(--space-*)` |
| **Flexbox** | ✅ Correcto | Responsive con wrap |
| **Especificidad** | ✅ Correcta | No hay !important, usa selectores simples |
| **Archivo de estilos** | ⚠️ Mejorable | Ver punto 5 |

### ⚠️ Inconsistencia de Nomenclatura

**Esperado en tool-page.css:**
```css
.tool-page__action-btn { ... }
.tool-page__action-status { ... }
```

**Usado en json-cleaner.component.css:**
```css
.cleaner-actions { ... }         /* No sigue el patrón .tool-page__* */
.cleaner-options { ... }
.cleaner-option { ... }
```

**Comparación con json-sorter:**
```typescript
// json-sorter.component.ts
<div slot="actions" class="tool-intro-actions">  // ← Usa esta clase
```

**Comparación con tool-page.css:**
```css
.tool-page__intro-actions { ... }  // ← Clase en tool-page.css
```

### 🎯 Recomendación: Normalizar Nomenclatura

**Opción A (Recomendada - Mantener específico):**
Usar clases específicas del componente pero incluir `:host` binding

**Opción B (Alinearse a tool-page.css):**
Usar `.tool-page__action-*` desde tool-page.css directamente

---

## 4️⃣ FLUJO DE USUARIO: CLARIDAD E INTUITIVIDAD

### Flujo Esperado

```
1. Leer intro (título + descripción)
   ↓
2. Ver opciones disponibles (fieldset con checkboxes)
   ↓
3. Configurar qué limpiar (checkboxes toggle)
   ↓
4. Pegar/escribir JSON en workbench (izq)
   ↓
5. Click "Clean JSON"
   ↓
6. Ver resultado en izq + mensaje de status
```

### ✅ Puntos Fuertes

- **Intro clara**: Explica qué es el limpiador y cómo usarlo
- **Estado visual**: El botón se disabilita si JSON no es válido
- **Feedback**: `lastStatus` muestra cuántos valores se removieron
- **Botón prominente**: Usa color accent, emoji visual (✧)

### ⚠️ Puntos de Fricción

| Problema | Impacto | Solución |
|----------|--------|----------|
| **No es evidente que hay opciones** | Medio | Usuarios pueden no notar el fieldset |
| **Opciones colapsables?** | Bajo | Intro es collapsable pero opciones no |
| **Sin reset de opciones** | Bajo | No hay botón "Reset to defaults" |
| **Status desaparece rápido** | Bajo | El mensaje no tiene timeout visible |

### 🎯 Mejoras UX Recomendadas

1. **Hacer opciones más visibles**
   - Agregar un label visual antes del fieldset: "Cleaning options"
   - O usar `aria-label="Cleaning options"` en el fieldset

2. **Persistencia de opciones**
   - Guardar estado en localStorage (similar a SettingsStore)
   - Opción: localStorage key `json-we-format:cleaner-opts`

3. **Feedback mejorado**
   - Mostrar mensaje de status por 3-4 segundos (opcional fade-out)
   - O mantenerlo visible pero menos prominente

---

## 5️⃣ INCONSISTENCIAS CON OTROS COMPONENTES

### Tabla Comparativa: Estructura

| Componente | Usa fieldset | Usa opciones | Clase actions | Status message |
|-----------|-------------|-------------|---------------|----|
| **json-cleaner** | ✅ Sí | ✅ Sí (4) | `cleaner-actions` | ✅ Sí |
| **json-sorter** | ❌ No | ❌ No | `tool-intro-actions` | ✅ Sí |
| **json-formatter** | ❌ No | ❌ No | (sin acciones) | ❌ No |

### Hallazgos

1. **Clase de contenedor inconsistente**
   - json-cleaner: `class="cleaner-actions"`
   - json-sorter: `class="tool-intro-actions"`
   - → Debería alinearse a una sola convención

2. **Fieldset solo en json-cleaner**
   - ✅ Buena decisión semántica
   - ❌ Pero visualmente no distinguido de otros

3. **Status message presente en ambos**
   - ✅ Patrón consistente

### 🎯 Recomendación: Crear Componente Reutilizable

**Opción: `ToolOptionsFieldset` component**

```typescript
// tool-options-fieldset.component.ts
@Component({
  selector: 'app-tool-options-fieldset',
  template: `
    <fieldset class="tool-options-fieldset">
      <legend class="tool-options-fieldset__legend">{{ label() }}</legend>
      <ng-content />
    </fieldset>
  `,
  styles: `
    .tool-options-fieldset {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-3);
      margin: 0;
      padding: var(--space-1) var(--space-3);
    }
    // ... estilos
  `
})
export class ToolOptionsFieldsetComponent {
  readonly label = input<string>('Options');
}
```

**Uso:**
```html
<app-tool-options-fieldset label="Remove">
  <label class="tool-option">
    <input type="checkbox" ... aria-label="Remove null values" />
    <span>null</span>
  </label>
</app-tool-options-fieldset>
```

---

## 📊 Resumen: Score de Conformidad

| Categoría | Score | Estado |
|-----------|-------|--------|
| **Accesibilidad (WCAG AA)** | 6/10 | ⚠️ Necesita mejoras |
| **Convenciones CSS** | 8/10 | ✅ Bueno (pequeñas inconsistencias) |
| **UX/Flujo de usuario** | 7/10 | ✅ Bueno (intuitivo pero mejorable) |
| **Consistencia con otros tools** | 6/10 | ⚠️ Inconsistencias de clase |
| **Responsiveness** | 9/10 | ✅ Muy bueno |

**Puntuación General: 7.2/10**

---

## 🚀 Recomendaciones Prioritarias (por severidad)

### 🔴 CRÍTICA (Debe arreglarse)

- [ ] Agregar `aria-label` a cada checkbox
- [ ] Agregar `:focus-visible` con outline en checkboxes
- [ ] Validar contraste de color (color-text-muted vs background)

### 🟡 ALTA (Debería hacerse)

- [ ] Normalizar clase de contenedor: `cleaner-actions` → `tool-page__actions` (o similar)
- [ ] Aumentar font-size de opciones de `text-xs` a `text-sm`
- [ ] Considerar componente reutilizable para fieldsets de opciones

### 🟢 MEDIA (Nice to have)

- [ ] Persistencia de opciones en localStorage
- [ ] Timeout automático para status message
- [ ] Reset button para opciones por defecto

---

## 📝 Notas Técnicas

### Variables CSS Usadas

```css
--space-1, --space-3      /* Gap y padding */
--color-border            /* Border */
--color-accent            /* Button background */
--color-text-muted        /* Text secondary */
--font-mono               /* Monospace para símbolos */
--text-xs, --text-sm      /* Font size */
--radius-md               /* Border radius */
--focus-ring              /* Focus outline */
--focus-ring-offset       /* Focus outline offset */
```

### Archivos que necesitan cambios

1. **json-cleaner.component.ts** - Agregar aria-labels
2. **json-cleaner.component.css** - Mejorar selectores focus, aumentar font-size
3. **tool-page.css** - Considerar agregar clase base para options fieldsets

