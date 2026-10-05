package com.example.crud.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@Profile("prod")
class ProductionUserBootstrapConfiguration {

    @Bean
    CommandLineRunner bootstrapAdministrator(AppUserRepository users, PasswordEncoder encoder,
            @Value("${app.bootstrap-admin.username}") String username,
            @Value("${app.bootstrap-admin.password}") String password) {
        return args -> {
            if (users.findByUsername(username).isEmpty()) {
                users.save(new AppUser(username, encoder.encode(password), "ADMIN"));
            }
        };
    }
}
