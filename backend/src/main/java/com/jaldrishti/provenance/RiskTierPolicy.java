package com.jaldrishti.provenance;

/**
 * Single authoritative risk classification policy for the JalDrishti platform.
 *
 * Mandated Thresholds:
 * - LOW:      p < 0.50  (< 50%)
 * - MODERATE: 0.50 <= p < 0.75  (50% to 74.99%) -> 74% MUST BE MODERATE!
 * - HIGH:     0.75 <= p < 0.90  (75% to 89.99%)
 * - SEVERE:   p >= 0.90 (>= 90%)
 */
public final class RiskTierPolicy {

    public static final double MODERATE_THRESHOLD = 0.50;
    public static final double HIGH_THRESHOLD     = 0.75;
    public static final double SEVERE_THRESHOLD   = 0.90;

    public static final String TIER_LOW      = "LOW";
    public static final String TIER_MODERATE = "MODERATE";
    public static final String TIER_HIGH     = "HIGH";
    public static final String TIER_SEVERE   = "SEVERE";

    private RiskTierPolicy() {}

    /**
     * Classifies a flood risk probability into its authoritative risk tier.
     *
     * @param probability Probability value between 0.0 and 1.0 (or percentage 0-100 normalized)
     * @return Authoritative Tier name: LOW, MODERATE, HIGH, or SEVERE
     */
    public static String classify(Double probability) {
        if (probability == null) {
            return TIER_LOW;
        }

        // Normalize if passed as 0-100 scale
        double p = probability;
        if (p > 1.0) {
            p = p / 100.0;
        }

        // Boundary safety clamp
        if (p < 0.0) p = 0.0;
        if (p > 1.0) p = 1.0;

        if (p < MODERATE_THRESHOLD) {
            return TIER_LOW;
        } else if (p < HIGH_THRESHOLD) {
            return TIER_MODERATE;
        } else if (p < SEVERE_THRESHOLD) {
            return TIER_HIGH;
        } else {
            return TIER_SEVERE;
        }
    }

    /**
     * Validates that a probability is within the physically and mathematically valid domain [0.0, 1.0].
     */
    public static void validateProbability(Double probability) {
        if (probability == null) {
            throw new IllegalArgumentException("Risk probability cannot be null");
        }
        if (probability < 0.0 || probability > 1.0) {
            throw new IllegalArgumentException("Risk probability must be between 0.0 and 1.0, received: " + probability);
        }
    }
}
