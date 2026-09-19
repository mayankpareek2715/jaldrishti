package com.jaldrishti.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.jaldrishti.dto.RouteCheckRequestDto;
import com.jaldrishti.dto.RouteCheckResponseDto;
import com.jaldrishti.entity.Locality;
import com.jaldrishti.repository.LocalityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

/**
 * Route-risk checker utilizing real road-network routing (via OSRM API) with proximity checks
 * against current locality flood risks.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RouteService {

    private final LocalityRepository localityRepository;
    private final RiskService riskService;
    private final RestTemplate restTemplate;

    private static final double PROXIMITY_KM = 2.0; // tightened for actual road coordinates
    private static final int SAMPLE_POINTS = 12;

    public RouteCheckResponseDto checkRoute(RouteCheckRequestDto req) {
        List<Locality> allLocalities = localityRepository.findAll();
        List<RouteCheckRequestDto.PointDto> routePoints = fetchRealRoutePoints(req.start(), req.end());

        // Fallback to straight-line interpolation if OSRM is unreachable
        if (routePoints == null || routePoints.isEmpty()) {
            log.warn("OSRM routing failed; falling back to straight-line interpolation.");
            routePoints = interpolate(req.start(), req.end(), SAMPLE_POINTS);
        }

        List<RouteCheckResponseDto.FlaggedSegmentDto> flagged = new ArrayList<>();
        for (Locality loc : allLocalities) {
            boolean nearRoute = routePoints.stream()
                    .anyMatch(p -> haversineKm(p.lat(), p.lon(), loc.getCentroidLat(), loc.getCentroidLon()) <= PROXIMITY_KM);
            if (!nearRoute) continue;

            var pred = riskService.getLocalityDetail(loc.getId()).currentRisk();
            if (pred.riskProbability() >= 0.50) {
                flagged.add(new RouteCheckResponseDto.FlaggedSegmentDto(
                        loc.getId(), loc.getName(), pred.riskTier(), pred.riskProbability()));
            }
        }

        String overall = flagged.stream().anyMatch(f -> "SEVERE".equals(f.riskTier())) ? "SEVERE"
                : flagged.stream().anyMatch(f -> "HIGH".equals(f.riskTier())) ? "HIGH"
                : flagged.isEmpty() ? "LOW" : "MODERATE";

        String summary = flagged.isEmpty()
                ? "No high-risk zones detected along this route right now."
                : String.format("Route passes near %d high/severe-risk zone(s): %s.",
                        flagged.size(), flagged.stream().map(RouteCheckResponseDto.FlaggedSegmentDto::localityName).toList());

        return new RouteCheckResponseDto(routePoints, flagged, overall, summary);
    }

    private List<RouteCheckRequestDto.PointDto> fetchRealRoutePoints(RouteCheckRequestDto.PointDto start, RouteCheckRequestDto.PointDto end) {
        try {
            // OSRM expects coordinates in lon,lat order
            String url = String.format(
                    "http://router.project-osrm.org/route/v1/driving/%s,%s;%s,%s?overview=full&geometries=geojson",
                    start.lon(), start.lat(), end.lon(), end.lat());

            JsonNode response = restTemplate.getForObject(url, JsonNode.class);
            if (response == null || !"Ok".equals(response.get("code").asText())) {
                return null;
            }

            JsonNode coordinates = response.get("routes").get(0).get("geometry").get("coordinates");
            List<RouteCheckRequestDto.PointDto> points = new ArrayList<>();
            for (JsonNode node : coordinates) {
                double lon = node.get(0).asDouble();
                double lat = node.get(1).asDouble();
                points.add(new RouteCheckRequestDto.PointDto(lat, lon));
            }
            return points;
        } catch (Exception e) {
            log.error("Error fetching route from OSRM: {}", e.getMessage());
            return null;
        }
    }

    private List<RouteCheckRequestDto.PointDto> interpolate(RouteCheckRequestDto.PointDto a,
                                                               RouteCheckRequestDto.PointDto b, int n) {
        List<RouteCheckRequestDto.PointDto> points = new ArrayList<>();
        for (int i = 0; i <= n; i++) {
            double t = (double) i / n;
            points.add(new RouteCheckRequestDto.PointDto(
                    a.lat() + t * (b.lat() - a.lat()),
                    a.lon() + t * (b.lon() - a.lon())));
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
