package com.spring.esign.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.spring.esign.dto.request.OrganizationCreationRequest;
import com.spring.esign.entity.Account;

@Mapper(componentModel = "spring")
public interface OrganizationMapper {
    @Mapping(target = "accountId", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "accountType", ignore = true)
    @Mapping(target = "members", ignore = true)
    Account toAccount(OrganizationCreationRequest request);
}
