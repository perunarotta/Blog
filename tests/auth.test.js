import { describe, it, expect } from "vitest";
import bcrypt from "bcrypt";
import app from "../app.js";
import db from "../database.js"

describe("GET /auth/login", () => {
    it("Should render the correct login page view", async () => {
        const server = app.listen(0);
        await new Promise((resolve) => server.once("listening", resolve));

        try{
            const { port } = server.address();
            const response = await fetch(`http://localhost:${port}/auth/login`);
            const html = await response.text();

            expect(response.status).toBe(200); //verifies "GET /auth/login" loaded successfully
            expect(html).toContain("<h1>Login</h1>");
            expect(html).toContain('action="/auth/login"')
        } finally {
            await new Promise((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve()))
            );
        }
    });
});

describe("GET /auth/register", () => {
    it("Should render the correct registeration page view", async () => {
        const server = app.listen(0);
        await new Promise((resolve) => server.once("listening", resolve));

        try{
            const { port } = server.address();
            const response = await fetch(`http://localhost:${port}/auth/register`);
            const html = await response.text();

            expect(response.status).toBe(200);
            expect(html).toContain("<h1>Register</h1>");
            expect(html).toContain('action="/auth/register"')
        } finally {
            await new Promise((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve()))
            );
        }
    });
});

describe("POST /auth/login", () => {
    it('Should login with correct credentials', async () => {
        const server = app.listen(0);
        await new Promise((resolve) => server.once("listening", resolve));

        try{
            const { port } = server.address();
            const response = await fetch(`http://localhost:${port}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: new URLSearchParams({
                        username: "testuser",
                        password: "password"
                    }),
                    redirect: "manual"
                });
            expect(response.status).toBe(302);
            expect(response.headers.get("location")).toBe("/");
            expect(response.headers.get("set-cookie")).toContain("sessionId=");

        } finally {
            await new Promise((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve()))
            );
        }    
    })
});

describe("POST /auth/login", () => {
    it('Should reject incorrect credentials', async () => {
        const server = app.listen(0);
        await new Promise((resolve) => server.once("listening", resolve));

        try{
            const { port } = server.address();
            const response = await fetch(`http://localhost:${port}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: new URLSearchParams({
                        username: "testuser",
                        password: "wrongPassword"
                    }),
                    redirect: "manual"
                });
            expect(response.status).toBe(200);
            const  html = await response.text();
            expect(html).toContain("Invalid username or password");
            expect(response.headers.get("location")).toBeNull();

        } finally {
            await new Promise((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve()))
            );
        }    
    })
});

describe("POST /auth/register", () => {
    it("Should store the password as a bcrypt hash", async () => {
        const username = `testuser-${Date.now()}`; //${Date.now()} gives a unique username that includes current time so it wont conflict with an existing username
        const password = "test-password";
        const server = app.listen(0);
        await new Promise((resolve) => server.once('listening', resolve));
        
        try{
            const { port } = server.address();
            const response = await fetch(`http://localhost:${port}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    username,
                    password
                }),
                redirect: "manual"
            });
            
            expect(response.status).toBe(302);

            const user = await new Promise((resolve, reject) => {
                db.get(
                    "SELECT password FROM users WHERE username = ?",
                    [username],
                    (error, row) => (error ? reject(error) : resolve(row))
                );
            });

            expect(user).toBeDefined();
            expect(user.password).not.toBe(password);
            expect(bcrypt.compareSync(password, user.password)).toBe(true);
        } finally {
            await new Promise((resolve, reject) => {
                db.run("DELETE FROM users WHERE username = ?", [username], (error) =>
                    error ? reject(error) : resolve()
                );
            });
            await new Promise((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve()))
            );
        }
    });
});

describe("POST /auth/register", () => {
    it("Should not allow duplicate account usernames", async () => {
        const username = `duplicate-${Date.now()}`;
        const server = app.listen(0);
        await new Promise((resolve) => server.once('listening', resolve));

        try{
            await new Promise((resolve, reject) => {
                db.run(
                    "INSERT INTO users (username, password, sessionId) VALUES (?, ?, ?)",
                    [username, "existing-password-hash", 0],
                    (error) => (error ? reject(error) : resolve())
                );
            });

            const { port } = server.address();
            const response = await fetch(`http://localhost:${port}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    username,
                    password: "password"
                }),
                redirect: "manual"
            });

            expect(response.status).toBe(302);
            expect(response.headers.get("location")).toBe("/auth/login");

            const result = await new Promise((resolve, reject) => {
                db.get(
                    "SELECT COUNT(*) AS count FROM users WHERE username = ?",
                    [username],
                    (error, row) => (error ? reject(error) : resolve(row))
                );
            });
            expect(result.count).toBe(1);
        } finally {
            await new Promise((resolve, reject) => {
                db.run("DELETE FROM users WHERE username = ?", [username], (error) =>
                    error ? reject(error) : resolve()
                );
            });
            await new Promise((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve()))
            );
        }
    });
});

