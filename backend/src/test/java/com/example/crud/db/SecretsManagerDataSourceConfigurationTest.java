package com.example.crud.db;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.zaxxer.hikari.HikariDataSource;
import java.util.function.Consumer;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

class SecretsManagerDataSourceConfigurationTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(DataSourceAutoConfiguration.class))
            .withUserConfiguration(SecretsManagerDataSourceConfiguration.class)
            .withPropertyValues(
                    "spring.datasource.url=jdbc:h2:mem:secrets-test",
                    "spring.datasource.username=app",
                    "spring.datasource.password=from-properties",
                    "spring.datasource.hikari.maximum-pool-size=3");

    @Test
    @SuppressWarnings("unchecked")
    void passwordComesFromTheSecretAndHikariSettingsStillApply() {
        SecretsManagerClient client = mock(SecretsManagerClient.class);
        when(client.getSecretValue(any(Consumer.class))).thenAnswer(invocation -> {
            GetSecretValueRequest.Builder request = GetSecretValueRequest.builder();
            ((Consumer<GetSecretValueRequest.Builder>) invocation.getArgument(0)).accept(request);
            assertThat(request.build().secretId()).isEqualTo("product-manager/postgres");
            return GetSecretValueResponse.builder().secretString("from-secret").build();
        });

        runner.withBean(SecretsManagerClient.class, () -> client)
                .withPropertyValues("app.datasource.password-secret-id=product-manager/postgres")
                .run(context -> {
                    HikariDataSource dataSource = context.getBean(HikariDataSource.class);
                    assertThat(dataSource.getPassword()).isEqualTo("from-secret");
                    assertThat(dataSource.getUsername()).isEqualTo("app");
                    assertThat(dataSource.getJdbcUrl()).isEqualTo("jdbc:h2:mem:secrets-test");
                    assertThat(dataSource.getMaximumPoolSize()).isEqualTo(3);
                });
    }

    @Test
    @SuppressWarnings("unchecked")
    void startupFailsWhenTheSecretIsEmpty() {
        SecretsManagerClient client = mock(SecretsManagerClient.class);
        when(client.getSecretValue(any(Consumer.class)))
                .thenReturn(GetSecretValueResponse.builder().build());

        runner.withBean(SecretsManagerClient.class, () -> client)
                .withPropertyValues("app.datasource.password-secret-id=product-manager/postgres")
                .run(context -> assertThat(context).getFailure()
                        .hasRootCauseMessage("Secret 'product-manager/postgres' has no SecretString with the database password"));
    }

    @Test
    void withoutASecretIdTheBootDataSourceAndPropertyPasswordAreUsed() {
        runner.run(context -> {
            assertThat(context).doesNotHaveBean(SecretsManagerClient.class);
            assertThat(((HikariDataSource) context.getBean(DataSource.class)).getPassword())
                    .isEqualTo("from-properties");
        });
    }
}
