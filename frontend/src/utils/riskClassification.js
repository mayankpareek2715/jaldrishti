/**
 * Authoritative Risk Tier Classification Policy
 * Single source of truth for flood risk classification across JalDrishti.
 * Matches backend com.jaldrishti.provenance.RiskTierPolicy.
 *
 * Tiers:
 * - LOW: probability < 0.50 ( < 50% )
 * - MODERATE: 0.50 <= probability < 0.75 ( 50% <= p < 75% ) -> e.g. 74% is MODERATE
 * - HIGH: 0.75 <= probability < 0.90 ( 75% <= p < 90% )
 * - SEVERE: probability >= 0.90 ( >= 90% )
 */

export const RISK_TIERS = {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  SEVERE: 'SEVERE'
};

export const TIER_COLORS = {
  LOW: '#10b981',      // Emerald Green
  MODERATE: '#f59e0b', // Amber
  HIGH: '#f97316',     // Orange
  SEVERE: '#ef4444'    // Red
};

export const TIER_EMOJIS = {
  LOW: '🟢',
  MODERATE: '🟡',
  HIGH: '🟠',
  SEVERE: '🔴'
};

export const TIER_LABELS = {
  LOW: 'Low Risk',
  MODERATE: 'Moderate Risk',
  HIGH: 'High Risk',
  SEVERE: 'Severe Risk'
};

/**
 * Normalizes input probability to [0.0, 1.0] and classifies into strict authoritative tier.
 * @param {number} rawProbability - Probability value either in 0..1 or 0..100
 * @returns {string} One of 'LOW', 'MODERATE', 'HIGH', 'SEVERE'
 */
export function classifyRisk(rawProbability) {
  if (rawProbability == null || isNaN(rawProbability)) {
    return RISK_TIERS.LOW;
  }
  
  let p = Number(rawProbability);
  if (p < 0) p = 0;
  // If provided as percentage > 1.0, normalize to [0, 1]
  if (p > 1.0) {
    p = p / 100.0;
  }

  if (p < 0.50) {
    return RISK_TIERS.LOW;
  } else if (p < 0.75) {
    return RISK_TIERS.MODERATE;
  } else if (p < 0.90) {
    return RISK_TIERS.HIGH;
  } else {
    return RISK_TIERS.SEVERE;
  }
}

/**
 * Validates whether a provided tier matches the probability value.
 */
export function validateTierConsistency(rawProbability, declaredTier) {
  const expected = classifyRisk(rawProbability);
  return {
    valid: expected === declaredTier,
    expected,
    declared: declaredTier
  };
}