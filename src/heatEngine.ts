import { analyzeTextEnergy } from "./lexicalAnalyzer";

export function generateHeatMap(text: string) {
  const energies = analyzeTextEnergy(text);
  return energies.map((e) => `${e.word} `).join("");
}
