# React Vite + React MapLibre JS

Esse projeto utiliza os frameworks:

- [React Vite](https://visgl.github.io/react-maplibre/): Responsável por rodar um servidor com React localmente e gerar uma build final para deploy.
- [React MapLibre](https://visgl.github.io/react-maplibre/): É um porte do projeto MapLibre para React; realiza a renderização do mapa e suas características na tela.

## Dados locais

### Dados geográficos

Os nossos dados locais são elementos geográficos. Eles são armazenados em arquivos JSON, utilizando o formato [GeoJSON](https://geojson.org/), e estão localizados na pasta src/data. A seguir, um trecho do arquivo src/data/ways.json, com a organização definida pelo GeoJSON.

```json
{
  "type": "Feature",
  "properties": {
    "@id": "way/34239670",
    "cycleway:both": "shared_lane",
    "cycleway:left:lane": "pictogram",
    "highway": "residential",
    "maxspeed": "40",
    "name": "Rua do Lago",
    "oneway": "no",
    "parking:left": "no",
    "parking:right": "street_side",
    "parking:right:orientation": "parallel",
    "source": "local knowledge",
    "source:maxspeed": "sign",
    "surface": "asphalt"
  },
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-46.7304505, -23.5606474],
      [-46.7306531, -23.5605547],
      [-46.7310886, -23.5603271]
    ]
  },
  "id": "way/34239670"
}
```

### Assets

As imagens estão armazenadas na pasta /public/images/.

- tiles: armazena os tiles que compõem a textura dos pisos.
- surface-points: fotos tiradas de pisos, que indicam pontos de interesse como buracos.
- leisure: imagens dos pontos de interesse de lazer.
- elevator-inova-1: imagens associadas ao elevador 1 do inova.

## App.src

Concentra e única e principal tela do aplicativo. Renderiza um mapa utilizando o MapLibre e armazena todos os estados da interface.

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
