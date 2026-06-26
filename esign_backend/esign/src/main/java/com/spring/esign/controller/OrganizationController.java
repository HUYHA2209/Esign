package com.spring.esign.controller;

import jakarta.mail.MessagingException;

import org.springframework.web.bind.annotation.*;

import com.spring.esign.dto.request.InvitationRequest;
import com.spring.esign.dto.request.OrganizationCreationRequest;
import com.spring.esign.dto.request.UpdateMemberRequest;
import com.spring.esign.dto.response.ApiResponse;
import com.spring.esign.dto.response.MemberResponse;
import com.spring.esign.dto.response.UserSearchResponse;
import com.spring.esign.dto.response.VerifyTokenInvitationOrgResponse;
import com.spring.esign.service.OrganizationService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/organizations")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class OrganizationController {
    OrganizationService organizationService;

    @PostMapping("/create")
    public ApiResponse<Long> createOrganization(@RequestBody OrganizationCreationRequest request) {
        Long orgId = organizationService.createOrganization(request);
        return ApiResponse.<Long>builder().result(orgId).build();
    }

    @PostMapping("/{orgId}/invitations")
    public ApiResponse<Void> inviteMember(@PathVariable Long orgId, @RequestBody InvitationRequest request)
            throws MessagingException {
        organizationService.inviteMember(orgId, request);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping("/invitations/verify")
    public ApiResponse<VerifyTokenInvitationOrgResponse> verifyTokenInvitation(@RequestParam("token") String token) {
        return ApiResponse.<VerifyTokenInvitationOrgResponse>builder()
                .result(organizationService.verifyToken(token))
                .build();
    }

    @PostMapping("/invitations/{token}/accept")
    public ApiResponse<Void> acceptInvite(@PathVariable String token) {
        organizationService.acceptInvite(token);
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/invitations/{token}/reject")
    public ApiResponse<Void> rejectInvite(@PathVariable String token) {
        organizationService.rejectInvite(token);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping("/{orgId}/members")
    public ApiResponse<java.util.List<MemberResponse>> listMembers(@PathVariable Long orgId) {
        return ApiResponse.<java.util.List<MemberResponse>>builder()
                .result(organizationService.listMembers(orgId))
                .build();
    }

    @GetMapping("/{orgId}/signers")
    public ApiResponse<java.util.List<UserSearchResponse>> getMemberCanSign(@PathVariable Long orgId) {
        return ApiResponse.<java.util.List<UserSearchResponse>>builder()
                .result(organizationService.getMemberCanSign(orgId))
                .build();
    }

    @PutMapping("/{orgId}/members/{memberId}")
    public ApiResponse<Void> updateMember(
            @PathVariable Long orgId, @PathVariable Long memberId, @RequestBody UpdateMemberRequest request) {
        organizationService.updateMember(orgId, memberId, request);
        return ApiResponse.<Void>builder().build();
    }

    @DeleteMapping("/{orgId}/members/{memberId}")
    public ApiResponse<Void> removeMember(@PathVariable Long orgId, @PathVariable Long memberId) {
        organizationService.removeMember(orgId, memberId);
        return ApiResponse.<Void>builder().build();
    }

    @DeleteMapping("/{orgId}")
    public ApiResponse<Void> deleteOrganization(@PathVariable Long orgId) {
        organizationService.deleteOrganization(orgId);
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/{orgId}/leave")
    public ApiResponse<Void> leaveOrganization(@PathVariable Long orgId) {
        organizationService.leaveOrganization(orgId);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping("/{orgId}/dashboard")
    public ApiResponse<com.spring.esign.dto.response.OrgDashboardResponse> getDashboardOverview(
            @PathVariable Long orgId) {
        org.springframework.security.core.Authentication authentication =
                org.springframework.security.core.context.SecurityContextHolder.getContext()
                        .getAuthentication();
        String userId = authentication.getName();
        return ApiResponse.<com.spring.esign.dto.response.OrgDashboardResponse>builder()
                .result(organizationService.getDashboardOverview(orgId, userId))
                .build();
    }
}