describe("GET /", () => {
    it('Should check for valid sessionId', async () => {
        const server = app.listen(0);
        await new Promise((resolve) => server.once("listening", resolve));

        try{
            const { port } = server.address();
            const response = await fetch(`http://localhost:${port}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: new URLSearchParams({
                        username: "testuser",
                        password: "password"
                    }),
                    redirect: "manual"
                });
            const cookie = response.headers.get('set-cookie');
            expect(cookie).toContain('sessionId=');
            const sessionId = cookie.match(/sessionId=([^;]+)/)[1];
            const homeResponse = await fetch(`http://localhost:${port}/`, {
                headers: { Cookie: `sessionId=${sessionId}` },
                redirect: "manual"
            });
            expect(homeResponse.status).toBe(200)
            const html = await homeResponse.text();
            expect(html).toContain('href="/auth/logout"')
        } finally {
            await new Promise((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve()))
            );
        }    
    })
});

describe("GET /new-post", () => {
    it('Should redirect guests from protected pages', async () => {
        const server = app.listen(0);
        await new Promise((resolve) => server.once("listening", resolve));

        try{
            const { port } = server.address();
            const response = await fetch(`http://localhost:${port}/new-post`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                redirect: "manual"
            });
            expect(response.status).toBe(302);
            expect(response.headers.get('location')).toBe("/auth/login")
        } finally {
            await new Promise((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve()))
            );
        }
    })
});

describe("POST /new-post", () => {
    it("Should save a post and its content", async () => {
        const username = `post-test-${Date.now()}`;
        const sessionId = `post-session-${Date.now()}`;
        const title = `Test post ${Date.now()}`;
        const content = "This post should be saved.";
        let server;

        try {
            await new Promise((resolve, reject) => {
                db.run(
                    "INSERT INTO users (username, password, sessionId) VALUES (?, ?, ?)",
                    [username, "test-password", sessionId],
                    (error) => (error ? reject(error) : resolve())
                );
            });

            server = app.listen(0);
            await new Promise((resolve) => server.once("listening", resolve));
            const { port } = server.address();
            const response = await fetch(`http://localhost:${port}/new-post`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Cookie: `sessionId=${sessionId}`
                },
                body: new URLSearchParams({ title, content }),
                redirect: "manual"
            });

            expect(response.status).toBe(302);
            expect(response.headers.get("location")).toBe("/");

            const savedPost = await new Promise((resolve, reject) => {
                db.get(
                    "SELECT title, content FROM posts WHERE title = ?",
                    [title],
                    (error, row) => (error ? reject(error) : resolve(row))
                );
            });
            expect(savedPost).toEqual({ title, content });

            const homeResponse = await fetch(`http://localhost:${port}/`, {
                headers: { Cookie: `sessionId=${sessionId}` }
            });
            expect(homeResponse.status).toBe(200);
            const homeHtml = await homeResponse.text();
            expect(homeHtml).toContain(title);
            expect(homeHtml).toContain(content);
        } finally {
            await new Promise((resolve, reject) => {
                db.run("DELETE FROM posts WHERE title = ?", [title], (error) =>
                    error ? reject(error) : resolve()
                );
            });
            await new Promise((resolve, reject) => {
                db.run("DELETE FROM users WHERE username = ?", [username], (error) =>
                    error ? reject(error) : resolve()
                );
            });
            if (server) {
                await new Promise((resolve, reject) =>
                    server.close((error) => (error ? reject(error) : resolve()))
                );
            }
        }
    })
})

describe("GET /admin", () => {
    it('Should deny access for non admin users', async () => {
        const username = `non-admin-${Date.now()}`;
        const sessionId = `session-${Date.now()}`;

        const server = app.listen(0)
        await new Promise((resolve) => server.once("listening", resolve));

        try{
            await new Promise((resolve, reject) => {
                db.run(
                    "INSERT INTO users (username, password, sessionId) VALUES (?, ?, ?)",
                    [username, "test-password", sessionId],
                    (error) => (error ? reject(error) : resolve())
                );
            });

            const { port } = server.address();
            const  response = await fetch(`http://localhost:${port}/admin`, {
                headers: {
                    Cookie: `sessionId=${sessionId}`
                }
            });

            expect(response.status).toBe(403)
        } finally {
            await new Promise ((resolve, reject) =>
                db.run("DELETE FROM users WHERE username = ?", [username], (error) =>
                    error ? reject(error) : resolve()
            ));

            await new Promise((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve())))
        }
    });
});