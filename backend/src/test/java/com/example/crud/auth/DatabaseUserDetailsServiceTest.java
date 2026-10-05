package com.example.crud.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.lang.reflect.Proxy;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

class DatabaseUserDetailsServiceTest {

    @Test
    void loadsUsernamePasswordAndDatabaseRole() {
        var user = new AppUser("operator", "$2a$10$encoded-password", "ADMIN");
        var service = new DatabaseUserDetailsService(repositoryReturning(Optional.of(user)));

        var details = service.loadUserByUsername("operator");

        assertThat(details.getUsername()).isEqualTo("operator");
        assertThat(details.getPassword()).isEqualTo("$2a$10$encoded-password");
        assertThat(details.getAuthorities()).extracting("authority").containsExactly("ROLE_ADMIN");
    }

    @Test
    void rejectsAnUnknownUsername() {
        var service = new DatabaseUserDetailsService(repositoryReturning(Optional.empty()));

        assertThatThrownBy(() -> service.loadUserByUsername("missing"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("missing");
    }

    private AppUserRepository repositoryReturning(Optional<AppUser> user) {
        return (AppUserRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[] {AppUserRepository.class},
                (proxy, method, arguments) -> {
                    if (method.getName().equals("findByUsername")) {
                        return user;
                    }
                    if (method.getName().equals("toString")) {
                        return "AppUserRepository test double";
                    }
                    throw new UnsupportedOperationException(method.getName());
                });
    }
}
