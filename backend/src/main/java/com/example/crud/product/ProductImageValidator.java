package com.example.crud.product;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Iterator;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;

/** Validates decoded image bytes; a multipart content-type is not trusted. */
@Component
final class ProductImageValidator {

    private static final int MAX_DIMENSION = 8_000;
    /** Bounds the decoded raster to about 96 MB (4 bytes per pixel). */
    private static final long MAX_PIXELS = 24_000_000;

    private final DataSize maxSize;

    /** Shares the multipart file limit so the two size checks cannot drift apart. */
    ProductImageValidator(@Value("${spring.servlet.multipart.max-file-size}") DataSize maxSize) {
        this.maxSize = maxSize;
    }

    /** The caller hands over ownership of {@code bytes}; they are returned without copying. */
    ValidatedProductImage validate(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new ProductImageValidationException("An image file is required");
        }
        if (bytes.length > maxSize.toBytes()) {
            throw new ProductImageValidationException("Image must be " + maxSize.toMegabytes() + " MiB or smaller");
        }

        String mediaType = detectMediaType(bytes);
        if (mediaType == null) {
            throw new ProductImageValidationException("Only byte-verified JPEG, PNG, or WebP images are allowed");
        }
        decode(bytes);
        return new ValidatedProductImage(bytes, mediaType);
    }

    /** The media type implied by the leading bytes, or null when they are not JPEG, PNG, or WebP. */
    String detectMediaType(byte[] bytes) {
        if (startsWith(bytes, (byte) 0x89, (byte) 0x50, (byte) 0x4e, (byte) 0x47,
                (byte) 0x0d, (byte) 0x0a, (byte) 0x1a, (byte) 0x0a)) {
            return "image/png";
        }
        if (startsWith(bytes, (byte) 0xff, (byte) 0xd8, (byte) 0xff)) {
            return "image/jpeg";
        }
        if (startsWith(bytes, (byte) 'R', (byte) 'I', (byte) 'F', (byte) 'F')
                && bytes.length >= 12
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return "image/webp";
        }
        return null;
    }

    /** Checks header dimensions before decoding pixels, so a small file cannot claim a huge raster. */
    private void decode(byte[] bytes) {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = input == null ? null : ImageIO.getImageReaders(input);
            if (readers == null || !readers.hasNext()) {
                throw new ProductImageValidationException("Only byte-verified JPEG, PNG, or WebP images are allowed");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width > MAX_DIMENSION || height > MAX_DIMENSION || (long) width * height > MAX_PIXELS) {
                    throw new ProductImageValidationException("Image dimensions are too large");
                }
                reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (ProductImageValidationException e) {
            throw e;
        } catch (IOException | RuntimeException e) {
            throw new ProductImageValidationException("Image bytes could not be decoded");
        }
    }

    private boolean startsWith(byte[] bytes, byte... prefix) {
        if (bytes.length < prefix.length) {
            return false;
        }
        for (int index = 0; index < prefix.length; index++) {
            if (bytes[index] != prefix[index]) {
                return false;
            }
        }
        return true;
    }

    record ValidatedProductImage(byte[] bytes, String mediaType) {}
}
