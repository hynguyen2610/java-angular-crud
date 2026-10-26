package com.example.crud.product;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.errors.ErrorResponseException;
import java.io.ByteArrayInputStream;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.Callable;
import okhttp3.OkHttpClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Bounded MinIO calls: short timeouts plus a circuit breaker on the request path (put/get) so an outage
 * fails fast with 503. Missing objects and best-effort deletes do not count against the breaker.
 */
@Component
final class MinioProductImageStorage implements ProductImageStorage {
    private final MinioClient client;
    private final String bucket;
    private final CircuitBreaker breaker;

    MinioProductImageStorage(@Value("${app.minio.endpoint:http://localhost:9000}") String endpoint,
            @Value("${app.minio.access-key:local-minio-access-key}") String accessKey,
            @Value("${app.minio.secret-key:local-minio-secret-change-before-sharing}") String secretKey,
            @Value("${app.minio.bucket:product-images}") String bucket,
            @Value("${app.minio.connect-timeout:2s}") Duration connectTimeout,
            @Value("${app.minio.io-timeout:10s}") Duration ioTimeout,
            CircuitBreakerRegistry breakers) {
        var http = new OkHttpClient.Builder().connectTimeout(connectTimeout)
                .readTimeout(ioTimeout).writeTimeout(ioTimeout).build();
        this.client = MinioClient.builder().endpoint(endpoint).credentials(accessKey, secretKey).httpClient(http).build();
        this.bucket = bucket;
        this.breaker = breakers.circuitBreaker("productImageStorage");
    }

    @Override
    public void put(String key, byte[] bytes, String mediaType) {
        guarded(() -> client.putObject(PutObjectArgs.builder().bucket(bucket).object(key)
                .stream(new ByteArrayInputStream(bytes), bytes.length, -1).contentType(mediaType).build()));
    }

    @Override
    public Optional<byte[]> get(String key) {
        // A missing object returns normally inside the breaker, so it is recorded as a success.
        return guarded(() -> {
            try (var object = client.getObject(GetObjectArgs.builder().bucket(bucket).object(key).build())) {
                return Optional.of(object.readAllBytes());
            } catch (ErrorResponseException e) {
                if ("NoSuchKey".equals(e.errorResponse().code())) return Optional.empty();
                throw e;
            }
        });
    }

    @Override
    public void delete(String key) {
        try { client.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(key).build()); }
        catch (Exception e) { throw new ProductImageStorageException(e); }
    }

    private <T> T guarded(Callable<T> operation) {
        // Includes CallNotPermittedException while the breaker is open.
        try { return breaker.executeCallable(operation); }
        catch (Exception e) { throw new ProductImageStorageException(e); }
    }
}
