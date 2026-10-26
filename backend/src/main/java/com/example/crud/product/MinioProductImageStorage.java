package com.example.crud.product;

import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import java.io.ByteArrayInputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
final class MinioProductImageStorage implements ProductImageStorage {
    private final MinioClient client;
    private final String bucket;

    MinioProductImageStorage(@Value("${app.minio.endpoint:http://localhost:9000}") String endpoint,
            @Value("${app.minio.access-key:local-minio-access-key}") String accessKey,
            @Value("${app.minio.secret-key:local-minio-secret-change-before-sharing}") String secretKey,
            @Value("${app.minio.bucket:product-images}") String bucket) {
        this.client = MinioClient.builder().endpoint(endpoint).credentials(accessKey, secretKey).build();
        this.bucket = bucket;
    }

    @Override
    public void put(String key, byte[] bytes, String mediaType) {
        try {
            client.putObject(PutObjectArgs.builder().bucket(bucket).object(key)
                    .stream(new ByteArrayInputStream(bytes), bytes.length, -1).contentType(mediaType).build());
        } catch (Exception e) { throw new ProductImageStorageException(e); }
    }

    @Override
    public StoredProductImage get(String key) {
        try (var object = client.getObject(GetObjectArgs.builder().bucket(bucket).object(key).build())) {
            return new StoredProductImage(object.readAllBytes(), object.headers().get("Content-Type"));
        } catch (Exception e) { throw new ProductImageStorageException(e); }
    }

    @Override
    public void delete(String key) {
        try { client.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(key).build()); }
        catch (Exception e) { throw new ProductImageStorageException(e); }
    }
}
