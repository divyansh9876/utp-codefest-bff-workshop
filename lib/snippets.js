// Reference solutions for the Spring Boot BFF (Spring Boot 4.1 · Java 21).
// Base package used throughout: com.utp.codefest.bff

export const INITIALIZR_URL =
  "https://start.spring.io/#!type=maven-project&language=java&packaging=jar&jvmVersion=21&groupId=com.utp.codefest&artifactId=bff&name=bff&packageName=com.utp.codefest.bff&dependencies=web,data-mongodb,validation,devtools";

// ---------------------------------------------------------------------------
// Phase 1
// ---------------------------------------------------------------------------

export const POM_DEPS = `<!-- Phase 1: from start.spring.io -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-webmvc</artifactId>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-devtools</artifactId>
  <scope>runtime</scope>
  <optional>true</optional>
</dependency>

<!-- Phase 3: add these -->
<dependency>
  <groupId>org.springframework.security</groupId>
  <artifactId>spring-security-crypto</artifactId> <!-- BCrypt only, no auto-config -->
</dependency>
<dependency>
  <groupId>io.jsonwebtoken</groupId>
  <artifactId>jjwt-api</artifactId>
  <version>0.12.6</version>
</dependency>
<dependency>
  <groupId>io.jsonwebtoken</groupId>
  <artifactId>jjwt-impl</artifactId>
  <version>0.12.6</version>
  <scope>runtime</scope>
</dependency>
<dependency>
  <groupId>io.jsonwebtoken</groupId>
  <artifactId>jjwt-jackson</artifactId>
  <version>0.12.6</version>
  <scope>runtime</scope>
</dependency>
<dependency>
  <groupId>com.google.api-client</groupId>
  <artifactId>google-api-client</artifactId>
  <version>2.7.2</version>
</dependency>`;

export const BFF_ENV = `# bff/.env  — never commit this file (properties format: no quotes)
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/codefest?retryWrites=true&w=majority
JWT_SECRET=at-least-32-random-bytes-generate-me-in-tab-4
JWT_EXPIRATION_MINUTES=60
GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com`;

export const APPLICATION_YML = `spring:
  application:
    name: bff
  config:
    # Load bff/.env locally. On Render, real env vars are used instead.
    import: optional:file:.env[.properties]
  mongodb:
    uri: \${MONGODB_URI}          # Boot 4: spring.mongodb.* (was spring.data.mongodb.uri)
  data:
    mongodb:
      auto-index-creation: true   # creates @Indexed(unique = true) indexes

server:
  port: \${PORT:8080}            # Render injects PORT; 8080 locally

app:
  jwt:
    secret: \${JWT_SECRET}
    expiration-minutes: \${JWT_EXPIRATION_MINUTES:60}
  google:
    client-id: \${GOOGLE_CLIENT_ID:}`;

export const HEALTH_CONTROLLER = `package com.utp.codefest.bff.health;

import java.util.Map;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

  private final MongoTemplate mongo;

  // Spring injects the ONE MongoTemplate bean, backed by one pooled MongoClient.
  // No "new MongoClient()" anywhere = no connection leaks on DevTools restarts.
  public HealthController(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  @GetMapping("/api/health")
  public ResponseEntity<Map<String, Object>> health() {
    long started = System.currentTimeMillis();
    try {
      mongo.getDb().runCommand(new Document("ping", 1));
      return ResponseEntity.ok(Map.of(
          "status", "ok",
          "db", "connected",
          "dbName", mongo.getDb().getName(),
          "latencyMs", System.currentTimeMillis() - started));
    } catch (Exception e) {
      return ResponseEntity.status(503).body(Map.of(
          "status", "error",
          "db", "disconnected",
          "error", String.valueOf(e.getMessage())));
    }
  }
}`;

export const NEXT_PROXY = `// next.config.mjs (already in the frontend repo)
const BFF_URL = process.env.BFF_URL || "http://localhost:8080";

export default {
  async rewrites() {
    // Browser calls /api/* on the Next.js origin → forwarded to Spring Boot.
    return [{ source: "/api/:path*", destination: \`\${BFF_URL}/api/:path*\` }];
  },
};`;

