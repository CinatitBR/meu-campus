import { useState } from "react";
import { Map, Marker, Source, Layer } from "@vis.gl/react-maplibre";
import type { MapLayerMouseEvent } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import { X } from "lucide-react";

import { Popup } from "./components/Popup";
import POIS_A from "./data/pois-a.json";
import BUILDINGS from "./data/buildings.json";
// import SURFACE_DATA from "./data/surface-points.json";
// import SURFACE_PATHS from "./data/surface-paths.json";
import SURFACE_SAMPLES from "./data/surface-samples.json";

const inova = BUILDINGS.features[0];
// Bounding box format: [Southwest Lng, Southwest Lat], Northeast Lng, Northeast Lat]
const CAMPUS_BOUNDS: [number, number, number, number] = [
  -46.745496,
  -23.572641, // Southwest corner
  -46.710219,
  -23.549471, // Northeast corner
];

type PoiA = (typeof POIS_A)[0];
type SurfaceSample = (typeof SURFACE_SAMPLES)["features"][0];
const BASE_URL = import.meta.env.BASE_URL || "/"; // Use the base URL from Vite's environment variables, defaulting to "/"

// // Define your GeoJSON data
// const geojsonSource = {
//   type: "FeatureCollection",
//   features: POIS_A,
// };

function App() {
  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);
  const [buildingPois, setBuildingPois] = useState<PoiA[] | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<PoiA | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(18);
  const [selectedSurface, setSelectedSurface] = useState<SurfaceSample | null>(
    null,
  );

  console.log(selectedSurface);

  const INTERACTIVE_LAYERS = [
    "poi_r20",
    "poi_r7",
    "poi_r1",
    "poi_transit",
    "poi_own",
  ];

  // Define your GeoJSON data
  const geojsonSource = {
    type: "FeatureCollection",
    features: selectedPoi ? [selectedPoi] : [],
  };

  const handleMapClick = (event: MapLayerMouseEvent) => {
    // Verifica se há features sob o ponto onde o usuário clicou
    const features = event.features;
    if (!features || features.length === 0) return;

    const clickedFeature = features[0];

    // Busca no seu JSON local se você tem informações estendidas para esse prédio
    const buildingPois = POIS_A.filter((poi) => {
      return (
        poi.properties.parent_building_id === clickedFeature.properties?.id
      );
    });

    setSelectedBuilding(clickedFeature);
    if (buildingPois.length > 0) setBuildingPois(buildingPois);
  };

  return (
    <div className="app">
      <div className="right">
        <div className="map border border-[#ededed] rounded-lg h-[80svh] overflow-hidden">
          <Map
            initialViewState={{
              longitude: inova.geometry.coordinates[0],
              latitude: inova.geometry.coordinates[1],
              zoom: 16,
            }}
            style={{ width: "100%", height: "100%" }}
            mapStyle="https://tiles.openfreemap.org/styles/liberty"
            onZoom={(e) => setCurrentZoom(e.viewState.zoom)}
            maxBounds={CAMPUS_BOUNDS}
            // 1. Escuta cliques apenas nas camadas definidas
            interactiveLayerIds={INTERACTIVE_LAYERS}
            onClick={handleMapClick}
            // 2. Muda o ponteiro do mouse para "mãozinha" ao passar sobre um prédio
            onMouseEnter={(e) => {
              if (e.features?.length)
                e.target.getCanvas().style.cursor = "pointer";
            }}
            onMouseLeave={(e) => {
              e.target.getCanvas().style.cursor = "";
            }}
          >
            <Source id="my-poi-source" type="geojson" data={BUILDINGS}>
              <Layer
                id="poi_own"
                type="symbol"
                layout={{
                  "icon-image": "college",
                  "icon-size": 1,
                  "text-field": ["get", "name"],
                  "text-anchor": "top",
                  "text-offset": [0, 0.5],
                }}
                minzoom={14}
                paint={{
                  "text-color": "#333333",
                }}
              />
            </Source>
            <Source id="my-data-source" type="geojson" data={geojsonSource}>
              <Layer
                id="point-layer"
                type="circle"
                paint={{ "circle-radius": 10, "circle-color": "#ff0055" }}
              />
            </Source>

            {/* render selected surface path */}
            <Source
              id="surface-path-source"
              type="geojson"
              data={
                selectedSurface
                  ? selectedSurface
                  : { type: "FeatureCollection", features: [] }
              }
            >
              <Layer
                id="surface-path-layer"
                type="line"
                paint={{ "line-color": "#b1abff", "line-width": 4 }}
              />
            </Source>
            {currentZoom >= 14 &&
              SURFACE_SAMPLES.features.map((feature) => {
                const [longitude, latitude] = feature.geometry.coordinates; // TODO: calculate the center of the path (using library like turf)
                const thumbnail_url = `${BASE_URL}images/surface-points/${feature.properties.id}/photo.jpg`;
                return (
                  <Marker
                    key={feature.properties.id}
                    longitude={longitude}
                    latitude={latitude}
                    anchor="bottom"
                  >
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden shadow-md bg-white cursor-pointer p-[3px] hover:ring-2 hover:ring-[#917cff] transition-all"
                      onClick={() => setSelectedSurface(feature)}
                    >
                      <img
                        src={thumbnail_url}
                        alt="Piso"
                        className="rounded-full w-full h-full object-cover"
                      />
                    </div>
                  </Marker>
                );
              })}
          </Map>
        </div>

        {!selectedBuilding && (
          <div
            style={{
              fontStyle: "italic",
              fontSize: "1.3rem",
              height: "100%",
              width: "100%",
              marginTop: "1rem",
              display: "grid",
              placeItems: "center",
              minHeight: "400px",
            }}
          >
            Nenhum prédio selecionado
          </div>
        )}

        {selectedBuilding && (
          <section className="building-info">
            <section className="pois">
              <header className="w-full text-[#160d44] bg-[#917cff] p-4">
                <span className="icon">🏢</span>
                <h3>{selectedBuilding.properties.name}</h3>
              </header>

              <div className="poi-list">
                {buildingPois &&
                  buildingPois.map((poi) => {
                    const imgPath = `${BASE_URL}images/${poi.properties.id}/front-photo.jpg`;
                    return (
                      <div
                        className={`card cursor-pointer rounded-xl border border-[#ededed] ${selectedPoi && selectedPoi.properties.id == poi.properties.id && "selected"}`}
                        key={poi.properties.id}
                        onClick={() => {
                          if (
                            selectedPoi &&
                            poi.properties.id === selectedPoi.properties.id
                          )
                            setSelectedPoi(null);
                          if (
                            !selectedPoi ||
                            poi.properties.id !== selectedPoi.properties.id
                          )
                            setSelectedPoi(poi);
                        }}
                      >
                        <img
                          src={imgPath}
                          alt="Esse é o alt dessa imagem"
                          style={{
                            width: "100%",
                            height: 150,
                            objectFit: "cover",
                          }}
                        />
                        <div className="body">
                          <h2 className="nome">{poi.properties.name}</h2>
                          <div className="andares">
                            {poi.properties.floors.map((floor) => (
                              <span
                                key={floor}
                                className="border border-[#eccdb1]"
                              >
                                {floor}º andar
                              </span>
                            ))}
                          </div>
                          <span>
                            Área de {poi.properties.dimensions.length_meters} X{" "}
                            {poi.properties.dimensions.width_meters} m
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>

            {!selectedPoi && (
              <div
                style={{
                  fontStyle: "italic",
                  fontSize: "1.3rem",
                  height: "100%",
                  width: "100%",
                  marginTop: "1rem",
                  display: "grid",
                  placeItems: "center",
                  minHeight: "400px",
                }}
              >
                Nenhum item selecionado
              </div>
            )}

            <div className="poi-info m-8">
              {selectedPoi && (
                <div
                  className="cursor-pointer w-fit border-2 border-[#808080] text-[#5e5e5e] rounded-sm hover:bg-[#f0f0f0] rounded-8"
                  onClick={() => setSelectedPoi(null)}
                >
                  <X size={36} />
                </div>
              )}

              {selectedPoi && (
                <div className="poi-a-descricao">
                  <h2>Elevador 1</h2>
                  <div className="img-lista">
                    {["front-photo.jpg", "inside-photo.jpg"].map((filename) => {
                      const imgPath = `${BASE_URL}images/${selectedPoi.properties.id}/${filename}`;
                      return (
                        <img
                          key={filename}
                          className="border-4 border-[#ffb179]"
                          src={imgPath}
                          alt="Minha imagem href"
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedPoi && (
                <div className="instrucao-lista">
                  <h2>🧭 Rota visual</h2>
                  {selectedPoi.properties.visual_route.map((direction) => {
                    const imgPath = `${BASE_URL}images/${selectedPoi.properties.id}/rota-visual/${direction.step_number}.png`;
                    return (
                      <div className="instrucao" key={direction.step_number}>
                        <header>
                          <h3>{direction.title}</h3>
                          <p>{direction.description}</p>
                        </header>
                        <img
                          className="border-4 border-[#ffb179]"
                          src={imgPath}
                          alt="Esse é a imagem da instrução"
                          style={{
                            width: "100%",
                            maxWidth: 400,
                            height: 200,
                            objectFit: "cover",
                            borderRadius: 8,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <Popup
        isOpen={!!selectedSurface}
        description={selectedSurface?.properties?.description || ""}
        img={`${BASE_URL}images/surface-points/${selectedSurface?.properties?.id}/photo.jpg`}
        date={selectedSurface?.properties?.updated_at || ""}
        onClose={() => setSelectedSurface(null)}
      />
    </div>
  );
}

export default App;
