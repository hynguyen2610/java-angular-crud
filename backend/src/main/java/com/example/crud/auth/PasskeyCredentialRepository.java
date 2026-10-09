package com.example.crud.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface PasskeyCredentialRepository extends JpaRepository<PasskeyCredential, Long> {
    Optional<PasskeyCredential> findByUsername(String username);
    Optional<PasskeyCredential> findByCredentialId(byte[] credentialId);
}
