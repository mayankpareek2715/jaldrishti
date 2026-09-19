package com.jaldrishti.provenance;

import java.util.List;

public record LocalityProvenanceReportDto(
        String localityId,
        String localityName,
        String ward,
        String city,
        String geographicUnitType,
        double centroidLat,
        double centroidLon,
        List<DataProvenanceDto> attributes
) {}
