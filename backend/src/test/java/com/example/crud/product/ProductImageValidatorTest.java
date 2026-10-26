package com.example.crud.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.util.unit.DataSize;

class ProductImageValidatorTest {

    private final ProductImageValidator validator = new ProductImageValidator(DataSize.ofMegabytes(5));

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

    @Test
    void rejectsOversizedDimensionsFromTheHeaderBeforeDecodingPixels() throws IOException {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(8_001, 1, BufferedImage.TYPE_BYTE_BINARY), "png", output);

        assertThatThrownBy(() -> validator.validate(output.toByteArray()))
                .isInstanceOf(ProductImageValidationException.class)
                .hasMessageContaining("dimensions");
    }

    @Test
    void rejectsImagesAboveThePixelBudgetEvenWhenEachSideIsAllowed() throws IOException {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(5_000, 5_000, BufferedImage.TYPE_BYTE_BINARY), "png", output);

        assertThatThrownBy(() -> validator.validate(output.toByteArray()))
                .isInstanceOf(ProductImageValidationException.class)
                .hasMessageContaining("dimensions");
    }

    @Test
    void decodesWebpWithThePureJavaReader() {
        // Smallest valid lossless 1x1 WebP.
        byte[] webp = java.util.Base64.getDecoder().decode("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==");

        assertThat(validator.validate(webp).mediaType()).isEqualTo("image/webp");
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
