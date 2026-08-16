// import routeData from "./data/fflch_central.json";

// Criar função para se comunicar com API do OpenSourceRoute
// function fetchMockRoute() {
//   const { properties, geometry } = routeData.features[0];
//   const way = geometry.coordinates; // The route as an array of coords: [lat, lon]

//   console.log(way);
// }

// Lista de edifícios do campus Butantã (seed.sql)
const BUILDINGS = [
  { id: "cepeusp", name: "Centro de Práticas Esportivas (CEPEUSP)" },
  { id: "eca", name: "Escola de Comunicações e Artes (ECA)" },
  { id: "eefe", name: "Escola de Educação Física e Esporte (EEFE)" },
  { id: "poli", name: "Escola Politécnica (EP / Poli)" },
  { id: "fau", name: "Faculdade de Arquitetura e Urbanismo (FAU)" },
  { id: "fcf", name: "Faculdade de Ciências Farmacêuticas (FCF)" },
  {
    id: "feausp",
    name: "Faculdade de Economia, Administração, Contabilidade e Atuária (FEA)",
  },
  { id: "fe", name: "Faculdade de Educação (FE)" },
  {
    id: "fflch",
    name: "Faculdade de Filosofia, Letras e Ciências Humanas (FFLCH)",
  },
  { id: "fmvz", name: "Faculdade de Medicina Veterinária e Zootecnia (FMVZ)" },
  { id: "fousp", name: "Faculdade de Odontologia (FO)" },
  { id: "inova-usp", name: "Inova USP" },
  {
    id: "iag",
    name: "Instituto de Astronomia, Geofísica e Ciências Atmosféricas (IAG)",
  },
  { id: "ib", name: "Instituto de Biociências (IB)" },
  { id: "icb", name: "Instituto de Ciências Biomédicas (ICB)" },
  { id: "iee", name: "Instituto de Energia e Ambiente (IEE)" },
  { id: "ieb", name: "Instituto de Estudos Brasileiros (IEB)" },
  { id: "iea", name: "Instituto de Estudos Avançados (IEA)" },
  { id: "if", name: "Instituto de Física (IF)" },
  { id: "igc", name: "Instituto de Geociências (IGc)" },
  { id: "ime", name: "Instituto de Matemática e Estatística (IME)" },
  { id: "ip", name: "Instituto de Psicologia (IP)" },
  { id: "iq", name: "Instituto de Química (IQ)" },
  { id: "iri", name: "Instituto de Relações Internacionais (IRI)" },
  { id: "io", name: "Instituto Oceanográfico (IO)" },
  { id: "reitoria", name: "Reitoria da Universidade de São Paulo" },
  { id: "sas", name: "Superintendência de Assistência Social (SAS / CRUSP)" },
].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

export { BUILDINGS };
