package com.example.crud.product;

import com.example.crud.error.NotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository repo;

    public ProductService(ProductRepository repo) {
        this.repo = repo;
    }

    public PageResponse<ProductDto> list(String q, int page, int size) {
        var pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50),
                Sort.by("id").descending());
        Page<Product> result = (q == null || q.isBlank())
                ? repo.findAll(pageable)
                : repo.findByNameContainingIgnoreCase(q.trim(), pageable);
        return PageResponse.from(result.map(ProductDto::from));
    }

    public ProductDto get(Long id) {
        return ProductDto.from(find(id));
    }

    @Transactional
    public ProductDto create(ProductDto dto) {
        Product p = new Product();
        apply(p, dto);
        return ProductDto.from(repo.save(p));
    }

    @Transactional
    public ProductDto update(Long id, ProductDto dto) {
        Product p = find(id);
        apply(p, dto);
        return ProductDto.from(p); // dirty checking saves it on commit
    }

    @Transactional
    public void delete(Long id) {
        repo.delete(find(id));
    }

    private Product find(Long id) {
        return repo.findById(id).orElseThrow(() -> new NotFoundException("Product " + id + " not found"));
    }

    private void apply(Product p, ProductDto dto) {
        p.setName(dto.name().trim());
        p.setDescription(dto.description());
        p.setPrice(dto.price());
        p.setQuantity(dto.quantity());
    }
}
