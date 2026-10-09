package com.example.crud.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "passkey_credential")
class PasskeyCredential {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 100) private String username;
    @Column(nullable = false, unique = true, length = 1024) private byte[] credentialId;
    @Column(nullable = false, length = 64) private byte[] userHandle;
    @Column(nullable = false) private byte[] publicKeyCose;
    @Column(nullable = false) private long signatureCount;

    protected PasskeyCredential() { }

    PasskeyCredential(String username, byte[] credentialId, byte[] userHandle, byte[] publicKeyCose, long signatureCount) {
        this.username = username; this.credentialId = credentialId; this.userHandle = userHandle;
        this.publicKeyCose = publicKeyCose; this.signatureCount = signatureCount;
    }
    String username() { return username; }
    byte[] credentialId() { return credentialId; }
    byte[] userHandle() { return userHandle; }
    byte[] publicKeyCose() { return publicKeyCose; }
    long signatureCount() { return signatureCount; }
    void updateSignatureCount(long count) { signatureCount = count; }
    void renameUsername(String value) { username = value; }
}
