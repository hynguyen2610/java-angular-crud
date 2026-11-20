package com.example.crud.db;

import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;

/**
 * Builds the Hikari pool with the database password read from AWS Secrets Manager.
 *
 * <p>Active only when {@code app.datasource.password-secret-id} is set; otherwise Spring Boot's
 * own DataSource (password from {@code spring.datasource.password}) is used. URL, username and
 * {@code spring.datasource.hikari.*} settings still come from the usual properties.
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "app.datasource", name = "password-secret-id")
public class SecretsManagerDataSourceConfiguration {

    private static final Logger log = LoggerFactory.getLogger(SecretsManagerDataSourceConfiguration.class);

    /** Region and credentials come from the SDK's default chain (AWS_REGION, AWS_ACCESS_KEY_ID, ...). */
    @Bean(destroyMethod = "close")
    @ConditionalOnMissingBean
    SecretsManagerClient secretsManagerClient(@Value("${app.aws.secretsmanager.endpoint:}") String endpoint) {
        var builder = SecretsManagerClient.builder();
        if (StringUtils.hasText(endpoint)) {
            builder.endpointOverride(URI.create(endpoint));
        }
        return builder.build();
    }

    @Bean
    @ConfigurationProperties("spring.datasource.hikari")
    HikariDataSource dataSource(DataSourceProperties properties,
                                SecretsManagerClient secretsManager,
                                @Value("${app.datasource.password-secret-id}") String secretId) {
        String password = secretsManager.getSecretValue(r -> r.secretId(secretId)).secretString();
        if (!StringUtils.hasText(password)) {
            throw new IllegalStateException("Secret '" + secretId + "' has no SecretString with the database password");
        }
        log.info("Using database password from Secrets Manager secret '{}'", secretId);
        return properties.initializeDataSourceBuilder()
                .type(HikariDataSource.class)
                .password(password)
                .build();
    }
}