export const CORS_CONFIG = `package com.utp.codefest.bff.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// ONLY needed if the browser calls Spring Boot directly (no Next.js proxy).
// Careful: the proxy forwards the browser's Origin header. Once this class exists,
// any origin NOT listed below gets 403 "Invalid CORS request" on POST/DELETE.
@Configuration
public class CorsConfig implements WebMvcConfigurer {
  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOrigins("http://localhost:3000", "https://your-frontend.onrender.com")
        .allowedMethods("GET", "POST", "DELETE")
        .allowedHeaders("Authorization", "Content-Type");
  }
}`;

// ---------------------------------------------------------------------------
// Phase 2
// ---------------------------------------------------------------------------

export const PROJECT_ENTITY = `package com.utp.codefest.bff.project;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("projects")            // stored in the "projects" collection
public class Project {

  @Id                            // maps to MongoDB _id; serialised as "id"
  private String id;
  private String title;
  private String description;
  private String category;
  private String teamName;
  private String repoUrl;
  private Instant createdAt;

  // Getters & setters: IntelliJ → Cmd+N / Alt+Insert → "Getter and Setter"
}`;

export const PROJECT_REPOSITORY = `package com.utp.codefest.bff.project;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

// Spring Data writes the implementation for you at startup.
public interface ProjectRepository extends MongoRepository<Project, String> {

  // Query derived from the method name: sort by createdAt, newest first
  List<Project> findAllByOrderByCreatedAtDesc();
}`;

export const PROJECT_SERVICE = `package com.utp.codefest.bff.project;

import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ProjectService {

  private final ProjectRepository repo;

  public ProjectService(ProjectRepository repo) {
    this.repo = repo;
  }

  public List<Project> list() {
    return repo.findAllByOrderByCreatedAtDesc();
  }

  public Project create(ProjectController.CreateProjectRequest req) {
    Project p = new Project();
    p.setTitle(req.title().trim());
    p.setDescription(req.description().trim());
    p.setCategory(req.category());
    p.setTeamName(req.teamName());
    p.setRepoUrl(req.repoUrl());
    p.setCreatedAt(Instant.now());   // server decides, never the client
    return repo.save(p);
  }

  public boolean delete(String id) {
    if (!repo.existsById(id)) return false;
    repo.deleteById(id);
    return true;
  }
}`;

export const PROJECT_CONTROLLER = `package com.utp.codefest.bff.project;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

  // Request DTO: the ONLY fields a client may send. Validated before the method runs.
  public record CreateProjectRequest(
      @NotBlank(message = "Title is required") @Size(max = 80) String title,
      @NotBlank(message = "Description is required") @Size(max = 500) String description,
      @NotBlank @Pattern(
          regexp = "AI / ML|Web|Mobile|FinTech|Sustainability|HealthTech|EdTech|IoT|Gaming|Other",
          message = "Unknown category") String category,
      @Size(max = 60) String teamName,
      String repoUrl) {}

  private final ProjectService projects;

  public ProjectController(ProjectService projects) {
    this.projects = projects;
  }

  @GetMapping
  public Map<String, List<Project>> list() {
    return Map.of("projects", projects.list());
  }

  @PostMapping
  public ResponseEntity<Map<String, Project>> create(@Valid @RequestBody CreateProjectRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("project", projects.create(req)));
  }

  // Phase 3: protected by JwtAuthFilter
  @DeleteMapping("/{id}")
  public Map<String, Object> delete(@PathVariable String id) {
    if (!projects.delete(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
    }
    return Map.of("ok", true, "id", id);
  }
}`;

export const EXCEPTION_HANDLER = `package com.utp.codefest.bff.common;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

// Turns exceptions into the { "error": "..." } shape the UI understands.
@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException e) {
    String message = e.getBindingResult().getFieldErrors().stream()
        .findFirst()
        .map(f -> f.getField() + ": " + f.getDefaultMessage())
        .orElse("Invalid request");
    return ResponseEntity.badRequest().body(Map.of("error", message));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, String>> unreadable() {
    return ResponseEntity.badRequest().body(Map.of("error", "Request body must be valid JSON"));
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, String>> status(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", String.valueOf(e.getReason())));
  }
}`;

