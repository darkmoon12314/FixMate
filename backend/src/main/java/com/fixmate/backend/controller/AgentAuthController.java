
package com.fixmate.backend.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/agent")
public class AgentAuthController {

    @GetMapping("/verify")
    public Map<String, Object> verifyAgentAccess(
            Authentication authentication
    ) {
        return Map.of(
                "authenticated", true,
                "userId", authentication.getName(),
                "message", "FixMate user authenticated successfully"
        );
    }
}
