package com.example.crud.auth;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yubico.webauthn.AssertionRequest;
import com.yubico.webauthn.CredentialRepository;
import com.yubico.webauthn.FinishAssertionOptions;
import com.yubico.webauthn.FinishRegistrationOptions;
import com.yubico.webauthn.RegisteredCredential;
import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.StartAssertionOptions;
import com.yubico.webauthn.StartRegistrationOptions;
import com.yubico.webauthn.data.AuthenticatorAttachment;
import com.yubico.webauthn.data.AuthenticatorSelectionCriteria;
import com.yubico.webauthn.data.ByteArray;
import com.yubico.webauthn.data.PublicKeyCredential;
import com.yubico.webauthn.data.PublicKeyCredentialDescriptor;
import com.yubico.webauthn.data.RelyingPartyIdentity;
import com.yubico.webauthn.data.UserIdentity;
import com.yubico.webauthn.data.UserVerificationRequirement;
import jakarta.transaction.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
class PasskeyService implements CredentialRepository {
    private static final long CEREMONY_TIMEOUT_MS = 300_000L;
    private final PasskeyCredentialRepository credentials;
    private final AuthenticationManager authenticationManager;
    private final ObjectMapper json;
    private final RelyingParty relyingParty;
    private final Map<String, Ceremony> ceremonies = new ConcurrentHashMap<>();

    PasskeyService(PasskeyCredentialRepository credentials, AuthenticationManager authenticationManager, ObjectMapper json,
            @Value("${app.webauthn.rp-id:localhost}") String rpId,
            @Value("${app.webauthn.origins:http://localhost:4200}") Set<String> origins) {
        this.credentials = credentials; this.authenticationManager = authenticationManager; this.json = json;
        this.relyingParty = RelyingParty.builder()
                .identity(RelyingPartyIdentity.builder().id(rpId).name("Product Manager").build())
                .credentialRepository(this).origins(origins).allowUntrustedAttestation(true).build();
    }

    CeremonyOptions registrationOptions(String username, String password) {
        authenticatePassword(username, password);
        if (credentials.findByUsername(username).isPresent()) throw conflict();
        var user = UserIdentity.builder().name(username).displayName(username).id(userHandle(username)).build();
        var selection = AuthenticatorSelectionCriteria.builder().authenticatorAttachment(AuthenticatorAttachment.PLATFORM)
                .userVerification(UserVerificationRequirement.REQUIRED).build();
        var request = relyingParty.startRegistration(StartRegistrationOptions.builder().user(user)
                .authenticatorSelection(selection).timeout(CEREMONY_TIMEOUT_MS).build());
        return saveCeremony(username, request, null);
    }

    @Transactional
    void finishRegistration(String username, String ceremonyId, String responseJson) {
        Ceremony ceremony = take(ceremonyId, username, true);
        if (credentials.findByUsername(username).isPresent()) throw conflict();
        try {
            var response = PublicKeyCredential.parseRegistrationResponseJson(responseJson);
            var result = relyingParty.finishRegistration(FinishRegistrationOptions.builder()
                    .request(ceremony.registration()).response(response).build());
            if (!result.isUserVerified()) throw badRequest();
            credentials.save(new PasskeyCredential(username, result.getKeyId().getId().getBytes(), userHandle(username).getBytes(),
                    result.getPublicKeyCose().getBytes(), result.getSignatureCount()));
        } catch (Exception exception) { throw badRequest(); }
    }

    CeremonyOptions assertionOptions(String username) {
        if (credentials.findByUsername(username).isEmpty()) throw badRequest();
        var request = relyingParty.startAssertion(StartAssertionOptions.builder().username(username)
                .userVerification(UserVerificationRequirement.REQUIRED).timeout(CEREMONY_TIMEOUT_MS).build());
        return saveCeremony(username, null, request);
    }

    @Transactional
    void renameUsername(String oldUsername, String newUsername) {
        if (!oldUsername.equals(newUsername)) {
            credentials.findByUsername(oldUsername).ifPresent(credential -> credential.renameUsername(newUsername));
        }
    }

