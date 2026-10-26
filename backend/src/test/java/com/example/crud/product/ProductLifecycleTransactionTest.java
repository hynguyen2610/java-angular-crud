package com.example.crud.product;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@SpringBootTest
class ProductLifecycleTransactionTest {

    @Autowired
    private ProductService products;

    @MockBean
    private SimpMessagingTemplate messaging;

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void broadcastsExactlyOnceAfterTheCreateTransactionCommits() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin", null, List.of()));

        products.create(new ProductDto(null, "Lifecycle keyboard", null, BigDecimal.ONE, 1, null, false));

        verify(messaging).convertAndSend(org.mockito.ArgumentMatchers.eq("/topic/products"),
                argThat((ProductLifecycleEvent event) -> event.type().equals("product.created")
                        && event.product().name().equals("Lifecycle keyboard")
                        && event.actorUsername().equals("admin")));
    }
}
