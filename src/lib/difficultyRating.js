export const difficultyToRating = (difficulty) => {
  switch (String(difficulty || "").toUpperCase()) {
    case "EASY":
      return 1;
    case "MEDIUM":
      return 3;
    case "HARD":
      return 5;
    default:
      return 0;
  }
};

export const ratingToDifficulty = (rating) => {
  const safeRating = Number(rating) || 0;
  if (safeRating <= 2) return "EASY";
  if (safeRating === 3) return "MEDIUM";
  return "HARD";
};
