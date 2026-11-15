
package com.fixmate.backend.controller;

import com.fixmate.backend.entity.SystemDiagnostic;
import com.fixmate.backend.service.SystemDiagnosticService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/diagnostics")
@CrossOrigin(origins = "http://localhost:5173")
public class SystemDiagnosticController {

    private final SystemDiagnosticService service;

    public SystemDiagnosticController(
            SystemDiagnosticService service) {
        this.service = service;
    }

    private Long getAuthenticatedUserId() {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null ||
                !authentication.isAuthenticated()) {
            throw new IllegalStateException(
                    "User is not authenticated");
        }

        return Long.parseLong(authentication.getName());
    }

    @PostMapping
    public ResponseEntity<?> saveReport(
            @RequestBody Map<String, String> request) {

        String reportJson = request.get("reportJson");

        if (reportJson == null || reportJson.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message",
                            "Diagnostic report is required"));
        }

        SystemDiagnostic saved =
                service.saveReport(
                        getAuthenticatedUserId(),
                        reportJson);

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/latest")
    public ResponseEntity<?> getLatestReport() {

        Long userId = getAuthenticatedUserId();

        return service.getLatestReport(userId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/history")
    public ResponseEntity<List<SystemDiagnostic>> getHistory() {

        Long userId = getAuthenticatedUserId();

        return ResponseEntity.ok(
                service.getReportHistory(userId));
    }
}
