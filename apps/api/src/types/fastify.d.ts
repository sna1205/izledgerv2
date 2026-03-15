import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    auth: {
      userId: string;
      username: string;
      sessionId: string;
      sessionTokenHash: string;
    } | null;
  }
}
