package com.example.crud.product;

import com.example.crud.error.NotFoundException;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
class ProductImageService {
    private static final Logger logger = LoggerFactory.getLogger(ProductImageService.class);

    private final ProductRepository products;
    private final ProductImageValidator validator;
    private final ProductImageStorage storage;
    private final ProductImageCleaner cleaner;

    private final TransactionTemplate transactions;

    ProductImageService(ProductRepository products, ProductImageValidator validator, ProductImageStorage storage,
            ProductImageCleaner cleaner, PlatformTransactionManager transactionManager) {
        this.products = products; this.validator = validator; this.storage = storage; this.cleaner = cleaner;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    /**
     * Uploads with no transaction open, so a slow store holds neither the row lock nor a pooled connection;
     * only the short lock-and-update step below is transactional.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    ProductDto replace(Long id, MultipartFile file) {
        if (!products.existsById(id)) throw notFound(id);
        var image = validator.validate(read(file));
        String key = "products/" + UUID.randomUUID();
        storage.put(key, image.bytes(), image.mediaType());

        var cleanup = new ReplaceCleanup(key);
        try {
            return transactions.execute(status -> {
                TransactionSynchronizationManager.registerSynchronization(cleanup);
                cleanup.registered = true;
                Product product = findForUpdate(id);
                cleanup.previousKey = product.getImageKey();
                product.setImageKey(key);
                product.setImageMediaType(image.mediaType());
                return ProductDto.from(product);
            });
        } catch (RuntimeException e) {
            // The transaction never started (e.g. no connection), so no synchronization will clean up.
            if (!cleanup.registered) cleaner.delete(key);
            throw e;
        }
    }

    /** Runs outside a transaction so no database connection is held while bytes are downloaded. */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    ProductImage get(Long id) {
        Product product = products.findById(id).orElseThrow(() -> notFound(id));
        if (product.getImageKey() == null) throw new NotFoundException("Product image not found");
        byte[] bytes = storage.get(product.getImageKey())
                .orElseThrow(() -> new NotFoundException("Product image not found"));
        String mediaType = product.getImageMediaType() != null ? product.getImageMediaType() : validator.detectMediaType(bytes);
        return new ProductImage(bytes, mediaType != null ? mediaType : "application/octet-stream");
    }

    @Transactional
    void remove(Long id) {
        Product product = findForUpdate(id);
        String key = product.getImageKey();
        if (key == null) throw new NotFoundException("Product image not found");
        product.setImageKey(null);
        product.setImageMediaType(null);
        deleteAfterCommit(key);
    }

    /** Object cleanup never fails or delays the committed product change. */
    void deleteAfterCommit(String key) {
        if (key == null) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { cleaner.delete(key); }
        });
    }

    /** Keeps exactly one object per product: the old one goes on commit, the new one only on a confirmed rollback. */
    private final class ReplaceCleanup implements TransactionSynchronization {
        private final String newKey;
        private String previousKey;
        private boolean registered;

        ReplaceCleanup(String newKey) { this.newKey = newKey; }

        @Override
        public void afterCompletion(int status) {
            if (status == STATUS_COMMITTED) cleaner.delete(previousKey);
            else if (status == STATUS_ROLLED_BACK) cleaner.delete(newKey);
            // Unknown includes some commit failures that did roll back; the row may reference either
            // object, so keep both rather than risk deleting the live one.
            else logger.warn("Unknown outcome replacing product image; keeping objects {} and {}", previousKey, newKey);
        }
    }

    private byte[] read(MultipartFile file) {
        try { return file.getBytes(); }
        catch (IOException e) { throw new ProductImageValidationException("Image bytes could not be read"); }
    }

    private Product findForUpdate(Long id) { return products.findByIdForUpdate(id).orElseThrow(() -> notFound(id)); }

    private static NotFoundException notFound(Long id) { return new NotFoundException("Product " + id + " not found"); }

    record ProductImage(byte[] bytes, String mediaType) {}
}
