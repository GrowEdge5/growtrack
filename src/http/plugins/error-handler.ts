import type { FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";

import { GrowtrackError } from "../../shared/domain/errors.js";
import { sendProblem } from "../response/problem-details.js";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      sendProblem(reply, {
        type: "https://growtrack.dev/problems/validation-error",
        title: "Request validation failed",
        status: 400,
        detail: "The request does not match the expected schema",
        code: "VALIDATION_ERROR"
      });
      return;
    }

    if (error instanceof GrowtrackError) {
      sendProblem(reply, {
        type: `https://growtrack.dev/problems/${error.code.toLowerCase().replaceAll("_", "-")}`,
        title: error.name,
        status: error.statusCode,
        detail: error.message,
        code: error.code
      });
      return;
    }

    request.log.error({ err: error }, "Unhandled request error");
    sendProblem(reply, {
      type: "https://growtrack.dev/problems/internal-error",
      title: "Internal server error",
      status: 500,
      detail: "An unexpected error occurred",
      code: "INTERNAL_ERROR"
    });
  });
}
