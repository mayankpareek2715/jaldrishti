package com.jaldrishti.provenance;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.*;

class RiskTierPolicyTest {

    @ParameterizedTest(name = "Probability {0} should classify as {1}")
    @CsvSource({
            "0.0,    LOW",
            "0.10,   LOW",
            "0.49,   LOW",
            "0.4999, LOW",
            "0.50,   MODERATE",
            "0.5001, MODERATE",
            "0.65,   MODERATE",
            "0.74,   MODERATE",   // Mandated test case: 74% MUST NOT BE HIGH!
            "0.7499, MODERATE",
            "0.75,   HIGH",       // Boundary: exactly 75% is HIGH
            "0.7501, HIGH",
            "0.85,   HIGH",
            "0.8999, HIGH",
            "0.90,   SEVERE",     // Boundary: exactly 90% is SEVERE
            "0.9001, SEVERE",
            "0.95,   SEVERE",
            "1.0,    SEVERE"
    })
    @DisplayName("Verify authoritative risk tier boundaries")
    void testRiskTierBoundaries(double probability, String expectedTier) {
        assertEquals(expectedTier, RiskTierPolicy.classify(probability),
                String.format("Probability %.4f must classify as %s", probability, expectedTier));
    }

    @Test
    @DisplayName("Verify 74% is NEVER High, always Moderate")
    void testSeventyFourPercentExplicitly() {
        assertEquals("MODERATE", RiskTierPolicy.classify(0.74));
        assertEquals("MODERATE", RiskTierPolicy.classify(74.0)); // Also handles 0-100 scale input
    }

    @Test
    @DisplayName("Verify null safe handling defaults to LOW")
    void testNullSafe() {
        assertEquals("LOW", RiskTierPolicy.classify(null));
    }

    @Test
    @DisplayName("Verify probability validation domain bounds")
    void testValidateProbability() {
        assertDoesNotThrow(() -> RiskTierPolicy.validateProbability(0.0));
        assertDoesNotThrow(() -> RiskTierPolicy.validateProbability(0.74));
        assertDoesNotThrow(() -> RiskTierPolicy.validateProbability(1.0));

        assertThrows(IllegalArgumentException.class, () -> RiskTierPolicy.validateProbability(-0.01));
        assertThrows(IllegalArgumentException.class, () -> RiskTierPolicy.validateProbability(1.05));
        assertThrows(IllegalArgumentException.class, () -> RiskTierPolicy.validateProbability(null));
    }
}