    @Transactional
    String finishAssertion(String username, String ceremonyId, String responseJson) {
        Ceremony ceremony = take(ceremonyId, username, false);
        try {
            var response = PublicKeyCredential.parseAssertionResponseJson(responseJson);
            var result = relyingParty.finishAssertion(FinishAssertionOptions.builder()
                    .request(ceremony.assertion()).response(response).build());
            if (!result.isSuccess() || !result.isUserVerified() || !username.equals(result.getUsername())) throw unauthorized();
            credentials.findByUsername(username).ifPresent(c -> c.updateSignatureCount(result.getSignatureCount()));
            return username;
        } catch (ResponseStatusException exception) { throw exception;
        } catch (Exception exception) { throw unauthorized(); }
    }

    private CeremonyOptions saveCeremony(String username, com.yubico.webauthn.data.PublicKeyCredentialCreationOptions registration,
            AssertionRequest assertion) {
        try {
            String id = UUID.randomUUID().toString();
            ceremonies.put(id, new Ceremony(username, Instant.now().plusMillis(CEREMONY_TIMEOUT_MS), registration, assertion));
            JsonNode envelope = json.readTree(registration != null ? registration.toCredentialsCreateJson() : assertion.toCredentialsGetJson());
            JsonNode options = envelope.get("publicKey");
            if (options == null || !options.isObject()) throw new IllegalStateException("Passkey options are missing publicKey");
            return new CeremonyOptions(id, options);
        } catch (JsonProcessingException exception) { throw new IllegalStateException("Could not create passkey options", exception); }
    }

    private Ceremony take(String id, String username, boolean registration) {
        Ceremony ceremony = ceremonies.remove(id);
        if (ceremony == null || !ceremony.username().equals(username) || ceremony.expiresAt().isBefore(Instant.now())
                || (registration && ceremony.registration() == null) || (!registration && ceremony.assertion() == null)) throw badRequest();
        return ceremony;
    }
    private void authenticatePassword(String username, String password) {
        try { authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password)); }
        catch (AuthenticationException e) { throw unauthorized(); }
    }
    private ByteArray userHandle(String username) {
        try { return new ByteArray(MessageDigest.getInstance("SHA-256").digest(username.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    private ResponseStatusException badRequest() { return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passkey request could not be completed"); }
    private ResponseStatusException unauthorized() { return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Passkey verification failed"); }
    private ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT, "A passkey is already registered"); }

    @Override public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username) {
        return credentials.findByUsername(username).map(c -> Set.of(PublicKeyCredentialDescriptor.builder().id(new ByteArray(c.credentialId())).build())).orElse(Set.of()); }
    @Override public Optional<ByteArray> getUserHandleForUsername(String username) { return credentials.findByUsername(username).map(c -> new ByteArray(c.userHandle())); }
    @Override public Optional<String> getUsernameForUserHandle(ByteArray handle) { return credentials.findAll().stream().filter(c -> java.util.Arrays.equals(c.userHandle(), handle.getBytes())).map(PasskeyCredential::username).findFirst(); }
    @Override public Optional<RegisteredCredential> lookup(ByteArray credentialId, ByteArray userHandle) { return credentials.findByCredentialId(credentialId.getBytes()).filter(c -> java.util.Arrays.equals(c.userHandle(), userHandle.getBytes())).map(this::registered); }
    @Override public Set<RegisteredCredential> lookupAll(ByteArray credentialId) { return credentials.findByCredentialId(credentialId.getBytes()).map(c -> Set.of(registered(c))).orElse(Set.of()); }
    private RegisteredCredential registered(PasskeyCredential c) { return RegisteredCredential.builder().credentialId(new ByteArray(c.credentialId())).userHandle(new ByteArray(c.userHandle())).publicKeyCose(new ByteArray(c.publicKeyCose())).signatureCount(c.signatureCount()).build(); }

    record CeremonyOptions(String ceremonyId, JsonNode publicKey) { }
    private record Ceremony(String username, Instant expiresAt, com.yubico.webauthn.data.PublicKeyCredentialCreationOptions registration, AssertionRequest assertion) { }
}
