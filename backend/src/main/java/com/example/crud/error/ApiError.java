package com.example.crud.error;

import java.util.Map;

/** Every error response has this shape, so Angular can handle them uniformly. */
public record ApiError(int status, String message, Map<String, String> errors) {}
