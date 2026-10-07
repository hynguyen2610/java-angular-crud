package com.example.crud.auth;

import java.util.List;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

/** Authenticates a STOMP CONNECT frame because browser WebSocket handshakes cannot set Authorization. */
@Component
public class StompJwtChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwt;

    public StompJwtChannelInterceptor(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                throw new AccessDeniedException("A bearer token is required for STOMP CONNECT");
            }
            String username = jwt.validateAndGetUsername(header.substring(7))
                    .orElseThrow(() -> new AccessDeniedException("Invalid bearer token"));
            accessor.setUser(new UsernamePasswordAuthenticationToken(username, null,
                    List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        }
        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            if (accessor.getUser() == null) {
                throw new AccessDeniedException("Authentication is required for STOMP subscriptions");
            }
            if (!"/topic/products".equals(accessor.getDestination())) {
                throw new AccessDeniedException("Only the product topic may be subscribed to");
            }
        }
        if (StompCommand.SEND.equals(accessor.getCommand())) {
            throw new AccessDeniedException("Clients cannot publish product lifecycle events");
        }
        return MessageBuilder.createMessage(message.getPayload(), accessor.getMessageHeaders());
    }
}
