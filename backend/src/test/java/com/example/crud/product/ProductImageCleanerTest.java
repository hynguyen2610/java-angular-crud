package com.example.crud.product;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;

class ProductImageCleanerTest {

    private final ProductImageStorage storage = mock(ProductImageStorage.class);

    @Test
    void finishesQueuedDeletesBeforeShutdownCompletes() throws Exception {
        doAnswer(invocation -> { Thread.sleep(50); return null; }).when(storage).delete("products/a");
        var cleaner = new ProductImageCleaner(storage);

        cleaner.delete("products/a");
        cleaner.delete("products/b");
        cleaner.shutdown();

        verify(storage).delete("products/a");
        verify(storage).delete("products/b");
    }

    @Test
    void neverThrowsToTheCommittedRequestAfterShutdown() throws Exception {
        var cleaner = new ProductImageCleaner(storage);
        cleaner.shutdown();

        assertThatCode(() -> cleaner.delete("products/a")).doesNotThrowAnyException();
        verify(storage, never()).delete("products/a");
    }

    @Test
    void swallowsStorageFailures() {
        doThrow(new ProductImageStorageException()).when(storage).delete("products/a");
        var cleaner = new ProductImageCleaner(storage, Runnable::run);

        assertThatCode(() -> cleaner.delete("products/a")).doesNotThrowAnyException();
    }
}
