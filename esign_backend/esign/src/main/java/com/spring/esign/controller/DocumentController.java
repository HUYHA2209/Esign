package com.spring.esign.controller;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.spring.esign.dto.request.SendDocumentRequest;
import com.spring.esign.dto.request.UpdateDraftRequest;
import com.spring.esign.dto.response.ApiResponse;
import com.spring.esign.dto.response.DocumentResponse;
import com.spring.esign.dto.response.GroupDetailResponse;
import com.spring.esign.dto.response.GroupReceivedDetailResponse;
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

    @PostMapping(value = "/uploads-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<Integer> uploadDocuments(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "documentName", required = false) String groupName,
            @RequestParam(value = "groupId", required = false) Integer groupId)
            throws IOException {
        return ApiResponse.<Integer>builder()
                .result(documentService.uploadDocument(files, groupName, groupId))
                .build();
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
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable Integer id, @RequestParam(value = "action", required = false) String action) {
        boolean logAudit = "download".equalsIgnoreCase(action);
        InputStream resource = documentService.downloadDocument(id, logAudit);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(resource));
    }

    @GetMapping("/{id}/download-to-recipients")
    public ResponseEntity<Resource> dowloadDocumentByRecipient(
            @PathVariable Integer id, @RequestParam(value = "action", required = false) String action) {
        boolean logAudit = "download".equalsIgnoreCase(action);
        InputStream resource = documentService.downloadDocumentByRecipient(id, logAudit);
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

    @PostMapping("/groups/{groupId}/cancel")
    public ApiResponse<Void> cancelGroupById(
            @PathVariable Integer groupId,
            @RequestBody(required = false) com.spring.esign.dto.request.CancelRequest request) {
        documentService.cancelDocumentGroup(groupId, request);
        return ApiResponse.<Void>builder().message("Cancel successfully").build();
    }

    @GetMapping("/received")
    public ApiResponse<List<DocumentResponse>> getReceivedDocument() {
        return ApiResponse.<List<DocumentResponse>>builder()
                .result(documentService.getReceivedDocument())
                .build();
    }

    @GetMapping("/groups/{groupId}/received")
    public ApiResponse<GroupReceivedDetailResponse> getGroupReceivedDetail(@PathVariable Integer groupId) {
        return ApiResponse.<GroupReceivedDetailResponse>builder()
                .result(documentService.getReceivedGroupDetail(groupId))
                .build();
    }

    @PutMapping("/groups/{groupId}/update-draft")
    public ApiResponse<Integer> updateDraft(
            @PathVariable Integer groupId, @RequestBody UpdateDraftRequest updateDraftRequest) {
        return ApiResponse.<Integer>builder()
                .result(documentService.updateDraft(groupId, updateDraftRequest))
                .build();
    }
}
