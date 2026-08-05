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