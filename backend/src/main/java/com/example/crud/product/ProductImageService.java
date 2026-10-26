package com.example.crud.product;

import com.example.crud.error.NotFoundException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
class ProductImageService {
    private final ProductRepository products;
    private final ProductImageValidator validator;
    private final ProductImageStorage storage;

    ProductImageService(ProductRepository products, ProductImageValidator validator, ProductImageStorage storage) {
        this.products = products; this.validator = validator; this.storage = storage;
    }

    @Transactional
    ProductDto replace(Long id, MultipartFile file) {
        Product product = find(id);
        try {
            var image = validator.validate(file.getBytes());
            String key = "products/" + UUID.randomUUID();
            storage.put(key, image.bytes(), image.mediaType());
            product.setImageKey(key);
            product.setImageMediaType(image.mediaType());
            return ProductDto.from(product);
        } catch (ProductImageValidationException | ProductImageStorageException e) { throw e; }
        catch (Exception e) { throw new ProductImageValidationException("Image bytes could not be read"); }
    }

    ProductImageStorage.StoredProductImage get(Long id) {
        Product product = find(id);
        if (product.getImageKey() == null) throw new NotFoundException("Product image not found");
        return storage.get(product.getImageKey());
    }

    @Transactional
    void remove(Long id) {
        Product product = find(id);
        String key = product.getImageKey();
        if (key == null) throw new NotFoundException("Product image not found");
        product.setImageKey(null);
        product.setImageMediaType(null);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { storage.delete(key); }
        });
    }

    private Product find(Long id) { return products.findById(id).orElseThrow(() -> new NotFoundException("Product " + id + " not found")); }
}
