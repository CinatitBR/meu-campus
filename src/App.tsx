import { useState, useRef, useEffect } from "react";
import { Map, Marker, Source, Layer } from "@vis.gl/react-maplibre";
import type {
  MapLayerMouseEvent,
  MapGeoJSONFeature,
  MapRef,
} from "@vis.gl/react-maplibre";
import * as turf from "@turf/buffer";
import "maplibre-gl/dist/maplibre-gl.css";

import { ClusterThumbnail } from "./ClusterThumbnail";
import type { ClusterFeature } from "./useClusters";

import { X } from "lucide-react";

import { Popup } from "./components/Popup";
import POIS_A from "./data/pois-a.json";
import BUILDINGS from "./data/buildings.json";
// import SURFACE_DATA from "./data/surface-points.json";
// import SURFACE_PATHS from "./data/surface-paths.json";
import SURFACE_SAMPLES from "./data/surface-samples.json";
import WAYS from "./data/ways.json";

const inova = BUILDINGS.features[0];
// Bounding box format: [Southwest Lng, Southwest Lat], Northeast Lng, Northeast Lat]
const CAMPUS_BOUNDS: [number, number, number, number] = [
  -46.745496,
  -23.572641, // Southwest corner
  -46.710219,
  -23.549471, // Northeast corner
];

// feat.id = "way/152732609"
const MY_WAY = WAYS.features.find((f) => f.id === "way/152732609");
const ANOTHER_WAY = WAYS.features.find((f) => f.id === "way/422971161");

const WAYS_GEOJSON =
  MY_WAY && ANOTHER_WAY
    ? { type: "FeatureCollection", features: [MY_WAY, ANOTHER_WAY] }
    : { type: "FeatureCollection", features: [] };

console.log("WAYS_GEOJSON", WAYS_GEOJSON);

const START_LON = inova.geometry.coordinates[0];
const START_LAT = inova.geometry.coordinates[1];

type PoiA = (typeof POIS_A)[0];
type SurfaceSample = (typeof SURFACE_SAMPLES)["features"][0];
const BASE_URL = import.meta.env.BASE_URL || "/"; // Use the base URL from Vite's environment variables, defaulting to "/"

// // Define your GeoJSON data
// const geojsonSource = {
//   type: "FeatureCollection",
//   features: POIS_A,
// };

