import routeData from "./data/fflch_central.json";

// Criar função para se comunicar com API do OpenSourceRoute
function fetchMockRoute() {
  const { properties, geometry } = routeData.features[0];
  const way = geometry.coordinates; // The route as an array of coords: [lat, lon]

  console.log(way);
}
