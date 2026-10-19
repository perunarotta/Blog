import { describe, it, expect } from "vitest";
import app from "../app.js";
import db from "../database.js"

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

//introduced defect
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