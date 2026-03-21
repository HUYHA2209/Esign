package com.spring.esign.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.spring.esign.dto.response.UserSearchResponse;
import com.spring.esign.entity.User;

public interface UserRepository extends JpaRepository<User, String> {
    Boolean existsByEmail(String email);

    Optional<User> findByEmail(String email);

    @Transactional
    @Modifying
    @Query("update User u set u.password = ?2 where u.email = ?1")
    void updatePassword(String email, String password);

    @Transactional
    @Modifying
    @Query("update User u set u.fullName = :fullName, u.phone = :phone where u.id = :id")
    void updateProfile(@Param("id") String id, @Param("fullName") String fullName, @Param("phone") String phone);

    // Lấy thông tin cần thiết trực tiếp từ SQL Query (Không load các bảng liên
    // quan)
    @Query(
            "SELECT new com.spring.esign.dto.response.UserSearchResponse(u.id, u.email, u.fullName) FROM User u WHERE LOWER(u.email) LIKE LOWER(CONCAT('%', :email, '%'))")
    List<UserSearchResponse> findEmailByKey(@Param("email") String email);
}
