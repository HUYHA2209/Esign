package com.spring.esign.util;

import java.util.Hashtable;
import java.util.Set;
import javax.naming.NamingException;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;

import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class EmailDomainValidator {

    /**
     * Danh sách domain email tạm thời (disposable) bị chặn
     */
    private static final Set<String> BLOCKED_DOMAINS = Set.of(
            "mailinator.com",
            "guerrillamail.com",
            "guerrillamail.net",
            "tempmail.com",
            "yopmail.com",
            "throwaway.email",
            "10minutemail.com",
            "trashmail.com",
            "fakeinbox.com",
            "sharklasers.com",
            "guerrillamailblock.com",
            "grr.la",
            "dispostable.com",
            "maildrop.cc",
            "mailnesia.com",
            "temp-mail.org",
            "getnada.com",
            "mohmal.com",
            "emailondeck.com");

    /**
     * Kiểm tra email domain có hợp lệ không.
     * Trả về true nếu hợp lệ, false nếu không.
     */
    public boolean isValidEmailDomain(String email) {
        if (email == null || !email.contains("@")) {
            return false;
        }

        String domain =
                email.substring(email.lastIndexOf("@") + 1).toLowerCase().trim();

        // Check blocklist
        if (BLOCKED_DOMAINS.contains(domain)) {
            log.warn("Blocked disposable email domain: {}", domain);
            return false;
        }

        // Check MX record
        return hasMxRecord(domain);
    }

    /**
     * Kiểm tra domain có MX record (mail server) không
     */
    private boolean hasMxRecord(String domain) {
        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            DirContext ctx = new InitialDirContext(env);
            Attributes attrs = ctx.getAttributes(domain, new String[] {"MX"});
            ctx.close();
            return attrs.get("MX") != null && attrs.get("MX").size() > 0;
        } catch (NamingException e) {
            log.warn("MX record lookup failed for domain: {}", domain);
            return false;
        }
    }
}
