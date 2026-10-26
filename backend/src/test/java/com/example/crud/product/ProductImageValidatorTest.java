package com.example.crud.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class ProductImageValidatorTest {

    private final ProductImageValidator validator = new ProductImageValidator();

    @Test
    void acceptsPngBytesRegardlessOfTheClientDeclaredContentType() {
        byte[] png = pngBytes();

        var image = validator.validate(png);

        assertThat(image.mediaType()).isEqualTo("image/png");
        assertThat(image.bytes()).isEqualTo(png);
    }

    @Test
    void rejectsSpoofedOrMalformedBytes() {
        assertThatThrownBy(() -> validator.validate("not an image".getBytes()))
                .isInstanceOf(ProductImageValidationException.class)
                .hasMessageContaining("JPEG, PNG, or WebP");
    }

    @Test
    void rejectsAnUploadAboveTheFiveMiBLimitBeforeImageDecoding() {
        assertThatThrownBy(() -> validator.validate(new byte[5 * 1024 * 1024 + 1]))
                .isInstanceOf(ProductImageValidationException.class)
                .hasMessageContaining("5 MiB");
    }

    private byte[] pngBytes() {
        try {
            var output = new ByteArrayOutputStream();
            ImageIO.write(new BufferedImage(1, 1, BufferedImage.TYPE_INT_ARGB), "png", output);
            return output.toByteArray();
        } catch (IOException e) {
            throw new AssertionError(e);
        }
    }
}
