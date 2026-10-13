package com.example.crud.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ProfileControllerTest {

    private final MockMvc mvc;
    private final ObjectMapper objectMapper;
    private final InMemoryUserDetailsManager users;
    private final PasskeyCredentialRepository passkeys;

    ProfileControllerTest(MockMvc mvc, ObjectMapper objectMapper, InMemoryUserDetailsManager users, PasskeyCredentialRepository passkeys) {
        this.mvc = mvc;
        this.objectMapper = objectMapper;
        this.users = users;
        this.passkeys = passkeys;
    }

    @Test
    void requiresAuthenticationToReadProfile() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void recordsLogoutForTheAuthenticatedUser() throws Exception {
        String token = loginToken("admin");

        mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void requiresAuthenticationToRecordLogout() throws Exception {
        mvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void readsAndUpdatesTheAuthenticatedDevProfileThenRequiresTheNewUsername() throws Exception {
        String token = loginToken("admin");

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"));

        mvc.perform(put("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"editor\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("editor"));

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"editor\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void movesThePasskeyToTheNewUsernameWhenTheProfileIsRenamed() throws Exception {
        passkeys.save(new PasskeyCredential("admin", new byte[] { 1 }, new byte[] { 2 }, new byte[] { 3 }, 0));
        String token = loginToken("admin");

        mvc.perform(put("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"editor\"}"))
                .andExpect(status().isOk());

        org.junit.jupiter.api.Assertions.assertTrue(passkeys.findByUsername("admin").isEmpty());
        org.junit.jupiter.api.Assertions.assertTrue(passkeys.findByUsername("editor").isPresent());
    }

    @Test
    void returnsStableValidationErrorsForInvalidUsername() throws Exception {
        String token = loginToken("admin");
        mvc.perform(put("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.username").value("Username is required"));
    }

    @Test
    void returnsConflictWhenTheUsernameAlreadyExists() throws Exception {
        users.createUser(User.withUsername("taken").password("{noop}not-used").roles("ADMIN").build());
        String token = loginToken("admin");

        mvc.perform(put("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"taken\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Username is already in use"))
                .andExpect(jsonPath("$.errors.username").value("Username is already in use"));
    }

    private String loginToken(String username) throws Exception {
        String response = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(response);
        return json.get("token").asText();
    }
}
