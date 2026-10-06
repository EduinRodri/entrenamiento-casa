# Entreno en Casa

App web (PWA) para registrar el entrenamiento en casa con barra y mancuernas. Funciona sin internet y guarda todo en el teléfono (localStorage).

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Estructura, íconos SVG y temporizador |
| `styles.css` | Colores, tipografía, modo oscuro y vista de impresión |
| `data.js` | El plan: sesiones, ejercicios, calentamiento, recordatorios y `ANIMACIONES` |
| `app.js` | Lógica: pantallas, registro, temporizador, progresión, medidas y respaldo |
| `sw.js` | Service worker (modo sin internet) |
| `manifest.webmanifest` | Datos para instalarla en la pantalla de inicio |
| `tools/make-icons.mjs` | Genera los íconos: `node tools/make-icons.mjs` |

## Probar en el computador

```bash
python -m http.server 5173
```

Abrir `http://localhost:5173` y usar el modo celular de las herramientas de desarrollo.

## Actualizar la app publicada

1. Hacer el cambio.
2. En `sw.js`, subir la versión: `entreno-v1` → `entreno-v2`. Si no se cambia, los teléfonos siguen mostrando la versión vieja.
3. `git add -A && git commit -m "..." && git push`
4. GitHub Pages publica en uno o dos minutos. En el celular, cerrar la app y abrirla dos veces.

## Agregar animaciones

En `data.js`, dentro de `ANIMACIONES`, poner el id del ejercicio y la ruta del archivo:

```js
const ANIMACIONES = { 'press-piso': 'animaciones/press-piso.webp' };
```

Guardar el archivo en `animaciones/` y añadirlo a `SHELL` en `sw.js` para que funcione sin internet.

## Datos

Viven solo en el navegador del teléfono. Si se borran los datos del navegador, se pierden: usar **Historial → Exportar datos** de vez en cuando.
