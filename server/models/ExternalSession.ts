import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";
import Model from "@server/models/base/Model";
import User from "./User";

@Table({ tableName: "external_sessions", modelName: "external_session" })
class ExternalSession extends Model<
  InferAttributes<ExternalSession>,
  Partial<InferCreationAttributes<ExternalSession>>
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @Column(DataType.UUID)
  websiteSessionId: string;

  @Column(DataType.STRING)
  hydraSid: string;

  @Column(DataType.STRING)
  clientId: string;

  @Column(DataType.DATE)
  expiresAt: Date;

  @Column(DataType.DATE)
  revokedAt: Date | null;

  @Column(DataType.TEXT)
  encryptedAccessToken: string | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ExternalSession;
