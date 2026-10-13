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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    public record LoginResponse(String token, String username) {}
    public record PasswordConfirmation(@NotBlank String password) {}
    public record UsernameRequest(@NotBlank String username) {}
    public record CeremonyResponse(@NotBlank String ceremonyId, @NotBlank String response) {}

    public record ProfileRequest(
            @NotBlank(message = "Username is required")
            @Size(max = 100, message = "Username must be at most 100 characters") String username) {}

    public record ProfileResponse(String username) {}

    private final AuthenticationManager authManager;
    private final JwtService jwt;
    private final ProfileService profiles;
    private final PasskeyService passkeys;

    public AuthController(AuthenticationManager authManager, JwtService jwt, ProfileService profiles, PasskeyService passkeys) {
        this.authManager = authManager;
        this.jwt = jwt;
        this.profiles = profiles;
        this.passkeys = passkeys;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        try {
            authManager.authenticate(new UsernamePasswordAuthenticationToken(req.username(), req.password()));
        } catch (AuthenticationException e) {
            logger.warn("Authentication sign-in failed for username={} method=password", req.username());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }
        logger.info("Authentication sign-in succeeded for username={} method=password", req.username());
        return new LoginResponse(jwt.generate(req.username()), req.username());
    }

    @PostMapping("/passkey/registration/options")
    public PasskeyService.CeremonyOptions registrationOptions(Authentication authentication,
            @Valid @RequestBody PasswordConfirmation request) {
        return passkeys.registrationOptions(authentication.getName(), request.password());
    }

    @PostMapping("/passkey/registration/verify")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verifyRegistration(Authentication authentication, @Valid @RequestBody CeremonyResponse request) {
        passkeys.finishRegistration(authentication.getName(), request.ceremonyId(), request.response());
    }

    @PostMapping("/passkey/assertion/options")
    public PasskeyService.CeremonyOptions assertionOptions(@Valid @RequestBody UsernameRequest request) {
        return passkeys.assertionOptions(request.username());
    }

    @PostMapping("/passkey/assertion/verify")
    public LoginResponse verifyAssertion(@RequestParam @NotBlank String username,
            @Valid @RequestBody CeremonyResponse request) {
        String verifiedUsername;
        try {
            verifiedUsername = passkeys.finishAssertion(username, request.ceremonyId(), request.response());
        } catch (RuntimeException e) {
            logger.warn("Authentication sign-in failed for username={} method=passkey", username);
            throw e;
        }
        logger.info("Authentication sign-in succeeded for username={} method=passkey", verifiedUsername);
        return new LoginResponse(jwt.generate(verifiedUsername), verifiedUsername);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(Authentication authentication) {
        logger.info("Authentication sign-out recorded for username={}", authentication.getName());
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
