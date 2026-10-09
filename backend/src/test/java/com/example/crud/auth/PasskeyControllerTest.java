package com.example.crud.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
class PasskeyControllerTest {

    private final MockMvc mvc;

    PasskeyControllerTest(MockMvc mvc) {
        this.mvc = mvc;
    }

    @Test
    void assertionOptionsDoesNotRevealWhetherAUsernameHasAPasskey() throws Exception {
        mvc.perform(post("/api/auth/passkey/assertion/options")
                        .contentType(APPLICATION_JSON)
                        .content("{\"username\":\"unknown\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void assertionOptionsRejectsBlankUsernameBeforeStartingACeremony() throws Exception {
        mvc.perform(post("/api/auth/passkey/assertion/options")
                        .contentType(APPLICATION_JSON)
                        .content("{\"username\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registrationOptionsRequiresAnAuthenticatedBearerToken() throws Exception {
        mvc.perform(post("/api/auth/passkey/registration/options")
                        .contentType(APPLICATION_JSON)
                        .content("{\"password\":\"admin123\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registrationOptionsExposesWebAuthnFieldsDirectlyInsidePublicKey() throws Exception {
        mvc.perform(post("/api/auth/passkey/registration/options")
                        .header("Authorization", "Bearer " + loginToken())
                        .contentType(APPLICATION_JSON)
                        .content("{\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publicKey.challenge").isString())
                .andExpect(jsonPath("$.publicKey.user.id").isString())
                .andExpect(jsonPath("$.publicKey.rp.id").value("localhost"))
                .andExpect(jsonPath("$.publicKey.publicKey").doesNotExist());
    }

    private String loginToken() throws Exception {
        String response = mvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return response.replaceAll(".*\\\"token\\\":\\\"([^\\\"]+).*", "$1");
    }
}
