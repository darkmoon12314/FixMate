
package com.fixmate.backend.controller;

import com.fixmate.backend.entity.User;
import com.fixmate.backend.service.UserService;
import com.fixmate.backend.service.JwtService;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final JwtService jwtService;

    public UserController(
            UserService userService,
            JwtService jwtService) {

        this.userService = userService;
        this.jwtService = jwtService;
    }

    // Register a new user
    @PostMapping
    public ResponseEntity<?> createUser(
            @Valid @RequestBody User user) {

        // Always assign the role on the server
        user.setRole("user");

        try {
            User savedUser = userService.saveUser(user);

            return ResponseEntity.ok(Map.of(
                    "id", savedUser.getId(),
                    "name", savedUser.getName(),
                    "email", savedUser.getEmail(),
                    "role", savedUser.getRole()
            ));

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(409)
                    .body(Map.of(
                            "message", ex.getMessage()
                    ));
        }
    }

    // Find a user by email
    @GetMapping("/email/{email}")
    public ResponseEntity<?> getUserByEmail(
            @PathVariable String email) {

        return userService.getUserByEmail(email)
                .<ResponseEntity<?>>map(user ->
                        ResponseEntity.ok(Map.of(
                                "id", user.getId(),
                                "name", user.getName(),
                                "email", user.getEmail(),
                                "role", user.getRole()
                        )))
                .orElse(ResponseEntity.notFound().build());
    }

    // Login and generate JWT token
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody Map<String, String> request) {

        String email = request.get("email");
        String password = request.get("password");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message", "Email is required"
                    ));
        }

        if (!email.matches(
                "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message", "Enter a valid email address"
                    ));
        }

        if (password == null || password.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message", "Password is required"
                    ));
        }

        return userService.getUserByEmail(email)
                .filter(user -> user.getPassword() != null)
                .filter(user -> userService.checkPassword(
                        password, user.getPassword()))
                .<ResponseEntity<?>>map(user -> {

                    String token = jwtService.generateToken(
                            user.getId(),
                            user.getEmail(),
                            user.getRole()
                    );

                    return ResponseEntity.ok(Map.of(
                            "message", "Login successful",
                            "id", user.getId(),
                            "name", user.getName(),
                            "email", user.getEmail(),
                            "role", user.getRole(),
                            "token", token
                    ));
                })
                .orElse(ResponseEntity.status(401)
                        .body(Map.of(
                                "message",
                                "Invalid email or password"
                        )));
    }

    // Handle registration validation errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        String message = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getDefaultMessage())
                .findFirst()
                .orElse("Invalid registration details");

        return ResponseEntity.badRequest()
                .body(Map.of("message", message));
    }

    // Handle duplicate email errors
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(
            IllegalArgumentException ex) {

        return ResponseEntity.status(409)
                .body(Map.of(
                        "message", ex.getMessage()
                ));
    }
}
