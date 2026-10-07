package com.example.crud.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    public record LoginResponse(String token, String username) {}

    public record ProfileRequest(
            @NotBlank(message = "Username is required")
            @Size(max = 100, message = "Username must be at most 100 characters") String username) {}

    public record ProfileResponse(String username) {}

    private final AuthenticationManager authManager;
    private final JwtService jwt;
    private final ProfileService profiles;

    public AuthController(AuthenticationManager authManager, JwtService jwt, ProfileService profiles) {
        this.authManager = authManager;
        this.jwt = jwt;
        this.profiles = profiles;
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

    @GetMapping("/me")
    public ProfileResponse profile(Authentication authentication) {
        return response(profiles.profile(authentication.getName()));
    }

    @PutMapping("/me")
    public ProfileResponse updateProfile(Authentication authentication, @Valid @RequestBody ProfileRequest request) {
        return response(profiles.updateUsername(authentication.getName(), request.username()));
    }

    private ProfileResponse response(ProfileService.Profile profile) {
        return new ProfileResponse(profile.username());
    }
}
