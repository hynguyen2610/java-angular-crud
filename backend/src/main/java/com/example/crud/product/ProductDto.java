package com.example.crud.product;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** What travels over HTTP. The Angular `Product` interface mirrors this record. */
public record ProductDto(
        Long id,
        @NotBlank(message = "Name is required") @Size(max = 100, message = "Max 100 characters") String name,
        @Size(max = 500, message = "Max 500 characters") String description,
        @NotNull(message = "Price is required") @DecimalMin(value = "0.0", message = "Must be >= 0") BigDecimal price,
        @NotNull(message = "Quantity is required") @Min(value = 0, message = "Must be >= 0") Integer quantity,
        LocalDateTime createdAt) {

    public static ProductDto from(Product p) {
        return new ProductDto(p.getId(), p.getName(), p.getDescription(),
                p.getPrice(), p.getQuantity(), p.getCreatedAt());
    }
}
