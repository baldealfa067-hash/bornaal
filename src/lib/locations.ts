export const LOCATIONS: { group: string; options: string[] }[] = [
  {
    group: "Bairros de Bissau",
    options: [
      "Bandim",
      "Bairro Militar",
      "Pluba",
      "Antula",
      "Mindará",
      "Belém",
      "Santa Luzia",
      "Centro",
    ],
  },
  {
    group: "Regiões",
    options: ["Gabú", "Bafatá", "Canchungo", "Mansôa"],
  },
];

export const LOCATION_OPTIONS = LOCATIONS.flatMap((g) => g.options);