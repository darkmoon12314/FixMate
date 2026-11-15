
package com.fixmate.backend.repository;

import com.fixmate.backend.entity.SystemDiagnostic;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SystemDiagnosticRepository
        extends JpaRepository<SystemDiagnostic, Long> {

    Optional<SystemDiagnostic>
    findFirstByUserIdOrderByCreatedAtDesc(Long userId);

    List<SystemDiagnostic>
    findByUserIdOrderByCreatedAtDesc(Long userId);
}
