package com.spring.esign;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EsignApplication {

    public static void main(String[] args) {
        SpringApplication.run(EsignApplication.class, args);
    }
}
