package com.example.crud.product;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class ProductImageValidationException extends ResponseStatusException {

    ProductImageValidationException(String reason) {
        super(HttpStatus.BAD_REQUEST, reason);
    }
}
