
package com.fixmate.backend.repository;

import com.fixmate.backend.entity.Issue;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IssueRepository extends JpaRepository<Issue, Long> {

    List<Issue> findByUserIdOrderByCreatedAtDesc(Long userId);
}
