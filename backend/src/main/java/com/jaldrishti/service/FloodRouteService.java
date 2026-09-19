package com.jaldrishti.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.jaldrishti.config.FloodRouteConfig;
import com.jaldrishti.dto.FloodRouteRequestDto;
import com.jaldrishti.dto.FloodRouteResponseDto;
import com.jaldrishti.dto.FloodRouteResponseDto.*;
import com.jaldrishti.entity.Locality;
import com.jaldrishti.repository.LocalityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FloodRouteService {

    private final LocalityRepository localityRepository;
    private final RiskService riskService;
    private final RestTemplate restTemplate;
    private final FloodRouteConfig config;

    public FloodRouteResponseDto findFloodAwareRoutes(FloodRouteRequestDto req) {
        String horizon = req.horizon() != null ? req.horizon() : "+1h";
        List<Locality> allLocalities = localityRepository.findAll();
        
        // Build risk lookup map from existing risk data
        Map<String, RiskInfo> riskMap = buildRiskMap(allLocalities, horizon);
        
        // Fetch route alternatives
        List<RawRoute> rawRoutes = fetchRouteAlternatives(req.start(), req.end());
        
        if (rawRoutes.isEmpty()) {
            // Return empty response
            return new FloodRouteResponseDto(List.of(), Instant.now(), !riskMap.isEmpty());
        }
        
        // Analyze each route for flood exposure
        List<RouteAlternative> analyzedRoutes = new ArrayList<>();
        for (int i = 0; i < rawRoutes.size(); i++) {
            analyzedRoutes.add(analyzeRoute(i, rawRoutes.get(i), allLocalities, riskMap));
        }
        
        // Sort by flood score (lower = better)
        analyzedRoutes.sort(Comparator.comparingDouble(RouteAlternative::floodScore));
        
        // Re-index and mark recommended
        List<RouteAlternative> finalRoutes = new ArrayList<>();
        for (int i = 0; i < analyzedRoutes.size(); i++) {
            RouteAlternative r = analyzedRoutes.get(i);
            finalRoutes.add(new RouteAlternative(
                i, i == 0, r.distanceKm(), r.durationMin(), r.floodImpact(),
                r.floodScore(), r.affectedDistanceKm(), r.severeSegments(),
                r.blockedSegments(),
                i == 0 ? generateRecommendationReason(r, analyzedRoutes) : "",
                r.routePoints(), r.segments(), r.warnings(), r.steps()
            ));
        }
        
        return new FloodRouteResponseDto(finalRoutes, Instant.now(), !riskMap.isEmpty());
    }
    
    // --- Private helper classes and methods ---
    
    private record RiskInfo(String riskTier, double riskProbability) {}
    private record RawRoute(List<FloodRouteResponseDto.PointDto> points, double distanceM, double durationSec, List<FloodRouteResponseDto.StepDto> steps) {}
    
    private Map<String, RiskInfo> buildRiskMap(List<Locality> localities, String horizon) {
        Map<String, RiskInfo> map = new HashMap<>();
        try {
            var entries = riskService.getRiskMap(horizon);
            for (var entry : entries) {
                map.put(entry.localityId(), new RiskInfo(
                    entry.riskTier(),
                    entry.riskProbability()
                ));
            }
        } catch (Exception e) {
            log.warn("Error building risk map: {}", e.getMessage());
        }
        return map;
    }
    
    private List<RawRoute> fetchRouteAlternatives(FloodRouteRequestDto.PointDto start, FloodRouteRequestDto.PointDto end) {
        // Try Google Directions API first
        if (config.getGoogleApiKey() != null && !config.getGoogleApiKey().isBlank()) {
            List<RawRoute> googleRoutes = fetchGoogleRoutes(start, end);
            if (googleRoutes != null && !googleRoutes.isEmpty()) {
                return googleRoutes;
            }
        }
        
        // Fall back to OSRM
        log.info("Using OSRM for routing (Google API key not configured or failed)");
        return fetchOsrmRoutes(start, end);
    }
    
    private List<RawRoute> fetchGoogleRoutes(FloodRouteRequestDto.PointDto start, FloodRouteRequestDto.PointDto end) {
        try {
            String url = String.format(
                "https://maps.googleapis.com/maps/api/directions/json?origin=%s,%s&destination=%s,%s&alternatives=true&key=%s",
                start.lat(), start.lon(), end.lat(), end.lon(), config.getGoogleApiKey()
            );
            
            JsonNode response = restTemplate.getForObject(url, JsonNode.class);
            if (response == null || !"OK".equals(response.path("status").asText())) {
                log.warn("Google Directions API returned status: {}", response != null ? response.path("status").asText() : "null");
                return null;
            }
            
            List<RawRoute> routes = new ArrayList<>();
            JsonNode routesNode = response.get("routes");
            for (JsonNode routeNode : routesNode) {
                // Get overview polyline
                String encodedPolyline = routeNode.path("overview_polyline").path("points").asText();
                List<FloodRouteResponseDto.PointDto> points = decodePolyline(encodedPolyline);
                
                List<FloodRouteResponseDto.StepDto> steps = new ArrayList<>();
                double totalDistanceM = 0;
                double totalDurationSec = 0;
                for (JsonNode leg : routeNode.get("legs")) {
                    totalDistanceM += leg.path("distance").path("value").asDouble();
                    totalDurationSec += leg.path("duration").path("value").asDouble();
                    if (leg.has("steps")) {
                        for (JsonNode step : leg.get("steps")) {
                            String htmlInst = step.path("html_instructions").asText("");
                            String cleanInst = htmlInst.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
                            double stepDist = step.path("distance").path("value").asDouble();
                            double stepDur = step.path("duration").path("value").asDouble();
                            String maneuver = step.path("maneuver").asText("turn");
                            steps.add(new FloodRouteResponseDto.StepDto(cleanInst, "", stepDist, stepDur, maneuver, ""));
                        }
                    }
                }
                
                routes.add(new RawRoute(points, totalDistanceM, totalDurationSec, steps));
            }
            
            log.info("Google Directions API returned {} route(s)", routes.size());
            return routes;
        } catch (Exception e) {
            log.error("Error fetching Google directions: {}", e.getMessage());
            return null;
        }
    }
    
    private List<RawRoute> fetchOsrmRoutes(FloodRouteRequestDto.PointDto start, FloodRouteRequestDto.PointDto end) {
        try {
            String url = String.format(
                "http://router.project-osrm.org/route/v1/driving/%s,%s;%s,%s?overview=full&geometries=geojson&alternatives=3&steps=true",
                start.lon(), start.lat(), end.lon(), end.lat()
            );
            
            JsonNode response = restTemplate.getForObject(url, JsonNode.class);
            if (response == null || !"Ok".equals(response.path("code").asText())) {
                log.warn("OSRM failed, using straight-line interpolation");
                return List.of(createInterpolatedRoute(start, end));
            }
            
            List<RawRoute> routes = new ArrayList<>();
            for (JsonNode routeNode : response.get("routes")) {
                List<FloodRouteResponseDto.PointDto> points = new ArrayList<>();
                for (JsonNode coord : routeNode.path("geometry").path("coordinates")) {
                    points.add(new FloodRouteResponseDto.PointDto(coord.get(1).asDouble(), coord.get(0).asDouble()));
                }
                double distM = routeNode.path("distance").asDouble();
                double durSec = routeNode.path("duration").asDouble();

                List<FloodRouteResponseDto.StepDto> steps = new ArrayList<>();
                if (routeNode.has("legs") && routeNode.get("legs").size() > 0) {
                    JsonNode leg = routeNode.get("legs").get(0);
                    if (leg.has("steps")) {
                        for (JsonNode step : leg.get("steps")) {
                            String maneuverType = step.path("maneuver").path("type").asText("turn");
                            String modifier = step.path("maneuver").path("modifier").asText("");
                            String streetName = step.path("name").asText("Arterial Road");
                            if (streetName.isBlank()) streetName = "Main Road";
                            double stepDistM = step.path("distance").asDouble(0.0);
                            double stepDurSec = step.path("duration").asDouble(0.0);
                            String instruction = formatStepInstruction(maneuverType, modifier, streetName);
                            steps.add(new FloodRouteResponseDto.StepDto(instruction, streetName, stepDistM, stepDurSec, maneuverType, modifier));
                        }
                    }
                }

                routes.add(new RawRoute(points, distM, durSec, steps));
            }
            
            return routes.isEmpty() ? List.of(createInterpolatedRoute(start, end)) : routes;
        } catch (Exception e) {
            log.error("OSRM error: {}", e.getMessage());
            return List.of(createInterpolatedRoute(start, end));
        }
    }
    
    private String formatStepInstruction(String type, String modifier, String name) {
        if ("depart".equalsIgnoreCase(type)) {
            return "Head " + (modifier.isBlank() ? "forward" : modifier) + " on " + name;
        } else if ("arrive".equalsIgnoreCase(type)) {
            return "Arrive at destination";
        } else if ("turn".equalsIgnoreCase(type)) {
            return "Turn " + (modifier.isBlank() ? "" : modifier + " ") + "onto " + name;
        } else if ("new name".equalsIgnoreCase(type)) {
            return "Continue onto " + name;
        } else {
            String mod = modifier.isBlank() ? "" : modifier + " ";
            return type.substring(0, 1).toUpperCase() + type.substring(1) + " " + mod + "onto " + name;
        }
    }

    private RawRoute createInterpolatedRoute(FloodRouteRequestDto.PointDto start, FloodRouteRequestDto.PointDto end) {
        List<FloodRouteResponseDto.PointDto> points = new ArrayList<>();
        int n = 12;
        for (int i = 0; i <= n; i++) {
            double t = (double) i / n;
            points.add(new FloodRouteResponseDto.PointDto(
                start.lat() + t * (end.lat() - start.lat()),
                start.lon() + t * (end.lon() - start.lon())
            ));
        }
        double distM = haversineKm(start.lat(), start.lon(), end.lat(), end.lon()) * 1000;
        double durSec = (distM / 1000.0) / 30.0 * 3600; // ~30 km/h average
        List<FloodRouteResponseDto.StepDto> steps = List.of(
            new FloodRouteResponseDto.StepDto("Depart origin toward destination", "Transit corridor", distM * 0.3, durSec * 0.3, "depart", ""),
            new FloodRouteResponseDto.StepDto("Continue along arterial road", "Main road", distM * 0.5, durSec * 0.5, "continue", "straight"),
            new FloodRouteResponseDto.StepDto("Arrive at destination", "Destination", distM * 0.2, durSec * 0.2, "arrive", "")
        );
        return new RawRoute(points, distM, durSec, steps);
    }
    
    private RouteAlternative analyzeRoute(int index, RawRoute raw, List<Locality> localities, Map<String, RiskInfo> riskMap) {
        double distanceKm = raw.distanceM() / 1000.0;
        double durationMin = raw.durationSec() / 60.0;
        
        // Find flood-affected segments
        List<FloodSegment> segments = new ArrayList<>();
        List<RouteWarning> warnings = new ArrayList<>();
        double affectedDistanceKm = 0;
        int severeCount = 0;
        int blockedCount = 0;
        
        // Track which localities have already been flagged to avoid duplicates
        Set<String> flaggedLocalities = new HashSet<>();
        
        for (Locality loc : localities) {
            RiskInfo risk = riskMap.get(loc.getId());
            if (risk == null) continue;
            
            // Find route points near this locality
            int firstNearIndex = -1;
            int lastNearIndex = -1;
            
            for (int i = 0; i < raw.points().size(); i++) {
                FloodRouteResponseDto.PointDto p = raw.points().get(i);
                double distKm = haversineKm(p.lat(), p.lon(), loc.getCentroidLat(), loc.getCentroidLon());
                if (distKm <= config.getProximityKm()) {
                    if (firstNearIndex == -1) firstNearIndex = i;
                    lastNearIndex = i;
                }
            }
            
            if (firstNearIndex == -1) continue;
            if (risk.riskProbability() < 0.25) continue; // LOW risk, skip
            if (flaggedLocalities.contains(loc.getId())) continue;
            flaggedLocalities.add(loc.getId());
            
            // Calculate segment distance
            double segmentKm = 0;
            for (int i = firstNearIndex; i < lastNearIndex; i++) {
                segmentKm += haversineKm(
                    raw.points().get(i).lat(), raw.points().get(i).lon(),
                    raw.points().get(i + 1).lat(), raw.points().get(i + 1).lon()
                );
            }
            if (segmentKm < 0.01) segmentKm = 0.5; // minimum segment distance
            
            String effectiveTier = risk.riskTier();
            if (risk.riskProbability() >= 0.90) {
                effectiveTier = "BLOCKED";
                blockedCount++;
            } else if ("SEVERE".equals(risk.riskTier())) {
                severeCount++;
            }
            
            segments.add(new FloodSegment(
                firstNearIndex, lastNearIndex,
                loc.getId(), loc.getName(),
                effectiveTier, risk.riskProbability(),
                Math.round(segmentKm * 10.0) / 10.0,
                loc.getCentroidLat(), loc.getCentroidLon()
            ));
            
            affectedDistanceKm += segmentKm;
            
            // Generate warnings
            double warningDistKm = 0;
            for (int i = 0; i < firstNearIndex && i < raw.points().size() - 1; i++) {
                warningDistKm += haversineKm(
                    raw.points().get(i).lat(), raw.points().get(i).lon(),
                    raw.points().get(i + 1).lat(), raw.points().get(i + 1).lon()
                );
            }
            
            if (risk.riskProbability() >= 0.90) {
                warnings.add(new RouteWarning("BLOCKED_ROAD", Math.round(warningDistKm * 10.0) / 10.0, "BLOCKED", loc.getName()));
            } else if ("SEVERE".equals(risk.riskTier())) {
                warnings.add(new RouteWarning("SEVERE_FLOOD", Math.round(warningDistKm * 10.0) / 10.0, "SEVERE", loc.getName()));
            } else if ("HIGH".equals(risk.riskTier()) || "MODERATE".equals(risk.riskTier())) {
                warnings.add(new RouteWarning("FLOOD_AHEAD", Math.round(warningDistKm * 10.0) / 10.0, risk.riskTier(), loc.getName()));
            }
        }
        
        // Calculate flood score
        double floodScore = (raw.durationSec() / 3600.0) * config.getTimeWeight()
            + (distanceKm) * config.getDistanceWeight()
            + affectedDistanceKm * config.getFloodWeight()
            + severeCount * config.getSevereFloodWeight()
            + blockedCount * config.getBlockedRoadWeight();
        floodScore = Math.round(floodScore * 10.0) / 10.0;
        
        // Determine overall flood impact
        String floodImpact;
        if (blockedCount > 0 || severeCount >= 2) {
            floodImpact = "SEVERE";
        } else if (severeCount > 0 || affectedDistanceKm > 3.0) {
            floodImpact = "HIGH";
        } else if (affectedDistanceKm > 1.0 || segments.stream().anyMatch(s -> "HIGH".equals(s.riskTier()))) {
            floodImpact = "MODERATE";
        } else {
            floodImpact = "LOW";
        }
        
        affectedDistanceKm = Math.round(affectedDistanceKm * 10.0) / 10.0;
        
        return new RouteAlternative(
            index, false,
            Math.round(distanceKm * 10.0) / 10.0,
            Math.round(durationMin),
            floodImpact, floodScore, affectedDistanceKm,
            severeCount, blockedCount, "",
            raw.points(), segments, warnings, raw.steps()
        );
    }
    
    private String generateRecommendationReason(RouteAlternative best, List<RouteAlternative> all) {
        if (all.size() <= 1) return "Only available route.";
        RouteAlternative worst = all.get(all.size() - 1);
        if (best.floodScore() < worst.floodScore() && best.durationMin() > worst.durationMin()) {
            return "This route has lower flood exposure than the faster alternative.";
        } else if (best.floodScore() < worst.floodScore()) {
            return "This route has the lowest flood exposure and is also efficient.";
        } else {
            return "Recommended based on overall flood-aware analysis.";
        }
    }
    
    // Google polyline decoding algorithm
    private List<FloodRouteResponseDto.PointDto> decodePolyline(String encoded) {
        List<FloodRouteResponseDto.PointDto> points = new ArrayList<>();
        int index = 0;
        int lat = 0, lng = 0;
        
        while (index < encoded.length()) {
            int result = 0;
            int shift = 0;
            int b;
            do {
                b = encoded.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            lat += (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
            
            result = 0;
            shift = 0;
            do {
                b = encoded.charAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            lng += (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
            
            points.add(new FloodRouteResponseDto.PointDto(lat / 1e5, lng / 1e5));
        }
        
        return points;
    }
    
    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
