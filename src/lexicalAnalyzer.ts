export function analyzeTextEnergy(text: string) {
  // Placeholder for narrative + cognitive scoring
  // Returns array of word energies
  return text.split(" ").map((word) => ({
    word,
    energy: Math.random(), // Replace with AI / lexical scoring
  }));
}
