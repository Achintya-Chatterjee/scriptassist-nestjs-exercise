# TaskFlow API - Refactored Solution

This document outlines the analysis, architectural decisions, and improvements made to the TaskFlow API, transforming it from a prototype with critical flaws into a production-ready, scalable, and secure application.

The original setup instructions from the challenge are preserved at the bottom of this document for reference.

---

## 1. Analysis of Core Problems Identified

The original codebase presented a series of critical issues that made it unsuitable for a production environment. My analysis confirmed the primary problem areas outlined in the challenge description:

### Performance & Scalability

- **N+1 Queries:** The application architecture would inevitably lead to fetching related entities in separate, inefficient database calls.
- **Inefficient Data Handling:** Filtering and pagination were performed in-memory, a non-scalable approach that consumes excessive resources.
- **Missing Batch Operations:** The lack of a proper batch processing endpoint would necessitate numerous individual HTTP requests for bulk updates, causing network overhead and poor performance.

### Architectural Weaknesses

- **Poor Separation of Concerns:** Business logic was entangled within controllers and services, making the code difficult to test, maintain, and reason about.
- **Lack of Transaction Management:** Multi-step operations were not atomic, risking data inconsistency in case of partial failures.
- **Tightly Coupled Components:** The absence of clear domain layers and service boundaries would result in a fragile and rigid codebase.

### Security Vulnerabilities

- **Inadequate Authorization:** A critical flaw where a user could potentially access or modify resources belonging to other users.
- **Insecure Rate Limiting:** The lack of a distributed rate limiter would make the application vulnerable to denial-of-service attacks and unable to scale horizontally.
- **Sensitive Data Exposure:** API endpoints have returned full database entities, exposing sensitive or internal fields.

### Reliability & Resilience Gaps

- **Ineffective Error Handling:** Errors in background jobs or across the application were not handled gracefully, leading to crashes or silent failures.
- **In-memory Implementations:** Caching and other stateful features would be ineffective and cause data consistency issues in a multi-instance deployment.

---

## 2. Overview of Architectural Approach

To address these fundamental issues, the application was re-architected around a **Command and Query Responsibility Segregation (CQRS)** pattern. This decision provides a robust foundation for solving the majority of the identified problems.

### CQRS Implementation

- **Commands:** Represent write operations (e.g., `CreateTaskCommand`). They are dispatched from the service layer to dedicated `CommandHandlers`. Each handler is responsible for a single, atomic operation, often wrapped in a database transaction.
- **Queries:** Represent read operations (e.g., `GetAllTasksQuery`). They are dispatched to `QueryHandlers`, which are optimized for efficient data retrieval directly from the database, bypassing unnecessary business logic.

This separation allows for:

- **Optimized Data Access:** Write-side and read-side operations can be independently optimized.
- **Improved Scalability:** The read and write workloads can be scaled independently.
- **Enhanced Maintainability:** The codebase is organized by intent, making it easier to understand, test, and modify.

### Key Technologies & Patterns

- **NestJS:** The core framework, providing a structured, modular architecture.
- **TypeORM:** Used for data access, with the `QueryBuilder` being key for performant database-side filtering and pagination.
- **BullMQ & Redis:** For offloading tasks to background workers, ensuring a responsive API.
- **`nestjs-cls`:** Implemented for request-scoped context, allowing easy and clean access to user data throughout the application without prop-drilling.
- **DTOs (Data Transfer Objects):** Used extensively for input validation (`class-validator`) and to shape API responses, preventing data leakage.

---

## 3. Performance and Security Improvements Made

### Performance

