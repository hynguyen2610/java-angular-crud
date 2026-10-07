package com.example.crud.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;

class StompJwtChannelInterceptorTest {

    @Test
    void rejectsConnectWithoutABearerToken() {
        var interceptor = new StompJwtChannelInterceptor(org.mockito.Mockito.mock(JwtService.class));
        var accessor = StompHeaderAccessor.create(StompCommand.CONNECT);

        assertThatThrownBy(() -> interceptor.preSend(MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()), null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void rejectsSubscriptionsWithoutAnAuthenticatedConnect() {
        var interceptor = new StompJwtChannelInterceptor(org.mockito.Mockito.mock(JwtService.class));
        var accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);

        assertThatThrownBy(() -> interceptor.preSend(MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()), null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void acceptsConnectWithAValidJwt() {
        var jwt = org.mockito.Mockito.mock(JwtService.class);
        when(jwt.validateAndGetUsername("valid-token")).thenReturn(Optional.of("admin"));
        var accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer valid-token");

        var message = new StompJwtChannelInterceptor(jwt).preSend(
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()), null);

        assertThat(StompHeaderAccessor.wrap(message).getUser().getName()).isEqualTo("admin");
    }

    @Test
    void rejectsClientPublishedLifecycleEvents() {
        var interceptor = new StompJwtChannelInterceptor(org.mockito.Mockito.mock(JwtService.class));
        var accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setDestination("/topic/products");

        assertThatThrownBy(() -> interceptor.preSend(
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()), null))
                .isInstanceOf(AccessDeniedException.class);
    }
}
