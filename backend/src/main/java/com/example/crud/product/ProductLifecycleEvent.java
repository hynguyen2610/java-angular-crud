package com.example.crud.product;

import java.time.Instant;

/** Immutable, versioned event emitted within a successful product transaction. */
public record ProductLifecycleEvent(String type, ProductRef product, String actorUsername, Instant occurredAt) {

    public record ProductRef(Long id, String name) { }

    static ProductLifecycleEvent now(String type, Long id, String name, String actorUsername) {
        return new ProductLifecycleEvent(type, new ProductRef(id, name), actorUsername, Instant.now());
    }
}
