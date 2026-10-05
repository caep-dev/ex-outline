import type { ProsemirrorData } from "../types";

export type PublicPagination = {
  offset: number;
  limit: number;
  hasMore: boolean;
};
export type PublicPage<T> = { data: T[]; pagination: PublicPagination };
export type PublicCollection = {
  id: string;
  name: string;
  description: string | null;
  url: string;
};
export type PublicDocument = {
  id: string;
  title: string;
  url: string;
  parentDocumentId: string | null;
  updatedAt: string;
};
export type PublicDocumentInfo = {
  id: string;
  collectionId: string;
  title: string;
  content: ProsemirrorData;
  url: string;
  updatedAt: string;
};
export type PublicDocumentSearchResult = {
  id: string;
  collectionId: string;
  title: string;
  url: string;
  excerpt: string;
};
export type PublicCommentAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
};
export type PublicDocumentComment = {
  id: string;
  data: ProsemirrorData;
  createdBy: PublicCommentAuthor;
  resolvedBy: PublicCommentAuthor | null;
};
export type PublicDocumentCommentsPage = {
  data: PublicDocumentComment[];
  pagination: { offset: number; limit: number; total: number };
};
export type PublicCollectionsListRequest = { offset?: number; limit?: number };
export type PublicDocumentsListRequest = PublicCollectionsListRequest & {
  collectionId: string;
};
export type PublicDocumentInfoRequest = { id: string };
export type PublicDocumentsSearchRequest = PublicCollectionsListRequest & {
  query: string;
  collectionId?: string;
};
export type WebsiteIntegrationMode = {
  websiteIntegrationEnabled: boolean;
  initialized: boolean;
};
export type WebsiteIntegrationSignOut = {
  success: true;
  redirectUrl: "/identity/signed-out";
};
