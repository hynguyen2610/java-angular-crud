package com.example.crud;

import com.example.crud.product.Product;
import com.example.crud.product.ProductRepository;
import java.math.BigDecimal;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class CrudApplication {

    public static void main(String[] args) {
        SpringApplication.run(CrudApplication.class, args);
    }

    /** Seeds 12 products so pagination and search are visible right away. */
    @Bean
    CommandLineRunner seed(ProductRepository repo) {
        return args -> {
            String[] names = {"Laptop", "Phone", "Tablet", "Monitor", "Keyboard", "Mouse",
                    "Headphones", "Webcam", "Speaker", "Charger", "Router", "Printer"};
            for (int i = 0; i < names.length; i++) {
                Product p = new Product();
                p.setName(names[i]);
                p.setDescription("Sample " + names[i].toLowerCase());
                p.setPrice(BigDecimal.valueOf(19.99 + i * 25));
                p.setQuantity(5 + i);
                repo.save(p);
            }
        };
    }
}
