package com.example.crud.product;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Publishes product events only after their enclosing database transaction commits. */
@Component
public class ProductLifecycleBroadcaster {

    private final SimpMessagingTemplate messaging;

    public ProductLifecycleBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void broadcast(ProductLifecycleEvent event) {
        messaging.convertAndSend("/topic/products", event);
    }
}
