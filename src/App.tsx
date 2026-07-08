import { useState } from "react";
import { Map, Marker, Source, Layer } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import { X } from "lucide-react";

import POIS_A from "./data/pois-a.json";
import PREDIOS from "./data/predios.json";
const inova = PREDIOS[0];

type PoiA = (typeof POIS_A)[0];

// // Define your GeoJSON data
// const geojsonSource = {
//   type: "FeatureCollection",
//   features: POIS_A,
// };

// Define the style for your layer
// const layerStyle = {
//   id: "point-layer",
//   type: "circle",
//   paint: {
//     "circle-radius": 10,
//     "circle-color": "#ff0055",
//   },
// };

function App() {
  const [selectedPoiA, setSelectedPoiA] = useState<PoiA | null>(null);

  // Define your GeoJSON data
  const geojsonSource = {
    type: "FeatureCollection",
    features: selectedPoiA ? [selectedPoiA] : [],
  };

  return (
    <div className="app">
      <div className="right">
        <div
          className="map border border-[#ededed] m-4"
          style={{ height: "80svh", overflow: "hidden", borderRadius: "1rem" }}
        >
          <Map
            initialViewState={{
              latitude: inova.ponto_central[0],
              longitude: inova.ponto_central[1],
              zoom: 18,
            }}
            style={{ width: "100%", height: "100%" }}
            mapStyle="https://tiles.openfreemap.org/styles/liberty"
          >
            <Marker
              latitude={inova.ponto_central[0]}
              longitude={inova.ponto_central[1]}
            >
              <span
                style={{
                  fontStyle: "italic",
                  color: "#212020",
                  fontSize: "20px",
                  textAlign: "center",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <span>🏢</span>
                <span>{inova.nome}</span>
              </span>
            </Marker>
            <Source id="my-data-source" type="geojson" data={geojsonSource}>
              <Layer
                id="point-layer"
                type="circle"
                paint={{ "circle-radius": 10, "circle-color": "#ff0055" }}
              />
            </Source>
          </Map>
        </div>

        <section className="building-info">
          <section className="pois">
            <header className="w-full text-[#160d44]">
              <span className="icon">🏢</span>
              <h3>INOVA USP</h3>
            </header>

            <div className="poi-list">
              {POIS_A.map((poi) => {
                const imgPath = new URL(
                  `./data/images/${poi.id}/front-photo.jpg`,
                  import.meta.url,
                ).href;
                return (
                  <div
                    className={`card cursor-pointer rounded-xl border border-[#ededed] ${selectedPoiA && selectedPoiA.id == poi.id && "selected"}`}
                    key={poi.id}
                    onClick={() => {
                      if (selectedPoiA && poi.id === selectedPoiA.id)
                        setSelectedPoiA(null);
                      if (!selectedPoiA || poi.id !== selectedPoiA.id)
                        setSelectedPoiA(poi);
                    }}
                  >
                    <img
                      src={imgPath}
                      alt="Esse é o alt dessa imagem"
                      style={{ width: "100%", height: 150, objectFit: "cover" }}
                    />
                    <div className="body">
                      <h2 className="nome">{poi.properties.name}</h2>
                      <div className="andares" key={poi.id}>
                        {poi.properties.floors.map((floor) => (
                          <span className="border border-[#eccdb1]">
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

          {!selectedPoiA && (
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
            {selectedPoiA && (
              <div
                className="cursor-pointer w-fit border-2 border-[#808080] text-[#5e5e5e] rounded-sm hover:bg-[#f0f0f0] rounded-8"
                onClick={() => setSelectedPoiA(null)}
              >
                <X size={36} />
              </div>
            )}

            {selectedPoiA && (
              <div className="poi-a-descricao">
                <h2>Elevador 1</h2>
                <div className="img-lista">
                  {["front-photo.jpg", "inside-photo.jpg"].map((filename) => {
                    const imgPath = new URL(
                      `./data/images/${selectedPoiA.id}/${filename}`,
                      import.meta.url,
                    ).href;
                    return (
                      <img
                        className="border-4 border-[#ffb179]"
                        src={imgPath}
                        alt="Minha imagem href"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {selectedPoiA && (
              <div className="instrucao-lista">
                <h2>🧭 Rota visual</h2>
                {selectedPoiA.properties.visual_route.map((direction) => {
                  const imgPath = new URL(
                    `./data/images/${selectedPoiA.id}/rota-visual/${direction.step_number}.png`,
                    import.meta.url,
                  ).href;
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
      </div>
    </div>
  );
}

export default App;
