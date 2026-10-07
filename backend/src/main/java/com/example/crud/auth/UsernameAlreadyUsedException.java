package com.example.crud.auth;

public class UsernameAlreadyUsedException extends RuntimeException {

    public UsernameAlreadyUsedException() {
        super("Username is already in use");
    }
}
