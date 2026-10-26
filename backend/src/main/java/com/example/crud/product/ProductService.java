package com.example.crud.product;

import com.example.crud.error.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository repo;
    private final ApplicationEventPublisher events;
    private final ProductImageService images;

    public ProductService(ProductRepository repo, ApplicationEventPublisher events, ProductImageService images) {
        this.repo = repo;
        this.events = events;
        this.images = images;
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
        Product saved = repo.save(p);
        publish("product.created", saved);
        return ProductDto.from(saved);
    }

    @Transactional
    public ProductDto update(Long id, ProductDto dto) {
        Product p = findForUpdate(id);
        apply(p, dto);
        publish("product.updated", p);
        return ProductDto.from(p); // dirty checking saves it on commit
    }

    @Transactional
    public void delete(Long id) {
        Product p = findForUpdate(id);
        repo.delete(p);
        images.deleteAfterCommit(p.getImageKey());
        publish("product.deleted", p);
    }

    private Product find(Long id) {
        return repo.findById(id).orElseThrow(() -> new NotFoundException("Product " + id + " not found"));
    }

    private Product findForUpdate(Long id) {
        return repo.findByIdForUpdate(id).orElseThrow(() -> new NotFoundException("Product " + id + " not found"));
    }

    private void apply(Product p, ProductDto dto) {
        p.setName(dto.name().trim());
        p.setDescription(dto.description());
        p.setPrice(dto.price());
        p.setQuantity(dto.quantity());
    }

    private void publish(String type, Product product) {
        String actorUsername = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication().getName();
        events.publishEvent(ProductLifecycleEvent.now(type, product.getId(), product.getName(), actorUsername));
    }
}
