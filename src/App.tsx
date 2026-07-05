import { useState } from "react";
import { Map, Marker } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import POIS_A from "./data/pois-a.json";
import PREDIOS from "./data/predios.json";
const inova = PREDIOS[0];

type PoiA = (typeof POIS_A)[0];

function App() {
  const [selectedPoiA, setSelectedPoiA] = useState<PoiA | null>(null);

  return (
    <div className="app">
      <div className="sidebar">
        <div className="information">
          <header style={{ margin: "1rem 0" }}>
            <span className="icon">🏢</span>
            <h3>INOVA USP</h3>
          </header>

          <div className="pois">
            {POIS_A.map((poi) => {
              const imgPath = new URL(
                `./data/images/${poi.id}/front-photo.jpg`,
                import.meta.url,
              ).href;
              return (
                <div
                  className={`card ${selectedPoiA && selectedPoiA.id == poi.id && "selected"}`}
                  key={poi.id}
                  onClick={() => {
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
                        <span>{floor}º andar</span>
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
        </div>
      </div>

      <div className="right">
        <div className="map" style={{ height: "80svh" }}>
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
                }}
              >
                🏢 <br />
                {inova.nome}
              </span>
            </Marker>
          </Map>
        </div>

        {selectedPoiA && (
          <div className="poi-a-descricao">
            <h2>Elevador 1</h2>
            <div className="img-lista">
              {["front-photo.jpg", "inside-photo.jpg"].map((filename) => {
                const imgPath = new URL(
                  `./data/images/${selectedPoiA.id}/${filename}`,
                  import.meta.url,
                ).href;
                return <img src={imgPath} alt="Minha imagem href" />;
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
                    src={imgPath}
                    alt="Esse é a imagem da instrução"
                    style={{
                      width: 400,
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
    </div>
  );
}

export default App;
