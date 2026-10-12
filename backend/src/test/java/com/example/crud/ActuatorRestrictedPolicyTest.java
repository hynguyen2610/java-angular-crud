package com.example.crud;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "management.endpoints.web.exposure.include=health",
        "app.security.actuator-details-enabled=false"
})
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
class ActuatorRestrictedPolicyTest {

    private final MockMvc mvc;

    ActuatorRestrictedPolicyTest(MockMvc mvc) {
        this.mvc = mvc;
    }

    @Test
    void keepsDetailedActuatorEndpointsPrivateWhenTheDevPolicyIsDisabled() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mvc.perform(get("/actuator/metrics")).andExpect(status().isUnauthorized());
    }
}
