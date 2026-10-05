import type { Context } from "koa";
import { schema } from "@server/editor";
import { resolvePublicDocument } from "@server/commands/publicAccess";
import env from "@server/env";
import { NotFoundError } from "@server/errors";
import { authenticateExternalSession } from "@server/identity/authenticateExternalSession";
import type { Attachment } from "@server/models";
import { Document } from "@server/models";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { authorize } from "@server/policies";

/**
 * Checks the current public owner and the attachment reference in its published content.
 *
 * @param attachment the stored attachment to inspect.
 * @returns whether anonymous readers may access its bytes now.
 */
export async function isPublicAttachment(
  attachment: Attachment
): Promise<boolean> {
  if (!env.WEBSITE_INTEGRATION_ENABLED || !attachment.documentId) {
    return false;
  }
  const document = await resolvePublicDocument(attachment.documentId);
  if (!document || document.teamId !== attachment.teamId || !document.content) {
    return false;
  }
  try {
    return ProsemirrorHelper.parseAttachmentIds(
      schema.nodeFromJSON(document.content)
    ).includes(attachment.id);
  } catch {
    return false;
  }
}

/**
 * Authorizes an integrated attachment after the current public check has failed.
 *
 * @param ctx the HTTP request carrying an optional verified browser session.
 * @param attachment the attachment whose owner and target are checked.
 * @returns a promise that resolves when the current user may read the bytes.
 * @throws when the attachment is private or the linked session is unavailable.
 */
export async function authorizePrivateIntegratedAttachment(
  ctx: Context,
  attachment: Attachment
): Promise<void> {
  const identity = await authenticateExternalSession(ctx);
  if (!identity || attachment.teamId !== identity.user.teamId) {
    throw NotFoundError();
  }
  if (!attachment.documentId) {
    if (attachment.userId !== identity.user.id) {
      throw NotFoundError();
    }
    return;
  }
  const document = await Document.findByPk(attachment.documentId, {
    userId: identity.user.id,
  });
  if (!document || document.teamId !== attachment.teamId) {
    throw NotFoundError();
  }
  authorize(identity.user, "read", document);
}