// ---------------------------------------------------------------------------
// Phase 3
// ---------------------------------------------------------------------------

export const USER_ENTITY = `package com.utp.codefest.bff.user;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("users")
public class User {

  @Id
  private String id;
  private String name;

  @Indexed(unique = true)
  private String email;

  private String provider = "local";        // "local" | "google"

  @JsonIgnore                               // NEVER serialised to JSON
  private String passwordHash;              // local provider only

  @Indexed(unique = true, sparse = true)    // sparse: many users have no googleId
  private String googleId;                  // google provider only

  private String avatar;

  // Getters & setters
}`;

export const USER_REPOSITORY = `package com.utp.codefest.bff.user;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {
  Optional<User> findByEmail(String email);
  Optional<User> findByGoogleId(String googleId);
  boolean existsByEmail(String email);
}`;

export const JWT_SERVICE = `package com.utp.codefest.bff.auth;

import com.utp.codefest.bff.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final SecretKey key;
  private final long expirationMinutes;

  public JwtService(@Value("\${app.jwt.secret}") String secret,
                    @Value("\${app.jwt.expiration-minutes}") long expirationMinutes) {
    // Needs >= 32 bytes or jjwt throws WeakKeyException. signWith(key) then picks
    // the strongest HMAC the key allows: 32 bytes → HS256, 48 → HS384, 64+ → HS512
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expirationMinutes = expirationMinutes;
  }

  public String generate(User user, String provider) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(user.getId())
        .claim("email", user.getEmail())
        .claim("name", user.getName())
        .claim("provider", provider)
        .issuedAt(Date.from(now))
        .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
        .signWith(key)
        .compact();
  }

  /** Verifies signature + expiry. Throws JwtException if anything is wrong. */
  public Claims parse(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
  }
}`;

export const AUTH_CONTROLLER = `package com.utp.codefest.bff.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.utp.codefest.bff.user.User;
import com.utp.codefest.bff.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  public record RegisterRequest(
      @NotBlank String name,
      @NotBlank @Email String email,
      @Size(min = 8, message = "Password must be at least 8 characters") String password) {}

  public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

  public record GoogleRequest(@NotBlank String credential) {}

  private final UserRepository users;
  private final JwtService jwt;
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);
  private final GoogleIdTokenVerifier googleVerifier;

  public AuthController(UserRepository users, JwtService jwt,
                        @Value("\${app.google.client-id}") String googleClientId) {
    this.users = users;
    this.jwt = jwt;
    this.googleVerifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
        .setAudience(List.of(googleClientId))   // reject tokens minted for other apps
        .build();
  }

  // ---- Local provider ------------------------------------------------------

  @PostMapping("/register")
  public ResponseEntity<Map<String, User>> register(@Valid @RequestBody RegisterRequest req) {
    String email = req.email().toLowerCase().trim();
    if (users.existsByEmail(email)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
    }
    User user = new User();
    user.setName(req.name().trim());
    user.setEmail(email);
    user.setProvider("local");
    user.setPasswordHash(encoder.encode(req.password()));   // salted + slow on purpose
    users.save(user);
    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("user", user));
  }

  @PostMapping("/login")
  public Map<String, Object> login(@Valid @RequestBody LoginRequest req) {
    User user = users.findByEmail(req.email().toLowerCase().trim())
        .filter(u -> u.getPasswordHash() != null)            // Google-only accounts can't use passwords
        .filter(u -> encoder.matches(req.password(), u.getPasswordHash()))
        // Same message for "no such user" and "wrong password"
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
    return Map.of("token", jwt.generate(user, "local"), "user", user);
  }

  // ---- Google provider -----------------------------------------------------

  @PostMapping("/google")
  public Map<String, Object> google(@Valid @RequestBody GoogleRequest req) {
    GoogleIdToken.Payload profile;
    try {
      GoogleIdToken idToken = googleVerifier.verify(req.credential());   // signature + aud + exp
      if (idToken == null) throw new IllegalArgumentException("invalid");
      profile = idToken.getPayload();
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
    }
    if (!Boolean.TRUE.equals(profile.getEmailVerified())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google email is not verified");
    }

    String email = profile.getEmail().toLowerCase();
    User user = users.findByGoogleId(profile.getSubject())
        .or(() -> users.findByEmail(email))                 // link to an existing local account
        .orElseGet(User::new);
    if (user.getId() == null) {
      user.setName((String) profile.get("name"));
      user.setEmail(email);
      user.setProvider("google");
    }
    user.setGoogleId(profile.getSubject());
    if (user.getAvatar() == null) user.setAvatar((String) profile.get("picture"));
    users.save(user);

    // Issue OUR JWT: protected endpoints never need to know about Google
    return Map.of("token", jwt.generate(user, "google"), "user", user);
  }
}`;

