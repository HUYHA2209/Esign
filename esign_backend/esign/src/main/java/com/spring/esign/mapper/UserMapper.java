package com.spring.esign.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.spring.esign.dto.request.UserCreationRequest;
import com.spring.esign.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "forgotPassword", ignore = true)
    @Mapping(target = "emailVerified", ignore = true)
    User toUser(UserCreationRequest request);
}
