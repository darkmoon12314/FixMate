
FROM eclipse-temurin:21-jdk

WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

RUN chmod +x mvnw

RUN ./mvnw dependency:go-offline

COPY src ./src

RUN ./mvnw clean package -DskipTests

# Temporary diagnostic tool
RUN apt-get update && apt-get install -y --no-install-recommends netcat-openbsd && rm -rf /var/lib/apt/lists/*

EXPOSE 8080

CMD ["sh", "-c", "echo '=== TIDB NETWORK TEST ==='; nc -vz -w 8 gateway01.ap-southeast-1.prod.aws.tidbcloud.com 4000; echo '=== STARTING BACKEND ==='; java -jar target/*.jar --server.port=${PORT:-8080}"]
