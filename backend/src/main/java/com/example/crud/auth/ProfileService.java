package com.example.crud.auth;

interface ProfileService {

    Profile profile(String authenticatedUsername);

    Profile updateUsername(String authenticatedUsername, String username);

    record Profile(String username) {
    }
}