function App() {
  const mapRef = useRef<MapRef>(null);

  const [selectedBuilding, setSelectedBuilding] =
    useState<MapGeoJSONFeature | null>(null);
  const [buildingPois, setBuildingPois] = useState<PoiA[] | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<PoiA | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(18);
  const [selectedSurface, setSelectedSurface] = useState<SurfaceSample | null>(
    null,
  );
  const [clickedLine, setClickedLine] = useState<MapGeoJSONFeature | null>(
    null,
  );
  const [activeCluster, setActiveCluster] = useState<{
    cluster: ClusterFeature;
    screenX: number;
    screenY: number;
  } | null>(null);

  const clusterFeatures = SURFACE_SAMPLES.features.map((f) => ({
    id: f.properties.id,
    coordinates: f.geometry.coordinates as [number, number],
    properties: f.properties,
  }));

  const getViewState = () => {
    const params = new URLSearchParams(window.location.search);

    let lat = START_LAT;
    let lon = START_LON;
    if (params.has("lat") && params.has("lon")) {
      lat = parseFloat(params.get("lat") || "");
      lon = parseFloat(params.get("lon") || "");
    }

    return {
      longitude: lon, // Default longitude
      latitude: lat, // Default latitude
      zoom: 17,
    };
  };

  const INTERACTIVE_LAYERS = [
    "poi_r20",
    "poi_r7",
    "poi_r1",
    "poi_transit",
    "poi_own",
    "way-fill-base",
  ];

  // Define your GeoJSON data
  const geojsonSource = {
    type: "FeatureCollection",
    features: selectedPoi ? [selectedPoi] : [],
  };

  const handleMapClick = (event: MapLayerMouseEvent) => {
    setActiveCluster(null);
    setClickedLine(null);

    // Verifica se há features sob o ponto onde o usuário clicou
    const features = event.features;
    if (!features || features.length === 0) return;

    const clickedFeature = features[0];

    switch (clickedFeature.layer.id) {
      case "way-fill-base":
        console.log("Clicked on a way:", clickedFeature);
        setClickedLine(clickedFeature || null);
        if (mapRef.current) {
          mapRef.current.setPitch(45); // Ajusta o pitch para 45 graus
        }
        break;
      default:
        // Busca no seu JSON local se você tem informações estendidas para esse prédio
        const buildingPois = POIS_A.filter((poi) => {
          return (
            poi.properties.parent_building_id === clickedFeature.properties?.id
          );
        });

        setSelectedBuilding(clickedFeature);
        if (buildingPois.length > 0) setBuildingPois(buildingPois);
        break;
    }
  };

  const bufferedWay = clickedLine
    ? turf.buffer(clickedLine, 5, { units: "meters" })
    : null;

  // 2. React to clickedLine state shifts
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // We must ensure the style/layers have loaded before setting properties
    const updateVisibility = () => {
      const targetLayers = [
        "poi_r20",
        "poi_r7",
        "poi_r1",
        "poi_transit",
        "poi_own",
        "way-fill-base",
        "building-3d",
      ]; // Layers to be hidden when a line is clicked

      targetLayers.forEach((targetLayer) => {
        if (map.getLayer(targetLayer)) {
          // Hide if clickedLine is NOT null, otherwise show it
          const visibilityValue = clickedLine !== null ? "none" : "visible";
          map.setLayoutProperty(targetLayer, "visibility", visibilityValue);
        }
      });
    };

    if (map.isStyleLoaded()) {
      updateVisibility();
    } else {
      map.once("idle", updateVisibility);
    }
  }, [clickedLine]);

  return (
    <div className="app">
      <div className="right">
        <div className="map border border-[#ededed] rounded-lg h-[80svh] overflow-hidden">
          {activeCluster && (
            <ClusterThumbnail
              feature={activeCluster.cluster}
              baseUrl={BASE_URL}
              anchorScreenX={activeCluster.screenX}
              anchorScreenY={activeCluster.screenY}
              onClose={() => setActiveCluster(null)}
              onSelectSample={(sampleId) => {
                // Encontra o feature original e abre o painel lateral existente
                const feature = SURFACE_SAMPLES.features.find(
                  (f) => f.properties.id === sampleId,
                );
                if (feature) {
                  setSelectedSurface(feature as any);
                  setActiveCluster(null);
                }
              }}
            />
          )}

          <Map
            ref={mapRef}
            initialViewState={getViewState()}
            onLoad={(event) => {
              const map = event.target;
              const tiles = [
                {
                  name: "concreto-escuro",
                  url: `${BASE_URL}images/tiles/concreto-escuro.png`,
                },
                {
                  name: "pedregulho",
                  url: `${BASE_URL}images/tiles/pedregulho.png`,
                },
              ];

              tiles.forEach((tile) => {
                map.loadImage(tile.url).then((res) => {
                  map.addImage(tile.name, res.data, { pixelRatio: 1.5 });
                });
              });
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
            {/* == WAY == */}
            {currentZoom >= 18 && (
              <>
                <Source
                  id="way-box-source"
                  type="geojson"
                  data={{
                    type: "FeatureCollection",
                    features: bufferedWay ? [bufferedWay] : [],
                  }}
                >
                  <Layer
                    id="way-3d-block"
                    type="fill-extrusion"
                    paint={{
                      // "fill-extrusion-color": "#917cff",
                      "fill-extrusion-opacity": 0.9,
                      // 1. The altitude where the BOTTOM of the shape begins (meters above ground)
                      "fill-extrusion-base": 10,
                      // 2. The altitude where the TOP of the shape ends (meters above ground)
                      // If this is 4, your floating path will be exactly 1 meter thick.
                      "fill-extrusion-height": 12,
                      "fill-extrusion-pattern": [
                        "match",
                        ["get", "surface"],
                        "asphalt",
                        "concreto-escuro",
                        "paving_stones",
                        "pedregulho",
                        "",
                      ],
                    }}
                  />
                </Source>
                <Source id="path-source" type="geojson" data={WAYS}>
                  {/* 1. Base Layer (Always visible at low opacity) */}
                  <Layer
                    beforeId="building"
                    id="way-fill-base"
                    type="line"
                    paint={{
                      "line-pattern": [
                        "match",
                        ["get", "surface"],
                        "asphalt",
                        "concreto-escuro",
                        "paving_stones",
                        "pedregulho",
                        "",
                      ],
                      "line-width": 18,
                      "line-opacity": 0.3, // Constant global value
                    }}
                    layout={{ "line-cap": "round" }}
                  />

                  {/* 2. Highlight Layer (Only shows the active feature) */}
                  {/* <Layer
                    beforeId="building"
                    id="way-fill-highlight"
                    type="line"
                    // Use filter to isolate the selected line feature
                    filter={[
                      "==",
                      ["get", "@id"],
                      clickedLine?.properties?.["@id"] || "",
                    ]}
                    paint={{
                      "line-pattern": [
                        "match",
                        ["get", "surface"],
                        "asphalt",
                        "concreto-escuro",
                        "paving_stones",
                        "pedregulho",
                        "",
                      ],
                      "line-width": 30,
                    }}
                    layout={{ "line-cap": "round" }}
                  /> */}
                </Source>
              </>
            )}

            {/* == WAY == */}

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
              clusterFeatures.map((feature) => {
                const [longitude, latitude] = feature.coordinates;
                const representativeId = feature.properties.id;
                const thumbnail_url = `${BASE_URL}images/surface-points/${representativeId}/photo.jpg`;
                const isActive =
                  activeCluster?.cluster.id === feature.properties.id;
                // const hasMultiple = cluster.members.length > 1;

                return (
                  <Marker
                    key={feature.properties.id}
                    longitude={longitude}
                    latitude={latitude}
                    anchor="bottom"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`
              relative shadow-md bg-white cursor-pointer
              transition-all
              w-12 h-12 rounded-full p-[3px]
              ${
                isActive
                  ? "ring-2 ring-[#917cff]"
                  : "hover:ring-2 hover:ring-[#917cff]"
              }
            `}
                        onClick={(e) => {
                          const rect =
                            (e.currentTarget as HTMLElement)
                              .closest("[style]")
                              ?.getBoundingClientRect() ??
                            (
                              e.currentTarget as HTMLElement
                            ).getBoundingClientRect();
                          setActiveCluster({
                            cluster: feature,
                            screenX: rect.left + rect.width / 2,
                            screenY: rect.top,
                          });
                          // Não propaga para o mapa (evita fechar imediatamente)
                          e.stopPropagation();
                        }}
                      >
                        {/* Foto principal (representativa do cluster) */}
                        <img
                          src={thumbnail_url}
                          alt="Superfície"
                          className={`w-full h-full object-cover rounded-full`}
                        />
                      </div>

                      {/* Seta do marcador */}
                      <div className="mt-[0.8px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#b2a4f8]" />
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
