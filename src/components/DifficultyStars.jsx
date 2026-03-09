import { FaRegStar, FaStar } from "react-icons/fa6";
import { difficultyToRating } from "../lib/difficultyRating";

export const StarIcons = ({ rating, sizeClass = "text-[13px]" }) => (
  <span className={`inline-flex items-center gap-0.5 ${sizeClass}`}>
    {Array.from({ length: 5 }).map((_, index) => (
      index < rating
        ? <FaStar key={index} className="text-[#f59e0b]" />
        : <FaRegStar key={index} className="text-[#d4d8df]" />
    ))}
  </span>
);

export const DifficultyStars = ({ difficulty, compact = false, showLabel = false }) => {
  const rating = difficultyToRating(difficulty);
  if (!rating) return null;

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-[#f3ddad] bg-[#fff8e8] px-3 py-1 ${compact ? "text-[11px]" : "text-[12px]"} text-[#8a5a00]`}>
      <StarIcons rating={rating} sizeClass={compact ? "text-[11px]" : "text-[13px]"} />
      {showLabel ? <span className="font-medium">{rating} / 5</span> : null}
    </span>
  );
};

export const StarRatingInput = ({ value, onChange, size = "md" }) => {
  const safeValue = Number(value) || 0;
  const sizeClass = size === "sm" ? "text-[15px]" : "text-[18px]";

  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const nextValue = index + 1;
        const active = nextValue <= safeValue;
        return (
          <button
            key={nextValue}
            type="button"
            onClick={() => onChange(nextValue)}
            className={`transition ${sizeClass}`}
            aria-label={`${nextValue}점 선택`}
          >
            {active ? <FaStar className="text-[#f59e0b]" /> : <FaRegStar className="text-[#c7ccd5] hover:text-[#f59e0b]" />}
          </button>
        );
      })}
    </div>
  );
};
