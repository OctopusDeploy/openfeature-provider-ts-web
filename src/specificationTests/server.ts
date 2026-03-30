import * as http from "http";
import * as crypto from "crypto";

export class Server {
    private server!: http.Server;
    private responses = new Map<string, string>();
    url = "";

    start(): Promise<void> {
        return new Promise((resolve) => {
            this.server = http.createServer((req, res) => {
                if (req.method === "GET" && req.url === "/api/featuretoggles/v3/") {
                    const authHeader = req.headers["authorization"];
                    if (authHeader && authHeader.startsWith("Bearer ")) {
                        const token = authHeader.slice("Bearer ".length);
                        const responseBody = this.responses.get(token);
                        if (responseBody) {
                            const contentHash = Buffer.from([0x01]).toString("base64");
                            res.writeHead(200, {
                                "Content-Type": "application/json",
                                ContentHash: contentHash,
                            });
                            res.end(responseBody);
                            return;
                        }
                    }
                    res.writeHead(401);
                    res.end();
                    return;
                }
                res.writeHead(404);
                res.end();
            });

            this.server.listen(0, "127.0.0.1", () => {
                const address = this.server.address() as { port: number };
                this.url = `http://127.0.0.1:${address.port}`;
                resolve();
            });
        });
    }

    configure(responseJson: string): string {
        const token = crypto.randomUUID();
        this.responses.set(token, responseJson);
        return token;
    }

    stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}
