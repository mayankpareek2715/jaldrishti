package com.jaldrishti.imd.mapper;

import com.fasterxml.jackson.databind.JsonNode;
import com.jaldrishti.imd.config.ImdCityMapping;
import com.jaldrishti.imd.dto.ImdCurrentWeatherDto;
import com.jaldrishti.imd.dto.ImdNowcastDto;
import com.jaldrishti.imd.dto.ImdRainfallDto;
import com.jaldrishti.imd.dto.ImdWarningDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class ImdResponseMapper {

    private static final DateTimeFormatter ISO_DT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Map IMD Current Weather observation JSON.
     */
    public Optional<ImdCurrentWeatherDto> mapCurrentWeather(JsonNode root, ImdCityMapping.CityMetadata cityMeta) {
        if (root == null || root.isEmpty()) return Optional.empty();

        // IMD may return an array or single object
        JsonNode node = root.isArray() ? findMatchingStation(root, cityMeta) : root;
        if (node == null || node.isMissingNode()) return Optional.empty();

        try {
            double temp = parseDouble(findField(node, "CURR_TEMP", "Temp", "temp", "temperature"), 26.0);
            double humidity = parseDouble(findField(node, "RH", "rh", "humidity"), 70.0);
            double windSpeed = parseDouble(findField(node, "WIND_SPEED", "wind_speed", "windSpeed"), 8.0);
            double windDir = parseDouble(findField(node, "WIND_DIRECTION", "wind_direction"), 180.0);
            double pressure = parseDouble(findField(node, "MSLP", "mslp", "pressure"), 1012.0);
            double rainfall24h = parseDouble(findField(node, "RAINFALL_24_HR", "RAINFALL", "rainfall", "Daily Actual"), 0.0);
            double feelsLike = parseDouble(findField(node, "Feel Like", "feel_like", "feels_like"), temp);
            int weatherCode = parseInt(findField(node, "WEATHER_CODE", "weather_code"), 0);

            String date = textOrEmpty(findField(node, "DATE", "date", "date_obs"));
            String time = textOrEmpty(findField(node, "TIME", "time"));
            String observedAt = (!date.isEmpty() && !time.isEmpty()) ? date + " " + time : LocalDateTime.now().format(ISO_DT);

            String stationName = textOrEmpty(findField(node, "STATION", "station", "StationName"));
            if (stationName.isEmpty()) stationName = cityMeta.getPrimaryStationName();

            String stationId = textOrEmpty(findField(node, "ID", "StationId", "id"));
            if (stationId.isEmpty()) stationId = cityMeta.getPrimaryStationId();

            return Optional.of(ImdCurrentWeatherDto.builder()
                    .source("IMD")
                    .city(cityMeta.getCityName())
                    .district(cityMeta.getImdDistrict())
                    .stationId(stationId)
                    .stationName(stationName)
                    .latitude(parseDouble(findField(node, "Latitude", "lat"), cityMeta.getLatitude()))
                    .longitude(parseDouble(findField(node, "Longitude", "lon"), cityMeta.getLongitude()))
                    .observedAt(observedAt)
                    .fetchedAt(LocalDateTime.now().format(ISO_DT))
                    .temperatureC(temp)
                    .humidityPercent(humidity)
                    .windSpeedKmph(windSpeed)
                    .windDirectionDeg(windDir)
                    .pressureHpa(pressure)
                    .feelsLikeC(feelsLike)
                    .weatherCode(weatherCode)
                    .weatherCondition(weatherCodeToCondition(weatherCode))
                    .rainfall24hMm(rainfall24h)
                    .isStale(false)
                    .status("LIVE")
                    .build());

        } catch (Exception ex) {
            log.error("Failed to map IMD current weather response: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Map IMD District Nowcast JSON.
     */
    public Optional<ImdNowcastDto> mapNowcast(JsonNode root, ImdCityMapping.CityMetadata cityMeta) {
        if (root == null || root.isEmpty()) return Optional.empty();

        JsonNode targetNode = null;
        if (root.isArray()) {
            for (JsonNode item : root) {
                String dist = textOrEmpty(findField(item, "District", "district", "DISTRICT"));
                if (dist.equalsIgnoreCase(cityMeta.getImdDistrict()) ||
                    dist.toLowerCase().contains(cityMeta.getImdDistrict().toLowerCase())) {
                    targetNode = item;
                    break;
                }
            }
            if (targetNode == null && root.size() > 0) targetNode = root.get(0);
        } else {
            targetNode = root;
        }

        if (targetNode == null) return Optional.empty();

        try {
            String issuedAt = textOrEmpty(findField(targetNode, "DateTime", "issue_time", "Date"));
            if (issuedAt.isEmpty()) issuedAt = LocalDateTime.now().format(ISO_DT);

            String validUntil = textOrEmpty(findField(targetNode, "Validity", "valid_until", "Valid_To"));
            String intensity = textOrEmpty(findField(targetNode, "Rain_Intensity", "intensity", "Intensity", "warning"));
            if (intensity.isEmpty()) intensity = "Light rain / Moderate clouds";

            String color = textOrEmpty(findField(targetNode, "Warning_Color", "color", "Color"));
            if (color.isEmpty()) color = "#10b981"; // default normal green

            String message = textOrEmpty(findField(targetNode, "Message", "message", "warning_message"));
            if (message.isEmpty()) message = "Nowcast issued for " + cityMeta.getCityName() + ": " + intensity;

            return Optional.of(ImdNowcastDto.builder()
                    .source("IMD")
                    .city(cityMeta.getCityName())
                    .district(cityMeta.getImdDistrict())
                    .issuedAt(issuedAt)
                    .validUntil(validUntil)
                    .fetchedAt(LocalDateTime.now().format(ISO_DT))
                    .rainIntensityCategory(intensity)
                    .warningColor(color)
                    .warningSeverity(mapColorToSeverity(color))
                    .warningMessage(message)
                    .isStale(false)
                    .status("LIVE")
                    .build());

        } catch (Exception ex) {
            log.error("Failed to map IMD nowcast response: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Map IMD District Rainfall JSON.
     */
    public Optional<ImdRainfallDto> mapRainfall(JsonNode root, ImdCityMapping.CityMetadata cityMeta) {
        if (root == null || root.isEmpty()) return Optional.empty();

        JsonNode targetNode = null;
        if (root.isArray()) {
            for (JsonNode item : root) {
                String dist = textOrEmpty(findField(item, "District", "district"));
                if (dist.equalsIgnoreCase(cityMeta.getImdDistrict()) ||
                    dist.toLowerCase().contains(cityMeta.getImdDistrict().toLowerCase())) {
                    targetNode = item;
                    break;
                }
            }
            if (targetNode == null && root.size() > 0) targetNode = root.get(0);
        } else {
            targetNode = root;
        }

        if (targetNode == null) return Optional.empty();

        try {
            return Optional.of(ImdRainfallDto.builder()
                    .source("IMD")
                    .city(cityMeta.getCityName())
                    .district(cityMeta.getImdDistrict())
                    .observedDate(cleanText(findField(targetNode, "Date", "date")))
                    .fetchedAt(LocalDateTime.now().format(ISO_DT))
                    .dailyActualMm(parseDouble(findField(targetNode, "Daily Actual", "daily_actual"), 0.0))
                    .dailyNormalMm(parseDouble(findField(targetNode, "Daily Normal", "daily_normal"), 2.0))
                    .dailyDeparturePercent(cleanText(findField(targetNode, "Daily Departure Per", "departure_per")))
                    .dailyCategory(cleanText(findField(targetNode, "Daily Category", "category")))
                    .weekDateRange(cleanText(findField(targetNode, "Week Date", "week_date")))
                    .weeklyActualMm(parseDouble(findField(targetNode, "Weekly Actual", "weekly_actual"), 0.0))
                    .weeklyNormalMm(parseDouble(findField(targetNode, "Weekly Normal", "weekly_normal"), 10.0))
                    .weeklyDeparturePercent(cleanText(findField(targetNode, "Weekly Departure Per", "weekly_dep_per")))
                    .weeklyCategory(cleanText(findField(targetNode, "Weekly Category", "weekly_cat")))
                    .cumulativeDateRange(cleanText(findField(targetNode, "Cumulative Date", "cumulative_date")))
                    .cumulativeActualMm(parseDouble(findField(targetNode, "Cumulative Actual", "cumulative_actual"), 0.0))
                    .cumulativeNormalMm(parseDouble(findField(targetNode, "Cumulative Normal", "cumulative_normal"), 50.0))
                    .cumulativeDeparturePercent(cleanText(findField(targetNode, "Cumulative Departure Per", "cum_dep_per")))
                    .isStale(false)
                    .status("LIVE")
                    .build());

        } catch (Exception ex) {
            log.error("Failed to map IMD rainfall response: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Map IMD District Warnings JSON.
     */
    public Optional<ImdWarningDto> mapWarnings(JsonNode root, ImdCityMapping.CityMetadata cityMeta) {
        if (root == null || root.isEmpty()) return Optional.empty();

        JsonNode targetNode = null;
        if (root.isArray()) {
            for (JsonNode item : root) {
                String dist = textOrEmpty(findField(item, "District", "district", "SUBDIV"));
                if (dist.equalsIgnoreCase(cityMeta.getImdDistrict()) ||
                    dist.toLowerCase().contains(cityMeta.getImdDistrict().toLowerCase())) {
                    targetNode = item;
                    break;
                }
            }
            if (targetNode == null && root.size() > 0) targetNode = root.get(0);
        } else {
            targetNode = root;
        }

        if (targetNode == null) return Optional.empty();

        try {
            List<ImdWarningDto.DayWarning> dayList = new ArrayList<>();
            for (int i = 1; i <= 5; i++) {
                String color = cleanText(findField(targetNode, "day" + i + "_color", "Day" + i + "_Color"));
                String warning = cleanText(findField(targetNode, "day" + i + "_warning", "Day" + i + "_Warning", "day" + i + "_distribution"));
                if (color.isEmpty()) color = "#10b981";
                if (warning.isEmpty()) warning = "No Warning";
                dayList.add(ImdWarningDto.DayWarning.builder()
                        .dayNumber(i)
                        .date("Day " + i)
                        .warningColor(color)
                        .warningText(warning)
                        .rainfallDistribution(cleanText(findField(targetNode, "day" + i + "_distribution_percentage")))
                        .build());
            }

            return Optional.of(ImdWarningDto.builder()
                    .source("IMD")
                    .city(cityMeta.getCityName())
                    .district(cityMeta.getImdDistrict())
                    .state(cityMeta.getImdState())
                    .issueDate(cleanText(findField(targetNode, "date_obs", "Date", "issue_date")))
                    .fetchedAt(LocalDateTime.now().format(ISO_DT))
                    .dailyWarnings(dayList)
                    .isStale(false)
                    .status("LIVE")
                    .build());

        } catch (Exception ex) {
            log.error("Failed to map IMD warnings response: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private JsonNode findMatchingStation(JsonNode array, ImdCityMapping.CityMetadata cityMeta) {
        for (JsonNode item : array) {
            String stationId = textOrEmpty(findField(item, "ID", "StationId", "id"));
            String stationName = textOrEmpty(findField(item, "STATION", "station"));
            String district = textOrEmpty(findField(item, "DISTRICT", "district"));

            if (stationId.equalsIgnoreCase(cityMeta.getPrimaryStationId()) ||
                (cityMeta.getSecondaryStationId() != null && stationId.equalsIgnoreCase(cityMeta.getSecondaryStationId())) ||
                stationName.toLowerCase().contains(cityMeta.getCityName().toLowerCase()) ||
                district.equalsIgnoreCase(cityMeta.getImdDistrict())) {
                return item;
            }
        }
        return array.size() > 0 ? array.get(0) : null;
    }

    private JsonNode findField(JsonNode node, String... candidateNames) {
        if (node == null) return null;
        for (String name : candidateNames) {
            if (node.has(name)) return node.get(name);
        }
        return null;
    }

    private String textOrEmpty(JsonNode node) {
        return node == null ? "" : node.asText("").trim();
    }

    private String cleanText(JsonNode node) {
        if (node == null) return "";
        return node.asText("").replace("\r", "").replace("\n", "").trim();
    }

    private double parseDouble(JsonNode node, double defaultVal) {
        if (node == null) return defaultVal;
        try {
            String txt = node.asText("").replace("%", "").replace("\r", "").trim();
            return Double.parseDouble(txt);
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private int parseInt(JsonNode node, int defaultVal) {
        if (node == null) return defaultVal;
        try {
            return Integer.parseInt(node.asText("").trim());
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private String mapColorToSeverity(String color) {
        if (color == null) return "LOW";
        String c = color.toUpperCase();
        if (c.contains("RED") || c.contains("#FF0000") || c.contains("#EF4444")) return "SEVERE";
        if (c.contains("ORANGE") || c.contains("#FFA500") || c.contains("#F97316")) return "HIGH";
        if (c.contains("YELLOW") || c.contains("#FFFF00") || c.contains("#F59E0B")) return "MODERATE";
        return "LOW";
    }

    private String weatherCodeToCondition(int code) {
        return switch (code) {
            case 1 -> "Clear Sky";
            case 2 -> "Partly Cloudy";
            case 3 -> "Overcast";
            case 4 -> "Fog / Mist";
            case 5 -> "Light Rain";
            case 6 -> "Moderate Rain";
            case 7 -> "Heavy Rain";
            case 8 -> "Thunderstorm";
            default -> "Fair";
        };
    }
}
