package com.example.crud.auth;

import org.springframework.context.annotation.Profile;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.stereotype.Service;

/** Profile changes live only for the dev process and are reset when it restarts. */
@Service
@Profile("dev")
class DevProfileService implements ProfileService {

    private final InMemoryUserDetailsManager users;

    DevProfileService(InMemoryUserDetailsManager users) {
        this.users = users;
    }

    @Override
    public Profile profile(String authenticatedUsername) {
        UserDetails user = users.loadUserByUsername(authenticatedUsername);
        return new Profile(user.getUsername());
    }

    @Override
    public Profile updateUsername(String authenticatedUsername, String username) {
        if (!authenticatedUsername.equals(username) && users.userExists(username)) {
            throw new UsernameAlreadyUsedException();
        }
        UserDetails existing = users.loadUserByUsername(authenticatedUsername);
        if (!authenticatedUsername.equals(username)) {
            users.deleteUser(authenticatedUsername);
            users.createUser(User.withUserDetails(existing).username(username).build());
        }
        return new Profile(username);
    }
}
