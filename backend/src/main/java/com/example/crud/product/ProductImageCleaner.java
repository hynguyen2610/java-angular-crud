package com.example.crud.product;

import jakarta.annotation.PreDestroy;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Best-effort object deletion off the request thread. It never throws to the caller: it runs after commit,
 * so a failure (store down, queue full, shutting down) only leaves a logged orphan.
 */
@Component
class ProductImageCleaner {
    private static final Logger logger = LoggerFactory.getLogger(ProductImageCleaner.class);
    private static final int MAX_QUEUED = 1_000;
    private static final long SHUTDOWN_WAIT_SECONDS = 15;

    private final ProductImageStorage storage;
    private final Executor executor;

    @Autowired
    ProductImageCleaner(ProductImageStorage storage) {
        this(storage, new ThreadPoolExecutor(1, 1, 0, TimeUnit.MILLISECONDS,
                new LinkedBlockingQueue<>(MAX_QUEUED), runnable -> {
                    Thread thread = new Thread(runnable, "product-image-cleanup");
                    thread.setDaemon(true);
                    return thread;
                }));
    }

    ProductImageCleaner(ProductImageStorage storage, Executor executor) {
        this.storage = storage;
        this.executor = executor;
    }

    void delete(String key) {
        if (key == null) return;
        try {
            executor.execute(() -> {
                try { storage.delete(key); }
                catch (RuntimeException e) { logger.warn("Could not delete product image object {}", key, e); }
            });
        } catch (RejectedExecutionException e) {
            logger.warn("Product image cleanup unavailable; leaving object {}", key);
        }
    }

    /** Lets queued deletes finish (bounded by the store's timeouts) before the context closes. */
    @PreDestroy
    void shutdown() throws InterruptedException {
        if (!(executor instanceof ExecutorService service)) return;
        service.shutdown();
        if (!service.awaitTermination(SHUTDOWN_WAIT_SECONDS, TimeUnit.SECONDS)) {
            logger.warn("Product image cleanup stopped with {} deletes pending", service.shutdownNow().size());
        }
    }
}
