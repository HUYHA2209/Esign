package com.spring.esign.service;

import java.time.Duration;
import java.util.Map;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RedisSignService {
    RedisTemplate<String, String> redisTemplate;
    ObjectMapper objectMapper;

    public RedisSignService(RedisTemplate<String, String> redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    private String buildKey(String sessionId, Integer docId) {
        return "preseal:" + sessionId + ":" + docId;
    }

    private String buildFieldValuesKey(String sessionId, Integer docId) {
        return "fieldvalues:" + sessionId + ":" + docId;
    }

    // luu objectName
    public void save(String sessionId, Integer docId, String objectName) {
        String key = buildKey(sessionId, docId);
        redisTemplate.opsForValue().set(key, objectName, Duration.ofMinutes(10));
    }

    // Lay objectName
    public String get(String sessionId, Integer docId) {
        String key = buildKey(sessionId, docId);
        return redisTemplate.opsForValue().get(key);
    }

    // xoa
    public void delete(String sessionId, Integer docId) {
        String key = buildKey(sessionId, docId);
        redisTemplate.delete(key);
    }

    // === Field Values (dùng cho re-burn khi race condition PARALLEL / SEQUENTIAL) ===

    /**
     * Lưu fieldValues (Map) dưới dạng JSON vào Redis.
     * Dùng khi completeSignning cần re-burn visuals lên bản final mới nhất.
     */
    public void saveFieldValues(String sessionId, Integer docId, Map<String, String> fieldValues) {
        if (fieldValues == null || fieldValues.isEmpty()) return;
        try {
            String json = objectMapper.writeValueAsString(fieldValues);
            String key = buildFieldValuesKey(sessionId, docId);
            redisTemplate.opsForValue().set(key, json, Duration.ofMinutes(10));
        } catch (JsonProcessingException e) {
            log.error("Lỗi serialize fieldValues cho session={}, docId={}", sessionId, docId, e);
        }
    }

    /**
     * Đọc fieldValues đã lưu từ Redis.
     */
    public Map<String, String> getFieldValues(String sessionId, Integer docId) {
        String key = buildFieldValuesKey(sessionId, docId);
        String json = redisTemplate.opsForValue().get(key);
        if (json == null) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, String>>() {});
        } catch (JsonProcessingException e) {
            log.error("Lỗi deserialize fieldValues cho session={}, docId={}", sessionId, docId, e);
            return null;
        }
    }

    /**
     * Xóa fieldValues khỏi Redis.
     */
    public void deleteFieldValues(String sessionId, Integer docId) {
        String key = buildFieldValuesKey(sessionId, docId);
        redisTemplate.delete(key);
    }
}
