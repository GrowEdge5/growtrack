import type { FastifyReply } from "fastify";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
}

export function sendProblem(reply: FastifyReply, problem: ProblemDetails): void {
  void reply.status(problem.status).type("application/problem+json").send(problem);
}
