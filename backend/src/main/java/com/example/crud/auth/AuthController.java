package com.example.crud.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    public record LoginResponse(String token, String username) {}

    private final AuthenticationManager authManager;
    private final JwtService jwt;

    public AuthController(AuthenticationManager authManager, JwtService jwt) {
        this.authManager = authManager;
        this.jwt = jwt;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        try {
            authManager.authenticate(new UsernamePasswordAuthenticationToken(req.username(), req.password()));
        } catch (AuthenticationException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }
        return new LoginResponse(jwt.generate(req.username()), req.username());
    }
}
