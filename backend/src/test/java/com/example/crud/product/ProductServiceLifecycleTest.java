package com.example.crud.product;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class ProductServiceLifecycleTest {

    private final ProductRepository repository = org.mockito.Mockito.mock(ProductRepository.class);
    private final ApplicationEventPublisher events = org.mockito.Mockito.mock(ApplicationEventPublisher.class);
    private final ProductService service = new ProductService(repository, events);

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createsOneEventWithThePersistedProductAndAuthenticatedActor() {
        authenticatedAs("admin");
        var saved = org.mockito.Mockito.mock(Product.class);
        when(saved.getId()).thenReturn(42L);
        when(saved.getName()).thenReturn("Keyboard");
        when(repository.save(any(Product.class))).thenReturn(saved);

        service.create(input("Keyboard"));

        var captor = ArgumentCaptor.forClass(ProductLifecycleEvent.class);
        verify(events).publishEvent(captor.capture());
        var event = captor.getValue();
        org.assertj.core.api.Assertions.assertThat(event.type()).isEqualTo("product.created");
        org.assertj.core.api.Assertions.assertThat(event.product()).isEqualTo(new ProductLifecycleEvent.ProductRef(42L, "Keyboard"));
        org.assertj.core.api.Assertions.assertThat(event.actorUsername()).isEqualTo("admin");
    }

    @Test
    void doesNotPublishWhenPersistenceFails() {
        authenticatedAs("admin");
        when(repository.save(any(Product.class))).thenThrow(new IllegalStateException("database unavailable"));

        assertThatThrownBy(() -> service.create(input("Keyboard")))
                .isInstanceOf(IllegalStateException.class);

        verify(events, never()).publishEvent(any());
    }

    @Test
    void publishesAnUpdatedEventWithTheCommittedProductIdentity() {
        authenticatedAs("admin");
        Product existing = product(42L, "Keyboard");
        when(repository.findById(42L)).thenReturn(Optional.of(existing));

        service.update(42L, input("Mechanical keyboard"));

        var captor = ArgumentCaptor.forClass(ProductLifecycleEvent.class);
        verify(events).publishEvent(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().type()).isEqualTo("product.updated");
        org.assertj.core.api.Assertions.assertThat(captor.getValue().product())
                .isEqualTo(new ProductLifecycleEvent.ProductRef(42L, "Mechanical keyboard"));
    }

    @Test
    void capturesTheDeletedProductIdentityBeforeRemoval() {
        authenticatedAs("admin");
        Product existing = product(42L, "Keyboard");
        when(repository.findById(42L)).thenReturn(Optional.of(existing));

        service.delete(42L);

        var captor = ArgumentCaptor.forClass(ProductLifecycleEvent.class);
        verify(events).publishEvent(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().type()).isEqualTo("product.deleted");
        org.assertj.core.api.Assertions.assertThat(captor.getValue().product())
                .isEqualTo(new ProductLifecycleEvent.ProductRef(42L, "Keyboard"));
    }

    private void authenticatedAs(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null, List.of()));
    }

    private ProductDto input(String name) {
        return new ProductDto(null, name, null, BigDecimal.ONE, 1, null);
    }

    private Product product(Long id, String name) {
        Product product = new Product();
        product.setName(name);
        product.setPrice(BigDecimal.ONE);
        product.setQuantity(1);
        try {
            Field idField = Product.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(product, id);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
        return product;
    }
}
