package com.spring.esign.controller;

import java.io.InputStream;
import java.util.List;

import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spring.esign.dto.request.SaveDraftDocumentRequest;
import com.spring.esign.dto.request.SendDocumentRequest;
import com.spring.esign.dto.response.ApiResponse;
import com.spring.esign.dto.response.DocumentResponse;
import com.spring.esign.dto.response.GroupDetailResponse;
import com.spring.esign.service.DocumentService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@Slf4j
@RequestMapping("/documents")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DocumentController {

    DocumentService documentService;

    @PostMapping(value = "/save-draft", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<Integer> saveDraftDocument(
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @RequestPart("data") String data)
            throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        SaveDraftDocumentRequest dataJson = mapper.readValue(data, SaveDraftDocumentRequest.class);
        Integer groupId = documentService.saveDraftDocument(files, dataJson);
        return ApiResponse.<Integer>builder().result(groupId).build();
    }

    @GetMapping("/get-document")
    public ApiResponse<List<DocumentResponse>> getDocuments() {
        return ApiResponse.<List<DocumentResponse>>builder()
                .result(documentService.getMyDocuments())
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<DocumentResponse> getDocumentById(@PathVariable Integer id) {
        return ApiResponse.<DocumentResponse>builder()
                .result(documentService.getDocumentById(id))
                .build();
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Integer id) {
        InputStream resource = documentService.downloadDocument(id);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(resource));
    }

    @GetMapping("/groups/{groupId}")
    public ApiResponse<List<DocumentResponse>> getDraftGroup(@PathVariable Integer groupId) {
        return ApiResponse.<List<DocumentResponse>>builder()
                .result(documentService.getDraftGroup(groupId))
                .build();
    }

    @GetMapping("/groups/{groupId}/detail")
    public ApiResponse<GroupDetailResponse> getGroupDetail(@PathVariable Integer groupId) {
        return ApiResponse.<GroupDetailResponse>builder()
                .result(documentService.getGroupDetail(groupId))
                .build();
    }

    @PostMapping("/groups/{groupId}/send")
    public ApiResponse<String> sendDocumentGroup(
            @PathVariable Integer groupId, @RequestBody SendDocumentRequest request) {
        documentService.sendDocumentGroup(groupId, request);
        return ApiResponse.<String>builder()
                .result("Document sent successfully")
                .build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> deleteDocumentById(@PathVariable Integer id) {
        documentService.deleteDocumentById(id);
        return ApiResponse.<String>builder().result("Delete successfully").build();
    }

    @DeleteMapping("/groups/{groupId}")
    public ApiResponse<String> deleteGroupById(@PathVariable Integer groupId) {
        documentService.deleteGroupById(groupId);
        return ApiResponse.<String>builder().result("Delete successfully").build();
    }

    @GetMapping("/received")
    public ApiResponse<List<DocumentResponse>> getReceivedDocument() {
        return ApiResponse.<List<DocumentResponse>>builder()
                .result(documentService.getReceivedDocument())
                .build();
    }
}
