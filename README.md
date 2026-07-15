# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Data schema

Currently, all the data is stored in JSON files. Spatial data uses the GeoJSON format.

List of spatial elements:

- Buildings: Polygon geometry. Represent a building.
- Poi (rest area, elevator): Point geometry. Represent different classes of POIs (Point of Interest), like rest area or elevator.
- Surface sample: Point. Describes a walkable surface. Image of the surface + properties.
- Surface obstructions: Point geometry. Represents an obstruction (like a hole) in a surface. Might be associated to a surface path element.

---

surface snapshot: Point geometry. Describes a walkable surface. Image of the surface + properties. Surface snapshot schema:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-46.728325, -23.561705]
  },
  "properties": {
    "id": "surface-point-104",
    "updated_at": "2026-07-08T17:00:00.000Z",
    "description": "Passagem de concreto estreita, por cima da grama, feita de concreto remendado levemente irregular."
  }
}
```

Funcionalidade: descrever o aspecto de uma região caminhável no campus.

Funcionamento: dar zoom em uma superfície caminhável do mapa. Várias imagens aparecem conectadas. Elas descrevem a aparência geral daquela região:

Implementação:

- cada imagem é um surface_snapshot, armazenado individualmente em surface-snapshots.json.
- no arquivo surface_samples.json serão armazenados os surface samples, que são conjuntos de surface_snapshots, que são agrupados a partir de seus ids.
  Schema de um surface sample:

```json
{
  [
    "id": "surface-sample-101",
    "sample": ["surface-point-104", "surface-point-105", "surface-point-106"]
  ]
}
```
