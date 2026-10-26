package com.example.crud.error;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.example.crud.auth.UsernameAlreadyUsedException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.util.unit.DataSize;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private final DataSize maxUploadSize;

    public GlobalExceptionHandler(@Value("${spring.servlet.multipart.max-file-size}") DataSize maxUploadSize) {
        this.maxUploadSize = maxUploadSize;
    }

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

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiError> uploadTooLarge(MaxUploadSizeExceededException e) {
        return ResponseEntity.status(413).body(new ApiError(413,
                "Upload must be " + maxUploadSize.toMegabytes() + " MiB or smaller", Map.of()));
    }

    @ExceptionHandler(UsernameAlreadyUsedException.class)
    ResponseEntity<ApiError> usernameAlreadyUsed(UsernameAlreadyUsedException e) {
        return ResponseEntity.status(409).body(new ApiError(409, e.getMessage(),
                Map.of("username", e.getMessage())));
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
