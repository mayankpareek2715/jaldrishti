package com.jaldrishti.controller;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@RestController
public class MediaController {

    private static final String UPLOAD_DIR = "uploads/reports";
    private static final long MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
    private static final long MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB

    private static final Set<String> ALLOWED_IMAGE_EXTS = Set.of("jpg", "jpeg", "png", "webp", "gif");
    private static final Set<String> ALLOWED_VIDEO_EXTS = Set.of("mp4", "webm", "mov", "ogg");
    private static final Set<String> DANGEROUS_EXTS = Set.of("exe", "bat", "sh", "cmd", "jar", "bin", "php", "js", "py", "scr", "msi");

    public MediaController() {
        File dir = new File(UPLOAD_DIR);
        if (!dir.exists()) {
            dir.mkdirs();
        }
    }

    @PostMapping(value = "/api/citizen-reports/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadMedia(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file uploaded or file is empty."));
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) originalFilename = "upload.bin";

        String ext = getFileExtension(originalFilename).toLowerCase();

        // 1. Rejection of dangerous executable files
        if (DANGEROUS_EXTS.contains(ext)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Executable and script files are not allowed for security reasons."));
        }

        boolean isImage = ALLOWED_IMAGE_EXTS.contains(ext);
        boolean isVideo = ALLOWED_VIDEO_EXTS.contains(ext);

        if (!isImage && !isVideo) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Unsupported media format. Allowed: JPG, PNG, WEBP, GIF, MP4, WEBM, MOV."));
        }

        // 2. Size validation
        long maxAllowed = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        if (file.getSize() > maxAllowed) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "File size exceeds limit (" + (maxAllowed / (1024 * 1024)) + " MB)."));
        }

        // 3. Save to disk
        String uniqueName = "report_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + "." + ext;
        Path targetPath = Paths.get(UPLOAD_DIR, uniqueName);

        try {
            Files.write(targetPath, file.getBytes());
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to save file: " + e.getMessage()));
        }

        String url = "/api/media/" + uniqueName;
        return ResponseEntity.ok(Map.of(
                "url", url,
                "filename", uniqueName,
                "mediaType", isVideo ? "video" : "image",
                "sizeBytes", file.getSize()
        ));
    }

    @GetMapping("/api/media/{filename:.+}")
    public ResponseEntity<Resource> serveMedia(@PathVariable("filename") String filename) {
        // Prevent path traversal
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            return ResponseEntity.badRequest().build();
        }

        Path path = Paths.get(UPLOAD_DIR, filename);
        File file = path.toFile();

        if (!file.exists() || !file.isFile()) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(file);
        MediaType mediaType = determineMediaType(filename);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getName() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .contentType(mediaType)
                .contentLength(file.length())
                .body(resource);
    }

    private String getFileExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(dot + 1) : "";
    }

    private MediaType determineMediaType(String filename) {
        String ext = getFileExtension(filename).toLowerCase();
        switch (ext) {
            case "jpg":
            case "jpeg":
                return MediaType.IMAGE_JPEG;
            case "png":
                return MediaType.IMAGE_PNG;
            case "webp":
                return MediaType.parseMediaType("image/webp");
            case "gif":
                return MediaType.IMAGE_GIF;
            case "mp4":
                return MediaType.parseMediaType("video/mp4");
            case "webm":
                return MediaType.parseMediaType("video/webm");
            case "mov":
                return MediaType.parseMediaType("video/quicktime");
            default:
                return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
