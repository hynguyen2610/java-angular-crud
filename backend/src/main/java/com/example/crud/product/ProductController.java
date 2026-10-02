package com.example.crud.product;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<ProductDto> list(@RequestParam(required = false) String q,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "5") int size) {
        return service.list(q, page, size);
    }

    @GetMapping("/{id}")
    public ProductDto get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductDto create(@Valid @RequestBody ProductDto dto) {
        return service.create(dto);
    }

    @PutMapping("/{id}")
    public ProductDto update(@PathVariable Long id, @Valid @RequestBody ProductDto dto) {
        return service.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
