/** Coaching rule `coaching-v1`. Reasons are kept on the recommendation, not in a table. */

export const COACHING_RULE_VERSION = "coaching-v1" as const;

/**
 * Below this many questions in the practice window, a subject has no correct-share.
 * A rate from a smaller sample would look more certain than the data is.
 */
export const MIN_ACCURACY_QUESTIONS = 10;

/**
 * A subject is suggested only when correct ÷ questions is strictly below one half.
 * Exactly half is not treated as a problem.
 */
export const LOW_ACCURACY_BELOW = 0.5;
