package com.example.crud.error;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<ApiError> notFound(NotFoundException e) {
        return ResponseEntity.status(404).body(new ApiError(404, e.getMessage(), Map.of()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> invalid(MethodArgumentNotValidException e) {
        Map<String, String> errors = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(f -> errors.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new ApiError(400, "Validation failed", errors));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiError> status(ResponseStatusException e) {
        int code = e.getStatusCode().value();
        return ResponseEntity.status(code).body(new ApiError(code, e.getReason(), Map.of()));
    }
}
