# Stage 1: Build the application
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src

# Build the jar file (bỏ qua test để deploy nhanh hơn)
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:21-jre
WORKDIR /app

# Copy file jar từ Stage 1 sang
COPY --from=build /app/target/identity-service-0.0.1-SNAPSHOT.jar app.jar

# Mở port 8000 (đúng với cấu hình trong application.yaml của bạn)
EXPOSE 8000

# Chạy ứng dụng
ENTRYPOINT ["java", "-jar", "app.jar"]
