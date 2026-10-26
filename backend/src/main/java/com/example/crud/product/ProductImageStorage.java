package com.example.crud.product;

import java.util.Optional;

interface ProductImageStorage {
    void put(String key, byte[] bytes, String mediaType);
    /** Empty when the object does not exist; throws only when the store itself is unavailable. */
    Optional<byte[]> get(String key);
    void delete(String key);
}
