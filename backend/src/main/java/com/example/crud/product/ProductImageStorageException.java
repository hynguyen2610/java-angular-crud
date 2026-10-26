package com.example.crud.product;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class ProductImageStorageException extends ResponseStatusException {
    ProductImageStorageException() { super(HttpStatus.SERVICE_UNAVAILABLE, "Product image storage is temporarily unavailable"); }
    ProductImageStorageException(Throwable cause) { super(HttpStatus.SERVICE_UNAVAILABLE, "Product image storage is temporarily unavailable", cause); }
}
