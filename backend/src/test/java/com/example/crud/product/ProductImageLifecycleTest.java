package com.example.crud.product;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Optional;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class ProductImageLifecycleTest {

    /** Runs cleanup inline so deletes are deterministic and cannot leak into the next test. */
    @TestConfiguration
    static class InlineCleanup {
        @Bean
        @Primary
        ProductImageCleaner inlineProductImageCleaner(ProductImageStorage storage) {
            return new ProductImageCleaner(storage, Runnable::run);
        }
    }

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProductRepository products;

    @MockBean
    private ProductImageStorage storage;

    @Test
    void replacingAnImageDeletesOnlyThePreviousObjectAfterCommit() throws Exception {
        String token = loginToken();
        long id = createProduct(token);

        upload(token, id).andExpect(status().isOk()).andExpect(jsonPath("$.hasImage").value(true));
        upload(token, id).andExpect(status().isOk());

        var keys = ArgumentCaptor.forClass(String.class);
        verify(storage, times(2)).put(keys.capture(), any(), eq("image/png"));
        verify(storage).delete(keys.getAllValues().get(0));
        verify(storage, never()).delete(keys.getAllValues().get(1));
    }

    @Test
    void anUnavailableStoreKeepsTheExistingImage() throws Exception {
        String token = loginToken();
        long id = createProduct(token);
        upload(token, id).andExpect(status().isOk());
        doThrow(new ProductImageStorageException()).when(storage).put(anyString(), any(), anyString());

        upload(token, id).andExpect(status().isServiceUnavailable());

        mvc.perform(get("/api/products/{id}", id).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.hasImage").value(true));
        verify(storage, never()).delete(anyString());
    }

    @Test
    void servesTheStoredMediaTypeWithoutTrustingTheObjectStore() throws Exception {
        String token = loginToken();
        long id = createProduct(token);
        upload(token, id).andExpect(status().isOk());
        when(storage.get(anyString())).thenReturn(Optional.of(pngBytes()));

        mvc.perform(get("/api/products/{id}/image", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG));
    }

    @Test
    void detectsTheMediaTypeWhenTheStoredOneIsMissing() throws Exception {
        String token = loginToken();
        long id = createProduct(token);
        upload(token, id).andExpect(status().isOk());
        Product product = products.findById(id).orElseThrow();
        product.setImageMediaType(null);
        products.save(product);
        when(storage.get(anyString())).thenReturn(Optional.of(pngBytes()));

        mvc.perform(get("/api/products/{id}/image", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG));
    }

    @Test
    void reportsAMissingObjectAsNotFoundRatherThanUnavailable() throws Exception {
        String token = loginToken();
        long id = createProduct(token);
        upload(token, id).andExpect(status().isOk());
        when(storage.get(anyString())).thenReturn(Optional.empty());

        mvc.perform(get("/api/products/{id}/image", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void removalCommitsEvenWhenObjectCleanupFails() throws Exception {
        String token = loginToken();
        long id = createProduct(token);
        upload(token, id).andExpect(status().isOk());
        doThrow(new ProductImageStorageException()).when(storage).delete(anyString());

        mvc.perform(delete("/api/products/{id}/image", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/products/{id}", id).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.hasImage").value(false));
    }

    @Test
    void deletingAProductDeletesItsImageObject() throws Exception {
        String token = loginToken();
        long id = createProduct(token);
        upload(token, id).andExpect(status().isOk());
        var key = ArgumentCaptor.forClass(String.class);
        verify(storage).put(key.capture(), any(), anyString());

        mvc.perform(delete("/api/products/{id}", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        verify(storage).delete(key.getValue());
    }

    private ResultActions upload(String token, long id) throws Exception {
        return mvc.perform(multipart(HttpMethod.PUT, "/api/products/{id}/image", id)
                .file(new MockMultipartFile("file", "desk.png", "image/png", pngBytes()))
                .header("Authorization", "Bearer " + token));
    }

    private long createProduct(String token) throws Exception {
        String created = mvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Desk\",\"price\":10,\"quantity\":1}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(created).get("id").asLong();
    }

    private String loginToken() throws Exception {
        String response = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
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
