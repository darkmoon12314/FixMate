
package com.fixmate.backend.service;

import com.fixmate.backend.entity.SystemDiagnostic;
import com.fixmate.backend.repository.SystemDiagnosticRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class SystemDiagnosticService {

    private final SystemDiagnosticRepository repository;

    public SystemDiagnosticService(
            SystemDiagnosticRepository repository) {
        this.repository = repository;
    }

    public SystemDiagnostic saveReport(
            Long userId, String reportJson) {

        SystemDiagnostic diagnostic = new SystemDiagnostic();

        diagnostic.setUserId(userId);
        diagnostic.setReportJson(reportJson);

        return repository.save(diagnostic);
    }

    public Optional<SystemDiagnostic> getLatestReport(
            Long userId) {

        return repository
                .findFirstByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<SystemDiagnostic> getReportHistory(
            Long userId) {

        return repository
                .findByUserIdOrderByCreatedAtDesc(userId);
    }
}
