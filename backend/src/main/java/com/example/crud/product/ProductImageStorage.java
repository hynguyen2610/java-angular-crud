package com.example.crud.product;

interface ProductImageStorage {
    void put(String key, byte[] bytes, String mediaType);
    StoredProductImage get(String key);
    void delete(String key);

    record StoredProductImage(byte[] bytes, String mediaType) {}
}