- **Database-Side Filtering & Pagination:** All list-based queries now use TypeORM's `QueryBuilder` to perform filtering and pagination directly in the database. This is highly efficient and scalable.
- **Solved N+1 Problem:** Query handlers use `leftJoinAndSelect` to eagerly load related data (like a task's owner) in a single query.
- **Efficient Batch Operations:** The `POST /tasks/batch` endpoint allows for multiple operations in a single request, significantly reducing network latency for bulk actions.
- **Asynchronous Background Processing:** Operations like sending notifications are offloaded to a BullMQ queue, preventing them from blocking the API response and improving user-perceived performance.

### Security

- **Distributed Rate Limiting:** Implemented using `throttler-storage-redis` to ensure rate limits are enforced consistently across multiple application instances. This guard is applied globally for robust protection against DoS attacks.
- **Robust Authentication:** The `JwtAuthGuard` protects all sensitive endpoints, ensuring only authenticated users can access them.
- **Fine-Grained Authorization:** The `TaskOwnershipGuard` ensures that users can only access and modify their own tasks, while allowing `admin` users privileged access. This prevents horizontal privilege escalation.
- **Data Sanitization & Validation:** A global `ValidationPipe` is used with `forbidNonWhitelisted: true`, ensuring all incoming data is strictly validated against DTOs and no extraneous properties are processed.
- **Scoped API Responses:** `TaskResponseDto` is used to ensure only necessary and safe data is returned to the client, hiding implementation details and sensitive information.

---

## 4. Key Technical Decisions and Rationale

| Decision                                          | Rationale                                                                                                                                                                                                                                            | Tradeoffs                                                                                                                                                                                    |
| :------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Adopt CQRS**                                    | Provides a clear separation between read and write logic, which is the best way to address the architectural, performance, and scalability concerns simultaneously. It encourages single-responsibility handlers that are easy to test and maintain. | Increases initial complexity and the number of classes required. For very simple CRUD applications, it might be overkill, but it was the right choice for this challenge's requirements.     |
| **Use `nestjs-cls` for Request Context**          | Provides a clean, dependency-injection-friendly way to access request-scoped data (like the authenticated user) deep within the application (e.g., in query handlers) without passing the `request` object down through multiple layers.             | Adds a small dependency and requires correct middleware setup. The alternative, prop-drilling, is less clean and more error-prone.                                                           |
| **Implement a Distributed Rate Limiter**          | A simple in-memory rate limiter would not work in a scaled, multi-instance environment. Using Redis ensures that the rate limit state is shared, providing robust protection.                                                                        | Adds a dependency on a running Redis instance for the rate-limiting feature. This is a necessary tradeoff for any scalable application.                                                      |
| **Use Database Transactions in Command Handlers** | Guarantees atomicity for operations that involve multiple steps (e.g., writing to the DB and enqueuing a job). If any step fails, the entire operation is rolled back, preventing data inconsistency.                                                | Introduces a minor performance overhead for the transaction management itself, but the gain in data integrity is critical and far outweighs this cost.                                       |
| **Comprehensive E2E Testing**                     | While unit tests are great for isolated logic, E2E tests provide the highest confidence that all the pieces (guards, pipes, services, DB) work together correctly. They test the application from the user's perspective.                            | E2E tests are slower to run and more complex to set up than unit tests, requiring a full application bootstrap and database connection. The confidence they provide is worth the investment. |

---

## 5. API Documentation

The API is documented in two ways to accommodate different development workflows:

### Swagger / OpenAPI
Once the application is running, a comprehensive Swagger UI is available at `/api`. This interface provides a full, interactive overview of all available endpoints, their required parameters, and their response models.

### Postman Collection
A `scriptassist-nestjs-exercise.postman_collection.json` file is included in the root of the repository. This can be imported into Postman for immediate, hands-on testing and interaction with the API endpoints.

---

## Getting Started (Original Challenge Instructions)

### Prerequisites

- Node.js (v16+)
- Bun (latest version)
- PostgreSQL
- Redis

### Setup Instructions

1.  Clone this repository
2.  Install dependencies:
    ```bash
    bun install
    ```
3.  Configure environment variables by copying `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    # Update the .env file with your database and Redis connection details
    ```
4.  Database Setup:
    Ensure your PostgreSQL database is running, then create a database:

    ```bash
    # Using psql
    psql -U postgres
    CREATE DATABASE taskflow;
    \q

    # Or using createdb
    createdb -U postgres taskflow
    ```

    Build the TypeScript files to ensure the migrations can be run:

    ```bash
    bun run build
    ```

5.  Run database migrations:
    ```bash
    bun run migration:run
    ```
6.  Seed the database with initial data:
    ```bash
    bun run seed
    ```
7.  Start the development server:
    ```bash
    bun run start:dev
    ```
8.  Run the test suite:
    ```bash
    bun test
    ```

### Default Users

The seeded database includes two users:

1.  **Admin User**: `admin@example.com` / `admin123`
2.  **Regular User**: `user@example.com` / `user123`
