import type { SpectrumCard } from "./types.js";

/**
 * Spectra's built-in deck. These are original, generic opposite-pairs and
 * concept spectrums written for this project — not the prompts from any
 * published game. Hosts can add their own pairs on top of (or instead of)
 * this deck.
 */
export const DEFAULT_DECK: SpectrumCard[] = [
  // Plain physical / sensory opposites
  { left: "Cold", right: "Hot" },
  { left: "Quiet", right: "Loud" },
  { left: "Small", right: "Huge" },
  { left: "Slow", right: "Fast" },
  { left: "Dark", right: "Bright" },
  { left: "Soft", right: "Hard" },
  { left: "Smooth", right: "Rough" },
  { left: "Light", right: "Heavy" },
  { left: "Empty", right: "Full" },
  { left: "Dry", right: "Wet" },
  { left: "Dull", right: "Sharp" },
  { left: "Shallow", right: "Deep" },
  { left: "Bland", right: "Spicy" },
  { left: "Sour", right: "Sweet" },
  { left: "Transparent", right: "Opaque" },
  { left: "Curved", right: "Straight" },
  { left: "Round", right: "Pointy" },
  { left: "Tiny portion", right: "Enormous portion" },

  // Value / quality spectrums
  { left: "Cheap", right: "Expensive" },
  { left: "Useless", right: "Useful" },
  { left: "Worthless", right: "Priceless" },
  { left: "Common", right: "Rare" },
  { left: "Ordinary", right: "Extraordinary" },
  { left: "Overrated", right: "Underrated" },
  { left: "Forgettable", right: "Unforgettable" },
  { left: "Trivial", right: "Important" },
  { left: "Waste of money", right: "Worth every penny" },
  { left: "Fragile", right: "Indestructible" },
  { left: "Outdated", right: "Cutting-edge" },
  { left: "Mainstream", right: "Niche" },

  // Difficulty / complexity
  { left: "Easy", right: "Impossible" },
  { left: "Simple", right: "Complicated" },
  { left: "Boring", right: "Thrilling" },
  { left: "Predictable", right: "Surprising" },
  { left: "Safe", right: "Dangerous" },
  { left: "Relaxing", right: "Stressful" },
  { left: "Calm", right: "Chaotic" },
  { left: "Stable", right: "Volatile" },

  // Aesthetic / taste
  { left: "Ugly", right: "Beautiful" },
  { left: "Tacky", right: "Elegant" },
  { left: "Cluttered", right: "Minimalist" },
  { left: "Casual", right: "Formal" },
  { left: "Cheap-looking", right: "Luxurious" },
  { left: "Messy", right: "Tidy" },

  // Character / personality
  { left: "Cruel", right: "Kind" },
  { left: "Arrogant", right: "Humble" },
  { left: "Cowardly", right: "Brave" },
  { left: "Lazy", right: "Hardworking" },
  { left: "Selfish", right: "Generous" },
  { left: "Rude", right: "Polite" },
  { left: "Serious", right: "Silly" },
  { left: "Shy", right: "Outgoing" },
  { left: "Cautious", right: "Reckless" },
  { left: "Pessimist", right: "Optimist" },
  { left: "Forgiving", right: "Vengeful" },
  { left: "Spontaneous", right: "Carefully planned" },
  { left: "Logical", right: "Emotional" },

  // Time / age
  { left: "Ancient", right: "Futuristic" },
  { left: "Old-fashioned", right: "Modern" },
  { left: "Temporary", right: "Permanent" },
  { left: "A passing fad", right: "A timeless classic" },

  // Place / scale
  { left: "Local", right: "Global" },
  { left: "Rural", right: "Urban" },
  { left: "Indoors", right: "Outdoors" },
  { left: "Analog", right: "Digital" },
  { left: "Natural", right: "Artificial" },

  // Health / state
  { left: "Healthy snack", right: "Junk food" },
  { left: "Stale", right: "Fresh" },
  { left: "Mild", right: "Intense" },
  { left: "Gentle", right: "Violent" },
  { left: "Tame", right: "Wild" },

  // Social / opinion spectrums (in the playful spirit of the genre)
  { left: "Socially acceptable", right: "Taboo" },
  { left: "Bad superpower", right: "Amazing superpower" },
  { left: "Terrible gift", right: "Perfect gift" },
  { left: "Hard to pronounce", right: "Easy to pronounce" },
  { left: "Underrated food", right: "Overrated food" },
  { left: "Guilty pleasure", right: "Genuinely respected" },
  { left: "A chore", right: "A treat" },
  { left: "Forgettable movie", right: "Iconic movie" },
  { left: "Bad first date", right: "Great first date" },
  { left: "Ends a friendship", right: "Builds a friendship" },
  { left: "Disgusting", right: "Delicious" },
  { left: "Nightmare job", right: "Dream job" },
  { left: "Pointless skill", right: "Life-changing skill" },
  { left: "Definitely fictional", right: "Definitely real" },
  { left: "Round-down number", right: "Round-up number" },
];
