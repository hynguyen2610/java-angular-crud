package com.example.crud;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
class ActuatorExposureTest {

    private final MockMvc mvc;

    ActuatorExposureTest(MockMvc mvc) {
        this.mvc = mvc;
    }

    @ParameterizedTest
    @ValueSource(strings = {"/actuator/health", "/actuator/metrics", "/actuator/info", "/actuator/env", "/actuator/beans"})
    void exposesLocalDiagnosticEndpointsWithoutAuthentication(String endpoint) throws Exception {
        mvc.perform(get(endpoint)).andExpect(status().isOk());
    }

    @Test
    void redactsEnvironmentValues() throws Exception {
        var body = mvc.perform(get("/actuator/env"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(body).doesNotContain("change-me-change-me-change-me-change-me-1234");
    }
}
