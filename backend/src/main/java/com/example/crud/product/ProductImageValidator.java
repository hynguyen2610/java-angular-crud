package com.example.crud.product;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Component;

/** Validates decoded image bytes; a multipart content-type is not trusted. */
@Component
final class ProductImageValidator {

    static final int MAX_BYTES = 5 * 1024 * 1024;
    private static final int MAX_DIMENSION = 8_000;

    ValidatedProductImage validate(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new ProductImageValidationException("An image file is required");
        }
        if (bytes.length > MAX_BYTES) {
            throw new ProductImageValidationException("Image must be 5 MiB or smaller");
        }

        String mediaType = mediaType(bytes);
        BufferedImage decoded = decode(bytes);
        if (decoded.getWidth() > MAX_DIMENSION || decoded.getHeight() > MAX_DIMENSION) {
            throw new ProductImageValidationException("Image dimensions are too large");
        }
        return new ValidatedProductImage(bytes.clone(), mediaType);
    }

    private String mediaType(byte[] bytes) {
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
        throw new ProductImageValidationException("Only byte-verified JPEG, PNG, or WebP images are allowed");
    }

    private BufferedImage decode(byte[] bytes) {
        try {
            BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(bytes));
            if (decoded == null) {
                throw new ProductImageValidationException("Only byte-verified JPEG, PNG, or WebP images are allowed");
            }
            return decoded;
        } catch (IOException e) {
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
