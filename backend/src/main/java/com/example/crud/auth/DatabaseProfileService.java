package com.example.crud.auth;

import jakarta.transaction.Transactional;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@Profile("prod")
class DatabaseProfileService implements ProfileService {

    private final AppUserRepository users;
    private final PasskeyService passkeys;

    DatabaseProfileService(AppUserRepository users, PasskeyService passkeys) {
        this.users = users;
        this.passkeys = passkeys;
    }

    @Override
    public Profile profile(String authenticatedUsername) {
        return new Profile(findUser(authenticatedUsername).getUsername());
    }

    @Override
    @Transactional
    public Profile updateUsername(String authenticatedUsername, String username) {
        AppUser user = findUser(authenticatedUsername);
        if (!authenticatedUsername.equals(username) && users.existsByUsername(username)) {
            throw new UsernameAlreadyUsedException();
        }
        user.rename(username);
        passkeys.renameUsername(authenticatedUsername, username);
        return new Profile(user.getUsername());
    }

    private AppUser findUser(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Unknown user: " + username));
    }
}