export const JWT_FILTER = `package com.utp.codefest.bff.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

// The auth guard: runs BEFORE any controller, so protection lives in one place.
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtService jwt;

  public JwtAuthFilter(JwtService jwt) {
    this.jwt = jwt;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest req) {
    // Only guard DELETE /api/projects/** — reading the feed stays public
    return !("DELETE".equals(req.getMethod()) && req.getRequestURI().startsWith("/api/projects"));
  }

  @Override
  protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    String header = req.getHeader("Authorization");
    if (header == null || !header.startsWith("Bearer ")) {
      reject(res, "Unauthorized: log in first");
      return;
    }
    try {
      Claims claims = jwt.parse(header.substring(7));
      req.setAttribute("userId", claims.getSubject());   // available to controllers
      chain.doFilter(req, res);
    } catch (JwtException | IllegalArgumentException e) {
      reject(res, "Invalid or expired token");
    }
  }

  private void reject(HttpServletResponse res, String message) throws IOException {
    res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    res.setContentType("application/json;charset=UTF-8");
    res.getWriter().write("{\\"error\\":\\"" + message + "\\"}");
  }
}`;

// ---------------------------------------------------------------------------
// Phase 4
// ---------------------------------------------------------------------------

export const GITIGNORE_FE = `# frontend/.gitignore (Next.js)
/node_modules
/.next/
.env*
!.env.example
.vercel`;

export const GITIGNORE_BFF = `# bff/.gitignore (Spring Boot / Maven)
target/
.env
!.env.example
.idea/
*.iml
.vscode/
HELP.md`;

export const ENV_EXAMPLE = `# bff/.env.example — commit this one (placeholders only)
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/codefest
JWT_SECRET=generate-32-plus-random-bytes
JWT_EXPIRATION_MINUTES=60
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# frontend/.env.example
BFF_URL=http://localhost:8080
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`;

export const GIT_PUSH = `# Run in BOTH folders (frontend and bff), each to its own GitHub repo
git init
git add .
git status            # make sure .env / .env.local are NOT listed
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main`;

export const GIT_UNTRACK = `# Accidentally committed a secret? Untrack it AND rotate it.
git rm --cached .env
git commit -m "Stop tracking .env"
# Then: change the Atlas DB user password + generate a new JWT_SECRET`;

export const DOCKERFILE = `# bff/Dockerfile — Render has no native Java runtime, so we ship a container
# ---- build stage: JDK + Maven ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

# ---- run stage: small JRE image ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Stay inside Render's 512 MB free-tier memory
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]`;

export const RENDER_YAML = `# render.yaml — Render Blueprint
services:
  # Next.js frontend (this repo)
  - type: web
    name: utp-codefest-bff-workshop
    runtime: node
    plan: free
    region: singapore
    buildCommand: npm ci && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_VERSION
        value: "22"
      - key: BFF_URL                     # your Spring Boot service URL
        sync: false
      - key: NEXT_PUBLIC_GOOGLE_CLIENT_ID
        sync: false

  # Spring Boot BFF (its own repo, deployed with the Dockerfile)
  # - type: web
  #   name: utp-codefest-bff
  #   runtime: docker
  #   repo: https://github.com/<you>/utp-codefest-bff
  #   plan: free
  #   region: singapore
  #   healthCheckPath: /api/health
  #   envVars:
  #     - key: MONGODB_URI
  #       sync: false
  #     - key: JWT_SECRET
  #       generateValue: true
  #     - key: JWT_EXPIRATION_MINUTES
  #       value: "60"
  #     - key: GOOGLE_CLIENT_ID
  #       sync: false`;
