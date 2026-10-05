package com.example.crud.error;

import com.fasterxml.jackson.databind.JsonMappingException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.converter.HttpMessageNotReadableException;
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

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> unreadable(HttpMessageNotReadableException e) {
        String field = fieldName(e);
        String message = field == null ? "Malformed JSON request" : title(field) + " must be a number";
        return ResponseEntity.badRequest().body(new ApiError(400, "Validation failed",
                Map.of(field == null ? "request" : field, message)));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiError> status(ResponseStatusException e) {
        int code = e.getStatusCode().value();
        return ResponseEntity.status(code).body(new ApiError(code, e.getReason(), Map.of()));
    }

    private String fieldName(HttpMessageNotReadableException e) {
        Throwable cause = e.getMostSpecificCause();
        if (cause instanceof JsonMappingException mapping && !mapping.getPath().isEmpty()) {
            return mapping.getPath().get(mapping.getPath().size() - 1).getFieldName();
        }
        return null;
    }

    private String title(String field) {
        return Character.toUpperCase(field.charAt(0)) + field.substring(1);
    }
}
