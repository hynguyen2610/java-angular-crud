package com.example.crud.product;

import static org.mockito.Mockito.verify;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

class ProductLifecycleBroadcasterTest {

    @Test
    void broadcastsCommittedLifecycleEventToAuthenticatedProductTopic() {
        var messaging = org.mockito.Mockito.mock(SimpMessagingTemplate.class);
        var event = new ProductLifecycleEvent("product.updated", new ProductLifecycleEvent.ProductRef(42L, "Keyboard"),
                "admin", Instant.parse("2026-10-07T10:00:00Z"));

        new ProductLifecycleBroadcaster(messaging).broadcast(event);

        verify(messaging).convertAndSend("/topic/products", event);
    }
}
