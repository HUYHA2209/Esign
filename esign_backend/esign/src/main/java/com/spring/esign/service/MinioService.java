package com.spring.esign.service;

import java.io.InputStream;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import io.minio.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class MinioService {

    private final MinioClient minioClient;

    public String uploadFile(MultipartFile file, String bucketName, String objectName) {
        try {
            return uploadFile(file.getInputStream(), bucketName, objectName, file.getContentType(), file.getSize());
        } catch (Exception e) {
            log.error("Error uploading file to MinIO", e);
            throw new RuntimeException("Error uploading file to MinIO", e);
        }
    }

    public String uploadFile(
            InputStream inputStream, String bucketName, String objectName, String contentType, long size) {
        try {
            boolean found = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucketName).build());
            if (!found) {
                minioClient.makeBucket(
                        MakeBucketArgs.builder().bucket(bucketName).build());
            }

            minioClient.putObject(
                    PutObjectArgs.builder().bucket(bucketName).object(objectName).stream(inputStream, size, -1)
                            .contentType(contentType)
                            .build());

            return objectName;
        } catch (Exception e) {
            log.error("Error uploading file to MinIO", e);
            throw new RuntimeException("Error uploading file to MinIO", e);
        }
    }

    public InputStream downloadFile(String bucketName, String objectName) {
        try {
            return minioClient.getObject(GetObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .build());
        } catch (Exception e) {
            log.error("Error downloading file from MinIO", e);
            throw new RuntimeException("Error downloading file from MinIO", e);
        }
    }

    public void removeFile(String bucketName, String objectName) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .build());
        } catch (Exception e) {
            log.error("Error removing file from MinIO", e);
            throw new RuntimeException("Error removing file from MinIO", e);
        }
    }

    public String getPresignedUrl(String bucketName, String objectName) {
        try {
            return minioClient.getPresignedObjectUrl(io.minio.GetPresignedObjectUrlArgs.builder()
                    .method(io.minio.http.Method.GET)
                    .bucket(bucketName)
                    .object(objectName)
                    .expiry(60 * 60 * 24) // 24 hours
                    .build());
        } catch (Exception e) {
            log.error("Error generating presigned URL for MinIO", e);
            throw new RuntimeException("Error generating presigned URL for MinIO", e);
        }
    }

    /**
     * Copy file từ bucket nguồn sang bucket đích.
     * Dùng để archive bản PDF cũ sang document-versions trước khi ghi đè bản mới.
     */
    public void copyFile(String srcBucket, String srcObject, String destBucket, String destObject) {
        try {
            boolean found = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(destBucket).build());
            if (!found) {
                minioClient.makeBucket(
                        MakeBucketArgs.builder().bucket(destBucket).build());
            }

            minioClient.copyObject(CopyObjectArgs.builder()
                    .bucket(destBucket)
                    .object(destObject)
                    .source(CopySource.builder()
                            .bucket(srcBucket)
                            .object(srcObject)
                            .build())
                    .build());
            log.info("Copied {} from {} to {}/{}", srcObject, srcBucket, destBucket, destObject);
        } catch (Exception e) {
            log.error("Error copying file in MinIO", e);
            throw new RuntimeException("Error copying file in MinIO", e);
        }
    }
}
