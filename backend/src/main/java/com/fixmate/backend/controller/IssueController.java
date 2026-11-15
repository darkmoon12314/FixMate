
package com.fixmate.backend.controller;

import com.fixmate.backend.entity.Issue;
import com.fixmate.backend.repository.IssueRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/issues")
@CrossOrigin(origins = "http://localhost:5173")
public class IssueController {

    private final IssueRepository issueRepository;

    public IssueController(IssueRepository issueRepository) {
        this.issueRepository = issueRepository;
    }

    private Long getAuthenticatedUserId() {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("User is not authenticated");
        }

        return Long.parseLong(authentication.getName());
    }

    @PostMapping
    public ResponseEntity<?> createIssue(@RequestBody Issue issue) {

        if (issue.getCategory() == null ||
                issue.getCategory().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Category is required"));
        }

        Set<String> allowedStatuses =
                Set.of("Open", "Pending", "Resolved");

        String status = issue.getStatus();

        if (status == null || !allowedStatuses.contains(status)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid issue status"));
        }

        issue.setUserId(getAuthenticatedUserId());

        Issue savedIssue = issueRepository.save(issue);

        return ResponseEntity.ok(savedIssue);
    }

    @GetMapping("/me")
    public ResponseEntity<List<Issue>> getMyIssues() {

        Long userId = getAuthenticatedUserId();

        List<Issue> issues =
                issueRepository.findByUserIdOrderByCreatedAtDesc(userId);

        return ResponseEntity.ok(issues);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteIssue(@PathVariable Long id) {

        Long userId = getAuthenticatedUserId();

        return issueRepository.findById(id)
                .filter(issue -> userId.equals(issue.getUserId()))
                .map(issue -> {
                    issueRepository.delete(issue);
                    return ResponseEntity.noContent().build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
