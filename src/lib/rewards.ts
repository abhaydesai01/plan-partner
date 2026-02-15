import confetti from "canvas-confetti";

/** Trigger a short confetti burst for instant reward feedback. */
export function triggerRewardConfetti(): void {
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.75 },
  });
}

/** Show "+X points earned 🎉" toast and confetti when response includes points_earned. */
export function showPointsEarned(
  response: { points_earned?: number } | undefined,
  toast: (opts: { title: string; description?: string }) => void
): void {
  const points = response?.points_earned;
  if (points != null && points > 0) {
    toast({ title: `+${points} points earned 🎉`, description: "Keep it up!" });
    triggerRewardConfetti();
  }
}
